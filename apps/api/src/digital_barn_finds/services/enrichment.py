from __future__ import annotations

import base64
from dataclasses import dataclass, field
import html
import json
import re
import time
from typing import TYPE_CHECKING
import unicodedata
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

from bs4 import BeautifulSoup
import httpx
from sqlalchemy.orm import Session

from digital_barn_finds.config import get_settings
from digital_barn_finds.models import Car, CarSource, Source
from digital_barn_finds.services.ingest import normalize_serial, upsert_scraped_car
from digital_barn_finds.services.import_by_url import ImportByUrlResult
from digital_barn_finds.services.research import build_identifier_variants
from digital_barn_finds.services.scrapers.registry import (
    detect_scraper_key_for_url,
    get_scraper,
    list_searchable_sources,
)

if TYPE_CHECKING:
    from digital_barn_finds.services.scrapers.base import ScrapedCarRecord


BRAVE_RESULT_PATTERN = re.compile(
    r'title:"(?P<title>(?:[^"\\]|\\.)*)",url:"(?P<url>https?://[^"]+)",.*?description:"(?P<description>(?:[^"\\]|\\.)*)"',
    re.DOTALL,
)


@dataclass(slots=True, frozen=True)
class SearchCandidate:
    scraper_key: str
    query: str
    url: str
    title: str
    description: str


@dataclass(slots=True)
class CarEnrichmentResult:
    car_id: str
    serial_number: str
    queries_attempted: int = 0
    candidate_count: int = 0
    imported_count: int = 0
    skipped_known_urls: int = 0
    skipped_serial_mismatch: int = 0
    imported: list[ImportByUrlResult] = field(default_factory=list)
    candidates: list[SearchCandidate] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


@dataclass(slots=True)
class EnrichmentRunResult:
    requested: int
    processed: int
    queries_attempted: int
    candidate_count: int
    imported_count: int
    skipped_known_urls: int
    skipped_serial_mismatch: int
    cars: list[CarEnrichmentResult]
    errors: list[str]


def enrich_cars(
    db: Session,
    *,
    car_id: str | None = None,
    serial_number: str | None = None,
    limit: int = 1,
    max_imports_per_car: int = 5,
) -> EnrichmentRunResult:
    cars = _select_target_cars(db, car_id=car_id, serial_number=serial_number, limit=limit)
    results: list[CarEnrichmentResult] = []
    errors: list[str] = []

    for car in cars:
        try:
            results.append(
                enrich_single_car(
                    db,
                    car,
                    max_imports=max_imports_per_car,
                )
            )
        except Exception as exc:  # pragma: no cover - operational path
            db.rollback()
            errors.append(f"{car.display_serial_number}: {exc}")

    return EnrichmentRunResult(
        requested=limit if car_id is None and serial_number is None else len(cars),
        processed=len(results),
        queries_attempted=sum(result.queries_attempted for result in results),
        candidate_count=sum(result.candidate_count for result in results),
        imported_count=sum(result.imported_count for result in results),
        skipped_known_urls=sum(result.skipped_known_urls for result in results),
        skipped_serial_mismatch=sum(result.skipped_serial_mismatch for result in results),
        cars=results,
        errors=errors,
    )


def enrich_single_car(
    db: Session,
    car: Car,
    *,
    max_imports: int = 5,
    client: httpx.Client | None = None,
) -> CarEnrichmentResult:
    result = CarEnrichmentResult(
        car_id=str(car.id),
        serial_number=car.display_serial_number,
    )
    identifier_variants = build_identifier_variants(car.display_serial_number)
    normalized_identifiers = {
        normalize_serial(value)
        for value in identifier_variants
        if normalize_serial(value)
    }
    if not normalized_identifiers:
        result.errors.append("Car has no canonical VIN/chassis/serial number to enrich from.")
        return result

    known_urls = {
        source_record.source_url
        for source_record in car.sources
        if source_record.source_url
    }
    known_scraper_keys = {
        _resolve_source_scraper_key(source_record)
        for source_record in car.sources
        if _resolve_source_scraper_key(source_record)
    }

    own_client = client is None
    search_client = client or _build_search_client()
    try:
        for scraper_key, query in build_enrichment_queries(
            car,
            source_records=car.sources,
            known_scraper_keys=known_scraper_keys,
        ):
            if result.imported_count >= max_imports:
                break

            if result.queries_attempted > 0:
                time.sleep(get_settings().request_delay_seconds)
            result.queries_attempted += 1
            try:
                candidates = search_supported_source_urls(
                    query,
                    client=search_client,
                    candidate_limit=get_settings().enrichment_candidate_limit_per_query,
                )
            except Exception as exc:  # pragma: no cover - operational path
                result.errors.append(f"{scraper_key} search failed: {exc}")
                continue

            for candidate in candidates:
                if candidate.scraper_key != scraper_key:
                    continue
                if candidate.url in known_urls:
                    result.skipped_known_urls += 1
                    continue

                result.candidates.append(candidate)
                result.candidate_count += 1

                parsed_record = _parse_candidate_record(candidate)
                if parsed_record is None:
                    result.errors.append(f"{candidate.scraper_key} parse failed: {candidate.url}")
                    continue

                parsed_serial = normalize_serial(parsed_record.car.serial_number)
                if parsed_serial not in normalized_identifiers:
                    result.skipped_serial_mismatch += 1
                    continue

                source = db.query(Source).filter(Source.scraper_key == candidate.scraper_key).one_or_none()
                if source is None:
                    result.errors.append(f"No seeded source found for scraper_key={candidate.scraper_key!r}.")
                    continue

                imported_car = upsert_scraped_car(db, source, parsed_record)
                imported_result = ImportByUrlResult(
                    scraper_key=candidate.scraper_key,
                    source_name=source.name,
                    source_url=parsed_record.source_url,
                    car_id=imported_car.id,
                    serial_number=imported_car.display_serial_number,
                    make=imported_car.make,
                    model=imported_car.model,
                    source_count=imported_car.source_count,
                    media_count=len(imported_car.media_items),
                    already_known_url=False,
                )
                result.imported.append(imported_result)
                result.imported_count += 1
                known_urls.add(parsed_record.source_url)
                known_scraper_keys.add(candidate.scraper_key)
                break
    finally:
        if own_client:
            search_client.close()

    return result


def build_enrichment_queries(
    car: Car,
    *,
    source_records: list[CarSource] | None = None,
    known_scraper_keys: set[str] | None = None,
) -> list[tuple[str, str]]:
    identifier_variants = build_identifier_variants(car.display_serial_number)
    if not identifier_variants:
        return []

    descriptors = _build_search_descriptors(car)
    primary_identifier = identifier_variants[0]
    alternate_identifiers = [
        value
        for value in identifier_variants[1:]
        if value.strip().lower() != primary_identifier.strip().lower()
    ]
    source_keys_to_skip = set(known_scraper_keys or set())
    if source_records:
        source_keys_to_skip.update(
            _resolve_source_scraper_key(source_record)
            for source_record in source_records
            if _resolve_source_scraper_key(source_record)
        )

    primary_queries: list[tuple[str, str]] = []
    alternate_queries: list[tuple[str, str]] = []
    for scraper_key, domain in list_searchable_sources():
        if scraper_key in source_keys_to_skip:
            continue
        primary_queries.append((scraper_key, _compose_search_query(primary_identifier, descriptors, domain)))
        for alternate_identifier in alternate_identifiers[:2]:
            alternate_queries.append((scraper_key, _compose_search_query(alternate_identifier, descriptors, domain)))
    return [*primary_queries, *alternate_queries]


def search_supported_source_urls(
    query: str,
    *,
    client: httpx.Client,
    candidate_limit: int,
) -> list[SearchCandidate]:
    try:
        candidates = _search_brave_supported_source_urls(
            query,
            client=client,
            candidate_limit=candidate_limit,
        )
        if candidates:
            return candidates
    except httpx.HTTPStatusError as exc:
        if exc.response is None or exc.response.status_code != 429:
            raise

    return _search_bing_supported_source_urls(
        query,
        client=client,
        candidate_limit=candidate_limit,
    )


def _search_brave_supported_source_urls(
    query: str,
    *,
    client: httpx.Client,
    candidate_limit: int,
) -> list[SearchCandidate]:
    response = client.get(
        f"https://search.brave.com/search?q={quote_plus(query)}&source=web"
    )
    response.raise_for_status()

    candidates: list[SearchCandidate] = []
    seen_urls: set[str] = set()
    for match in BRAVE_RESULT_PATTERN.finditer(response.text):
        url = _decode_brave_string(match.group("url")).strip()
        if not url or url in seen_urls:
            continue
        scraper_key = detect_scraper_key_for_url(url)
        if scraper_key is None:
            continue
        seen_urls.add(url)
        candidates.append(
            SearchCandidate(
                scraper_key=scraper_key,
                query=query,
                url=url,
                title=_decode_brave_string(match.group("title")),
                description=_decode_brave_string(match.group("description")),
            )
        )
        if len(candidates) >= candidate_limit:
            break
    return candidates


def _search_bing_supported_source_urls(
    query: str,
    *,
    client: httpx.Client,
    candidate_limit: int,
) -> list[SearchCandidate]:
    response = client.get(f"https://www.bing.com/search?q={quote_plus(query)}")
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    candidates: list[SearchCandidate] = []
    seen_urls: set[str] = set()

    for node in soup.select("li.b_algo"):
        link = node.select_one("h2 a")
        if link is None:
            continue
        raw_href = html.unescape(str(link.get("href") or "").strip())
        url = _decode_bing_result_url(raw_href)
        if not url or url in seen_urls:
            continue
        scraper_key = detect_scraper_key_for_url(url)
        if scraper_key is None:
            continue
        seen_urls.add(url)
        description_node = node.select_one(".b_caption p")
        candidates.append(
            SearchCandidate(
                scraper_key=scraper_key,
                query=query,
                url=url,
                title=" ".join(link.stripped_strings),
                description=" ".join(description_node.stripped_strings) if description_node else "",
            )
        )
        if len(candidates) >= candidate_limit:
            break

    return candidates


def _select_target_cars(
    db: Session,
    *,
    car_id: str | None,
    serial_number: str | None,
    limit: int,
) -> list[Car]:
    query = db.query(Car)
    if car_id:
        car = query.filter(Car.id == car_id).one_or_none()
        return [car] if car is not None else []
    if serial_number:
        normalized_serial = normalize_serial(serial_number)
        car = query.filter(Car.normalized_serial_number == normalized_serial).one_or_none()
        return [car] if car is not None else []
    return (
        query.order_by(Car.source_count.asc(), Car.updated_at.desc())
        .limit(limit)
        .all()
    )


def _parse_candidate_record(candidate: SearchCandidate) -> ScrapedCarRecord | None:
    try:
        return get_scraper(candidate.scraper_key).parse_detail_page(candidate.url)
    except Exception:  # pragma: no cover - operational path
        return None


def _build_search_client() -> httpx.Client:
    settings = get_settings()
    return httpx.Client(
        follow_redirects=True,
        timeout=settings.search_request_timeout_seconds,
        headers={"User-Agent": settings.effective_user_agent},
    )


def _compose_search_query(identifier: str, descriptors: list[str], domain: str) -> str:
    descriptor_terms = " ".join(f'"{term}"' if " " in term else term for term in descriptors[:3])
    return normalize_query_parts(
        f'site:{domain}',
        f'"{identifier}"',
        descriptor_terms,
    )


def normalize_query_parts(*parts: str) -> str:
    return " ".join(part.strip() for part in parts if part and part.strip())


def _build_search_descriptors(car: Car) -> list[str]:
    descriptors: list[str] = []
    if car.year_built:
        descriptors.append(str(car.year_built))
    if car.make:
        descriptors.append(_compress_phrase(car.make, max_words=3))
    if car.model:
        descriptors.append(_compress_phrase(car.model, max_words=5))
    elif car.variant:
        descriptors.append(_compress_phrase(car.variant, max_words=4))
    return [value for value in descriptors if value]


def _compress_phrase(value: str | None, *, max_words: int) -> str:
    normalized = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^A-Za-z0-9]+", " ", normalized).strip()
    tokens = cleaned.split()
    return " ".join(tokens[:max_words])


def _resolve_source_scraper_key(source_record: CarSource) -> str | None:
    if getattr(source_record, "source", None) is not None and source_record.source is not None:
        return source_record.source.scraper_key
    return detect_scraper_key_for_url(source_record.source_url)


def _decode_brave_string(value: str) -> str:
    try:
        return json.loads(f'"{value}"')
    except json.JSONDecodeError:
        return value


def _decode_bing_result_url(raw_href: str) -> str | None:
    parsed = urlparse(raw_href)
    if not parsed.netloc.endswith("bing.com") or not parsed.path.startswith("/ck/a"):
        return raw_href if raw_href.startswith("http") else None

    candidate = parse_qs(parsed.query).get("u", [None])[0]
    if not candidate:
        return None
    decoded = unquote(candidate)
    if decoded.startswith("http"):
        return decoded
    if not decoded.startswith("a1"):
        return None

    payload = decoded[2:]
    padding = "=" * (-len(payload) % 4)
    try:
        resolved = base64.b64decode(payload + padding).decode("utf-8", errors="ignore")
    except Exception:  # pragma: no cover - malformed Bing payloads should be ignored.
        return None
    return resolved if resolved.startswith("http") else None

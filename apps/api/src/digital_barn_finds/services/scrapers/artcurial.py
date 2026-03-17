from __future__ import annotations

import re
import time
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from digital_barn_finds.config import get_settings
from digital_barn_finds.services.scrapers.base import (
    AdapterManifest,
    BaseScraper,
    FixtureInput,
    FixtureType,
    NormalizedCar,
    NormalizedTimelineEvent,
    ScrapedCarRecord,
)


LOT_PATH_PATTERN = re.compile(r"^/en/sales/(?P<sale_number>\d+)/lots/(?P<lot_slug>[^/?#]+)$", re.IGNORECASE)
SALE_PATH_PATTERN = re.compile(r"^/en/sales/(?P<sale_number>\d+)(?:[/?#].*)?$", re.IGNORECASE)
CHASSIS_PATTERN = re.compile(r"Chassis\s+No\.?\s*(?P<value>[A-Za-z0-9./-]+)", re.IGNORECASE)
ENGINE_PATTERN = re.compile(r"Engine\s+No\.?\s*(?P<value>[A-Za-z0-9./-]+)", re.IGNORECASE)
YEAR_PATTERN = re.compile(r"\b(19|20)\d{2}\b")
MULTI_WORD_MAKES = (
    "Alfa Romeo",
    "Aston Martin",
    "Land Rover",
    "Mercedes-Benz",
    "Rolls-Royce",
)


class ArtcurialScraper(BaseScraper):
    source_key = "artcurial"
    manifest = AdapterManifest(
        source_key="artcurial",
        display_name="Artcurial Motorcars",
        base_url="https://www.artcurial.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="en",
        notes="Auction appearance archive used to track last-known public sightings.",
    )

    def __init__(
        self,
        *,
        base_url: str | None = None,
        seed_paths: list[str] | None = None,
        delay_seconds: float | None = None,
        user_agent: str | None = None,
        max_attempts: int | None = None,
        request_timeout_seconds: float | None = None,
        client: httpx.Client | None = None,
        log_debug: bool = False,
    ) -> None:
        settings = get_settings()
        self.log_debug = log_debug
        self.base_url = (base_url or settings.artcurial_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.artcurial_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.artcurial_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.artcurial_request_timeout_seconds
                if request_timeout_seconds is None
                else request_timeout_seconds
            ),
        )
        self._sale_context_by_number: dict[str, dict[str, str]] = {}

    def _log(self, message: str) -> None:
        if self.log_debug:
            print(message)

    def crawl(self, *, full: bool) -> list[str]:
        detail_links: list[str] = []
        seed_paths = self.seed_paths if full else self.seed_paths[:1]
        for path in seed_paths:
            url = urljoin(f"{self.base_url}/", path.lstrip("/"))
            response = self._request("GET", url)
            response.raise_for_status()

            sale_context = self._extract_sale_context_from_sale_page(response.text, url)
            sale_number = sale_context.get("sale_number")
            if sale_number:
                self._sale_context_by_number[sale_number] = sale_context

            detail_links.extend(self._extract_lot_links(response.text))
            time.sleep(self.delay_seconds)

        return sorted(set(detail_links))

    def parse_discovery_page(self, fixture: FixtureInput) -> list[str]:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type != FixtureType.SEARCH_RESULTS:
            raise ValueError(
                f"Expected fixture_type={FixtureType.SEARCH_RESULTS.value}, got {fixture.fixture_type.value}"
            )
        if fixture.raw_html is None:
            raise ValueError("Artcurial discovery fixture requires raw_html")
        return self._extract_lot_links(fixture.raw_html)

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        response = self._request("GET", url)
        response.raise_for_status()
        sale_number = self._extract_sale_number_from_url(url)
        sale_context = self._sale_context_by_number.get(sale_number or "", {})
        return self.parse_detail_html(response.text, url, sale_context=sale_context)

    def parse_record_fixture(self, fixture: FixtureInput) -> ScrapedCarRecord:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type == FixtureType.SEARCH_RESULTS:
            raise ValueError("SEARCH_RESULTS fixtures must be parsed with parse_discovery_page()")
        if fixture.fixture_type not in self.manifest.supported_detail_fixture_types:
            raise ValueError(f"Unsupported fixture_type for record parsing: {fixture.fixture_type.value}")
        if fixture.raw_html is None:
            raise ValueError("Artcurial detail fixture requires raw_html")
        sale_context = {str(key): str(value) for key, value in fixture.metadata.items() if value}
        return self.parse_detail_html(fixture.raw_html, fixture.source_url, sale_context=sale_context)

    def parse_detail_html(
        self,
        html: str,
        source_url: str,
        *,
        sale_context: dict[str, str] | None = None,
    ) -> ScrapedCarRecord:
        soup = BeautifulSoup(html, "html.parser")
        context = self._extract_sale_context_from_lot_page(soup, source_url)
        if sale_context:
            context.update({key: value for key, value in sale_context.items() if value})

        raw_title = _normalize_space(soup.title.get_text(" ", strip=True) if soup.title else "")
        cleaned_title = self._clean_title(raw_title)
        year_built, make, model = self._split_title(cleaned_title)
        description_text = self._extract_description_text(soup)
        chassis_number = self._extract_first_match(CHASSIS_PATTERN, description_text)
        if not chassis_number:
            chassis_number = self._fallback_serial_number(source_url)

        estimate = self._extract_labeled_value(soup, "Estimate:")
        sold = self._extract_labeled_value(soup, "Sold :")
        engine_number = self._extract_first_match(ENGINE_PATTERN, description_text)
        lot_number = self._extract_lot_number_from_url(source_url)
        event_year = self._extract_event_year(context.get("sale_title"), source_url)
        event_name = context.get("sale_title") or self._fallback_event_name(context.get("sale_number"))
        result = "; ".join(part for part in [f"Sold {sold}" if sold else None, f"Estimate {estimate}" if estimate else None] if part) or None

        event = NormalizedTimelineEvent(
            event_kind="event",
            event_date=None,
            event_date_precision="year" if event_year is not None else "unknown",
            event_year=event_year,
            payload={
                "event_name": event_name,
                "event_type": "auction_result",
                "car_number": lot_number,
                "result": result,
                "location": context.get("sale_location"),
            },
            source_reference=self._build_source_reference(context.get("sale_number"), lot_number),
        )

        attributes = {
            "auction_house": "Artcurial",
            "source_heading": cleaned_title,
        }
        for key, value in {
            "sale_number": context.get("sale_number"),
            "sale_title": context.get("sale_title"),
            "sale_location": context.get("sale_location"),
            "estimate": estimate,
            "sold_price": sold,
            "engine_number": engine_number,
            "lot_number": lot_number,
            "reserve_status": "No reserve" if "no reserve" in raw_title.lower() else None,
        }.items():
            if value:
                attributes[key] = value

        return ScrapedCarRecord(
            source_url=source_url,
            car=NormalizedCar(
                serial_number=chassis_number,
                make=make,
                model=model,
                year_built=year_built,
                notes="Parsed from saved Artcurial lot page.",
                attributes=attributes,
            ),
            custody_events=[],
            car_events=[event],
            media=self._extract_media(soup),
        )

    def _request(self, method: str, url: str) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                return self.client.request(method, url)
            except httpx.HTTPError as exc:
                last_error = exc
                self._log(f"Artcurial request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"Artcurial request failed with no exception for {url}")
        raise last_error

    def _extract_lot_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = anchor.get("href") or ""
            if not LOT_PATH_PATTERN.match(href):
                continue
            urls.append(urljoin(f"{self.base_url}/", href.lstrip("/")))
        return sorted(set(urls))

    def _extract_sale_context_from_sale_page(self, html: str, source_url: str) -> dict[str, str]:
        soup = BeautifulSoup(html, "html.parser")
        sale_title = _normalize_space(soup.title.get_text(" ", strip=True) if soup.title else "")
        sale_number = self._extract_sale_number_from_url(source_url)
        location = None

        for node in soup.find_all(string=lambda s: s and sale_title and sale_title in s):
            parent_text = _normalize_space(node.parent.parent.get_text(" | ", strip=True)) if node.parent and node.parent.parent else ""
            if "N°" not in parent_text:
                continue
            parts = [part.strip() for part in parent_text.split("|") if part.strip()]
            for part in parts:
                if "Paris" in part:
                    location = part
                    break
            if location:
                break

        return {
            "sale_number": sale_number or "",
            "sale_title": sale_title,
            "sale_location": location or "",
        }

    def _extract_sale_context_from_lot_page(self, soup: BeautifulSoup, source_url: str) -> dict[str, str]:
        sale_title = ""
        sale_number = self._extract_sale_number_from_url(source_url) or ""
        node = soup.find(string=lambda s: s and "Sale n°" in s)
        if node and node.parent and node.parent.parent:
            parts = [
                part.strip()
                for part in node.parent.parent.get_text(" | ", strip=True).split("|")
                if part.strip()
            ]
            if len(parts) >= 2:
                sale_title = parts[1]
        if not sale_title:
            sale_title = self._extract_sale_title_from_page_text(soup.get_text(" ", strip=True))
        return {
            "sale_number": sale_number,
            "sale_title": sale_title,
            "sale_location": "",
        }

    def _extract_sale_title_from_page_text(self, text: str) -> str:
        match = re.search(r"Sale n°\d+\s*/\s*(?P<title>[^|]+)", text)
        if match:
            return _normalize_space(match.group("title"))
        return ""

    def _extract_event_year(self, sale_title: str | None, source_url: str) -> int | None:
        text = " ".join(part for part in [sale_title or "", source_url] if part)
        match = YEAR_PATTERN.search(text)
        return int(match.group(0)) if match else None

    def _extract_description_text(self, soup: BeautifulSoup) -> str:
        heading = soup.find("h1", string=lambda s: s and "Complete Description" in s)
        if heading and heading.parent:
            return heading.parent.get_text("\n", strip=True)
        return soup.get_text("\n", strip=True)

    def _extract_labeled_value(self, soup: BeautifulSoup, label: str) -> str | None:
        node = soup.find(string=lambda s: s and label in s)
        if not node or not node.parent or not node.parent.parent:
            return None
        parts = [part.strip() for part in node.parent.parent.get_text(" | ", strip=True).split("|") if part.strip()]
        if len(parts) < 2:
            return None
        return parts[1]

    def _extract_media(self, soup: BeautifulSoup) -> list[dict[str, str | None]]:
        media: list[dict[str, str | None]] = []
        seen: set[str] = set()
        for image in soup.find_all("img", src=True):
            source = image.get("src") or ""
            if "item-images/" not in source:
                continue
            cleaned = source.split("?", 1)[0].strip()
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            media.append({"url": cleaned, "media_type": "image/jpeg", "caption": None})
        return media

    def _clean_title(self, value: str) -> str:
        cleaned = re.sub(r"\bNo reserve\b", "", value, flags=re.IGNORECASE)
        return _normalize_space(cleaned)

    def _split_title(self, title: str) -> tuple[int | None, str, str]:
        year_built = None
        remaining = title
        match = re.match(r"^(?P<year>\d{4})\s+(?P<rest>.+)$", title)
        if match:
            year_built = int(match.group("year"))
            remaining = match.group("rest")

        for candidate in MULTI_WORD_MAKES:
            if remaining.lower().startswith(candidate.lower() + " "):
                return year_built, candidate, remaining[len(candidate) + 1 :].strip()

        if " " in remaining:
            make, model = remaining.split(" ", 1)
            return year_built, make.strip(), model.strip()
        return year_built, remaining.strip() or "Unknown make", "Unknown model"

    def _fallback_event_name(self, sale_number: str | None) -> str:
        if sale_number:
            return f"Artcurial sale {sale_number}"
        return "Artcurial auction appearance"

    def _build_source_reference(self, sale_number: str | None, lot_number: str | None) -> str | None:
        if sale_number and lot_number:
            return f"Sale {sale_number} / Lot {lot_number}"
        if sale_number:
            return f"Sale {sale_number}"
        if lot_number:
            return f"Lot {lot_number}"
        return None

    def _extract_sale_number_from_url(self, value: str) -> str | None:
        path = urlparse(value).path
        match = SALE_PATH_PATTERN.match(path)
        return match.group("sale_number") if match else None

    def _extract_lot_number_from_url(self, value: str) -> str | None:
        path = urlparse(value).path
        match = LOT_PATH_PATTERN.match(path)
        if not match:
            return None
        lot_slug = match.group("lot_slug")
        number_match = re.match(r"(?P<number>\d+)", lot_slug)
        return number_match.group("number") if number_match else lot_slug

    def _fallback_serial_number(self, source_url: str) -> str:
        sale_number = self._extract_sale_number_from_url(source_url) or "unknown-sale"
        lot_number = self._extract_lot_number_from_url(source_url) or "unknown-lot"
        return f"sale-{sale_number}-lot-{lot_number}"

    def _extract_first_match(self, pattern: re.Pattern[str], text: str) -> str | None:
        match = pattern.search(text)
        if not match:
            return None
        return match.group("value").strip()


def _normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()

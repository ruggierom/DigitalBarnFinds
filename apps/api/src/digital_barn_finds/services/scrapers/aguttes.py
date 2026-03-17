from __future__ import annotations

from datetime import date
import re
import time
import unicodedata
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from digital_barn_finds.config import get_settings
from digital_barn_finds.services.scrapers.auction_helpers import (
    build_attribute_map,
    extract_drive_side,
    infer_body_style,
)
from digital_barn_finds.services.scrapers.base import (
    AdapterManifest,
    BaseScraper,
    FixtureInput,
    FixtureType,
    NormalizedCar,
    NormalizedTimelineEvent,
    ScrapedCarRecord,
)


LOT_PATH_PATTERN = re.compile(
    r"^/(?:[A-Za-z]{2}/)?lot/(?P<sale_id>\d+)/(?P<lot_id>\d+)(?:-[^/?#]+)?/?$",
    re.IGNORECASE,
)
CATALOG_PATH_PATTERN = re.compile(
    r"^/(?:[A-Za-z]{2}/)?catalog(?:ue)?/(?P<sale_id>\d+)(?:-[^/?#]+)?/?$",
    re.IGNORECASE,
)
CHASSIS_PATTERN = re.compile(
    r"Ch[âa]ssis\s*(?:n[°ºo.]?\s*)?(?P<value>[A-Za-z0-9./-]+)",
    re.IGNORECASE,
)
ENGINE_PATTERN = re.compile(
    r"Moteur\s*(?:n[°ºo.]?\s*)?(?P<value>[A-Za-z0-9./-]+)",
    re.IGNORECASE,
)
LOT_NUMBER_PATTERN = re.compile(r"\bLot\s+(?P<number>\d+)\b", re.IGNORECASE)
LOT_SUFFIX_PATTERN = re.compile(r"\s*-\s*Lot\s+\d+\s*$", re.IGNORECASE)
SALE_MODAL_PREFIX_PATTERN = re.compile(r"^Informations sur la vente\s*-\s*", re.IGNORECASE)
MULTI_WORD_MAKES = (
    "Alfa Romeo",
    "Aston Martin",
    "De Tomaso",
    "Facel Vega",
    "Land Rover",
    "Mercedes-Benz",
    "Rolls-Royce",
)
MONTH_MAP = {
    "january": 1,
    "janvier": 1,
    "february": 2,
    "fevrier": 2,
    "march": 3,
    "mars": 3,
    "april": 4,
    "avril": 4,
    "may": 5,
    "mai": 5,
    "june": 6,
    "juin": 6,
    "july": 7,
    "juillet": 7,
    "august": 8,
    "aout": 8,
    "september": 9,
    "septembre": 9,
    "october": 10,
    "octobre": 10,
    "november": 11,
    "novembre": 11,
    "december": 12,
    "decembre": 12,
}


class AguttesScraper(BaseScraper):
    source_key = "aguttes"
    manifest = AdapterManifest(
        source_key="aguttes",
        display_name="Aguttes Automobiles",
        base_url="https://www.aguttes.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="fr",
        notes="Auction appearance archive used to track dated public sale results.",
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
        self.base_url = (base_url or settings.aguttes_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.aguttes_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.aguttes_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.aguttes_request_timeout_seconds
                if request_timeout_seconds is None
                else request_timeout_seconds
            ),
        )
        self._sale_context_by_id: dict[str, dict[str, str]] = {}

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

            sale_context = self._extract_sale_context_from_catalog_page(response.text, url)
            sale_id = sale_context.get("sale_id")
            if sale_id:
                self._sale_context_by_id[sale_id] = sale_context

            detail_links.extend(self._extract_lot_links(response.text))
            time.sleep(self.delay_seconds)

        return _dedupe_preserving_order(detail_links)

    def parse_discovery_page(self, fixture: FixtureInput) -> list[str]:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type != FixtureType.SEARCH_RESULTS:
            raise ValueError(
                f"Expected fixture_type={FixtureType.SEARCH_RESULTS.value}, got {fixture.fixture_type.value}"
            )
        if fixture.raw_html is None:
            raise ValueError("Aguttes discovery fixture requires raw_html")
        return self._extract_lot_links(fixture.raw_html)

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        response = self._request("GET", url)
        response.raise_for_status()
        sale_id = self._extract_sale_id_from_url(url)
        sale_context = self._sale_context_by_id.get(sale_id or "", {})
        return self.parse_detail_html(response.text, url, sale_context=sale_context)

    def parse_record_fixture(self, fixture: FixtureInput) -> ScrapedCarRecord:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type == FixtureType.SEARCH_RESULTS:
            raise ValueError("SEARCH_RESULTS fixtures must be parsed with parse_discovery_page()")
        if fixture.fixture_type not in self.manifest.supported_detail_fixture_types:
            raise ValueError(f"Unsupported fixture_type for record parsing: {fixture.fixture_type.value}")
        if fixture.raw_html is None:
            raise ValueError("Aguttes detail fixture requires raw_html")
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

        raw_title = self._extract_lot_title(soup)
        cleaned_title = self._clean_title(raw_title)
        year_built, make, model = self._split_title(cleaned_title)
        description_text = self._extract_description_text(soup)
        chassis_number = self._extract_first_match(CHASSIS_PATTERN, description_text)
        if not chassis_number:
            chassis_number = self._fallback_serial_number(source_url)

        estimate = self._extract_estimate(soup)
        sold = self._extract_result_value(soup)
        result_basis = self._extract_result_basis(soup)
        engine_number = self._extract_first_match(ENGINE_PATTERN, description_text)
        registration = self._extract_registration(description_text)
        lot_number = self._extract_lot_number(raw_title, soup)
        drive_side = extract_drive_side(description_text)
        body_style = infer_body_style(cleaned_title, model, description_text, source_url)
        event_date, event_date_precision, event_year = self._extract_event_date(context.get("sale_date"))
        event_name = context.get("sale_title") or self._fallback_event_name(context.get("sale_id"))

        result_parts: list[str] = []
        if sold:
            sold_label = f"Sold {sold}"
            if result_basis:
                sold_label = f"{sold_label} ({result_basis})"
            result_parts.append(sold_label)
        if estimate:
            result_parts.append(f"Estimate {estimate}")
        result = "; ".join(result_parts) or None

        event = NormalizedTimelineEvent(
            event_kind="event",
            event_date=event_date,
            event_date_precision=event_date_precision,
            event_year=event_year,
            payload={
                "event_name": event_name,
                "event_type": "auction_result",
                "car_number": lot_number,
                "result": result,
                "location": context.get("sale_location"),
            },
            source_reference=self._build_source_reference(context.get("sale_id"), lot_number),
        )

        attributes = build_attribute_map(
            {"auction_house": "Aguttes", "source_heading": cleaned_title},
            sale_id=context.get("sale_id"),
            sale_title=context.get("sale_title"),
            sale_date=context.get("sale_date"),
            sale_location=context.get("sale_location"),
            estimate=estimate,
            sold_price=sold,
            result_basis=result_basis,
            engine_number=engine_number,
            lot_number=lot_number,
            registration=registration,
        )

        return ScrapedCarRecord(
            source_url=source_url,
            car=NormalizedCar(
                serial_number=chassis_number,
                make=make,
                model=model,
                year_built=year_built,
                body_style=body_style,
                drive_side=drive_side,
                notes="Parsed from Aguttes auction lot page.",
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
                self._log(f"Aguttes request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"Aguttes request failed with no exception for {url}")
        raise last_error

    def _extract_lot_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = (anchor.get("href") or "").strip()
            if not LOT_PATH_PATTERN.match(href):
                continue
            urls.append(urljoin(f"{self.base_url}/", href.lstrip("/")))
        return _dedupe_preserving_order(urls)

    def _extract_sale_context_from_catalog_page(self, html: str, source_url: str) -> dict[str, str]:
        soup = BeautifulSoup(html, "html.parser")
        sale_id = self._extract_sale_id_from_url(source_url) or ""
        title_node = soup.select_one("h1.nom_vente")
        date_node = soup.select_one("div.date_vente")
        location_node = soup.select_one("div.lieu_vente")
        sale_title = _normalize_space(title_node.get_text(" ", strip=True) if title_node else "")
        sale_date = _normalize_space(date_node.get_text(" ", strip=True) if date_node else "")
        sale_location = _normalize_space(location_node.get_text(" ", strip=True) if location_node else "")
        return {
            "sale_id": sale_id,
            "sale_title": sale_title,
            "sale_date": sale_date,
            "sale_location": sale_location,
        }

    def _extract_sale_context_from_lot_page(self, soup: BeautifulSoup, source_url: str) -> dict[str, str]:
        sale_id = self._extract_sale_id_from_url(source_url) or ""
        sale_title = ""
        sale_location = ""

        title_node = soup.select_one("#description-modal h4.modal-title")
        if title_node:
            sale_title = SALE_MODAL_PREFIX_PATTERN.sub("", _normalize_space(title_node.get_text(" ", strip=True)))

        if not sale_title:
            strong_text = [
                _normalize_space(node.get_text(" ", strip=True))
                for node in soup.select("#description-modal .te strong")
                if _normalize_space(node.get_text(" ", strip=True))
            ]
            if strong_text:
                sale_title = _normalize_space(" ".join(strong_text[:2]))

        for paragraph in soup.select("#description-modal .te p"):
            text = _normalize_space(paragraph.get_text(" ", strip=True))
            if not text:
                continue
            if text == sale_title:
                continue
            if paragraph.find("strong") or paragraph.find("u"):
                continue
            if re.match(
                r"^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b",
                _normalize_token(text),
                re.IGNORECASE,
            ):
                continue
            sale_location = text
            break

        return {
            "sale_id": sale_id,
            "sale_title": sale_title,
            "sale_date": "",
            "sale_location": sale_location,
        }

    def _extract_lot_title(self, soup: BeautifulSoup) -> str:
        title_node = soup.select_one("div.fiche_titre_lot")
        if title_node:
            return _normalize_space(title_node.get_text(" ", strip=True))
        if soup.title:
            return _normalize_space(soup.title.get_text(" ", strip=True))
        return ""

    def _extract_description_text(self, soup: BeautifulSoup) -> str:
        description_node = soup.select_one("div.fiche_lot_description")
        if description_node:
            return description_node.get_text("\n", strip=True).replace("\xa0", " ")
        return soup.get_text("\n", strip=True).replace("\xa0", " ")

    def _extract_estimate(self, soup: BeautifulSoup) -> str | None:
        value_node = soup.select_one("div.estimAff4")
        if not value_node:
            return None
        return self._normalize_money_text(value_node.get_text(" ", strip=True))

    def _extract_result_value(self, soup: BeautifulSoup) -> str | None:
        result_node = soup.select_one("div.fiche_lot_resultat")
        if result_node:
            text = _normalize_space(result_node.get_text(" ", strip=True))
            text = re.sub(r"^Résultat\s*:?\s*", "", text, flags=re.IGNORECASE)
            if text:
                return self._normalize_money_text(text)

        flash_node = soup.select_one("div.sale-flash, div.sale-flash2")
        if flash_node:
            text = _normalize_space(flash_node.get_text(" ", strip=True))
            text = re.sub(r"^Résultat\s*:?\s*", "", text, flags=re.IGNORECASE)
            if text:
                return self._normalize_money_text(text)
        return None

    def _extract_result_basis(self, soup: BeautifulSoup) -> str | None:
        basis_node = soup.select_one("div.explicationResultats")
        return _normalize_space(basis_node.get_text(" ", strip=True)) if basis_node else None

    def _extract_registration(self, description_text: str) -> str | None:
        for line in description_text.splitlines():
            cleaned = _normalize_space(line)
            if cleaned.lower().startswith("carte grise"):
                return cleaned
        return None

    def _extract_lot_number(self, raw_title: str, soup: BeautifulSoup) -> str | None:
        match = LOT_NUMBER_PATTERN.search(raw_title)
        if match:
            return match.group("number")
        lot_node = soup.select_one(".num_lot .lotnum")
        if lot_node:
            return _normalize_space(lot_node.get_text(" ", strip=True))
        return None

    def _extract_event_date(self, raw_value: str | None) -> tuple[date | None, str, int | None]:
        if not raw_value:
            return None, "unknown", None

        match = re.search(r"(?P<day>\d{1,2})\s+(?P<month>[A-Za-zÀ-ÿ]+)\s+(?P<year>\d{4})", raw_value)
        if not match:
            year_match = re.search(r"\b(19|20)\d{2}\b", raw_value)
            if year_match:
                return None, "year", int(year_match.group(0))
            return None, "unknown", None

        month_token = _normalize_token(match.group("month"))
        month = MONTH_MAP.get(month_token)
        if month is None:
            return None, "year", int(match.group("year"))

        parsed = date(int(match.group("year")), month, int(match.group("day")))
        return parsed, "day", parsed.year

    def _extract_media(self, soup: BeautifulSoup) -> list[dict[str, str | None]]:
        media: list[dict[str, str | None]] = []
        seen: set[str] = set()
        for image in soup.find_all("img"):
            source = (image.get("src") or image.get("data-src") or "").strip()
            if "cdn.drouot.com/d/image/lot" not in source:
                continue
            cleaned = source
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            media.append({"url": cleaned, "media_type": "image/jpeg", "caption": None})
        return media

    def _extract_first_match(self, pattern: re.Pattern[str], text: str) -> str | None:
        match = pattern.search(text)
        if not match:
            return None
        return _normalize_space(match.group("value"))

    def _clean_title(self, value: str) -> str:
        cleaned = LOT_SUFFIX_PATTERN.sub("", value)
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

    def _fallback_event_name(self, sale_id: str | None) -> str:
        if sale_id:
            return f"Aguttes sale {sale_id}"
        return "Aguttes auction appearance"

    def _build_source_reference(self, sale_id: str | None, lot_number: str | None) -> str | None:
        if sale_id and lot_number:
            return f"Sale {sale_id} / Lot {lot_number}"
        if sale_id:
            return f"Sale {sale_id}"
        if lot_number:
            return f"Lot {lot_number}"
        return None

    def _extract_sale_id_from_url(self, value: str) -> str | None:
        path = urlparse(value).path
        for pattern in (LOT_PATH_PATTERN, CATALOG_PATH_PATTERN):
            match = pattern.match(path)
            if match:
                return match.group("sale_id")
        return None

    def _fallback_serial_number(self, source_url: str) -> str:
        path = urlparse(source_url).path
        match = LOT_PATH_PATTERN.match(path)
        if not match:
            return f"aguttes-{path.strip('/').replace('/', '-') or 'unknown'}"
        return f"aguttes-sale-{match.group('sale_id')}-item-{match.group('lot_id')}"

    def _normalize_money_text(self, value: str) -> str:
        return re.sub(r"(?<=\d)EUR\b", " EUR", _normalize_space(value))


def _dedupe_preserving_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def _normalize_token(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(character for character in normalized if not unicodedata.combining(character)).lower()


def _normalize_space(value: str) -> str:
    return " ".join(value.replace("\xa0", " ").split())

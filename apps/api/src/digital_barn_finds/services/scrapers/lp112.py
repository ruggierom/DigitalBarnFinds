from __future__ import annotations

import re
import time
from datetime import date, datetime
from urllib.parse import parse_qs, unquote_plus, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, UnicodeDammit

from digital_barn_finds.config import get_settings
from digital_barn_finds.services.scrapers.auction_helpers import (
    build_attribute_map,
    collect_image_media,
    dedupe_preserving_order,
    extract_drive_side,
    infer_body_style,
    normalize_space,
    parse_day_month_year,
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


DETAIL_PATH_PATTERN = re.compile(r"^/Lamborghini/Detail\.asp$", re.IGNORECASE)
RESULTS_PATH_PATTERN = re.compile(r"^/Lamborghini/Results\.asp$", re.IGNORECASE)
TITLE_YEAR_PATTERN = re.compile(r"\b(?P<year>\d{4})\b")
INTRO_PATTERN = re.compile(
    r"^Chassis Number (?P<serial>\S+) is this (?P<color>.+?) car"
    r"(?: with (?P<interior>.+?) interior)?"
    r"(?:,\s*currently believed to be residing in (?P<location>.+?))?"
    r"(?:,?\s*\.)?$",
    re.IGNORECASE,
)
ENGINE_PATTERN = re.compile(r"^It is fitted with engine number (?P<value>.+?)\.$", re.IGNORECASE)
PUBLICATIONS_PATTERN = re.compile(
    r"^The vehicle appears in the following publications:\s*(?P<value>.+?)\.$",
    re.IGNORECASE,
)
MODIFICATIONS_PATTERN = re.compile(
    r"^It has the following modifications .*?:\s*(?P<value>.+?)\.$",
    re.IGNORECASE,
)
OTHER_INFORMATION_PATTERN = re.compile(r"^Other Information:\s*(?P<value>.+?)\.?$", re.IGNORECASE)
SOURCE_ATTRIBUTION_PATTERN = re.compile(
    r"^Information on this car was sourced from (?P<value>.+?)\.$",
    re.IGNORECASE,
)
UPDATED_PATTERN = re.compile(
    r"^The data on this specific vehicle was last updated (?P<value>.+?)\.$",
    re.IGNORECASE,
)
OG_DESCRIPTION_PATTERN = re.compile(
    r"^(?:(?P<drive>LHD|RHD)\s+)?(?P<color>.+?)\s+with\s+(?P<interior>.+?)\s+interior$",
    re.IGNORECASE,
)


class LP112Scraper(BaseScraper):
    source_key = "lp112"
    manifest = AdapterManifest(
        source_key="lp112",
        display_name="LP112.com",
        base_url="https://www.lp112.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="en",
        notes="Lamborghini chassis registry with detailed chassis, color, image, and update history data.",
    )

    FULL_RESULTS_PAGE_LIMIT = 12
    PARTIAL_RESULTS_PAGE_LIMIT = 4

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
        self.base_url = (base_url or settings.lp112_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.lp112_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.lp112_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.lp112_request_timeout_seconds
                if request_timeout_seconds is None
                else request_timeout_seconds
            ),
        )

    def _log(self, message: str) -> None:
        if self.log_debug:
            print(message)

    def crawl(self, *, full: bool) -> list[str]:
        result_page_urls: list[str] = []
        for path in self.seed_paths:
            url = urljoin(f"{self.base_url}/", path.lstrip("/"))
            response = self._request("GET", url)
            response.raise_for_status()
            result_page_urls.extend(self._extract_results_page_links(_decode_html(response.content)))
            time.sleep(self.delay_seconds)

        selected_result_pages = self._select_result_pages(
            dedupe_preserving_order(result_page_urls),
            max_pages=self.FULL_RESULTS_PAGE_LIMIT if full else self.PARTIAL_RESULTS_PAGE_LIMIT,
        )

        detail_urls: list[str] = []
        for url in selected_result_pages:
            response = self._request("GET", url)
            response.raise_for_status()
            detail_urls.extend(self._extract_detail_links(_decode_html(response.content)))
            time.sleep(self.delay_seconds)
        return dedupe_preserving_order(detail_urls)

    def parse_discovery_page(self, fixture: FixtureInput) -> list[str]:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type != FixtureType.SEARCH_RESULTS:
            raise ValueError(
                f"Expected fixture_type={FixtureType.SEARCH_RESULTS.value}, got {fixture.fixture_type.value}"
            )
        if fixture.raw_html is None:
            raise ValueError("LP112 discovery fixture requires raw_html")
        return self._extract_detail_links(fixture.raw_html)

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        response = self._request("GET", url)
        response.raise_for_status()
        return self.parse_detail_html(_decode_html(response.content), str(response.url))

    def parse_record_fixture(self, fixture: FixtureInput) -> ScrapedCarRecord:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type == FixtureType.SEARCH_RESULTS:
            raise ValueError("SEARCH_RESULTS fixtures must be parsed with parse_discovery_page()")
        if fixture.fixture_type not in self.manifest.supported_detail_fixture_types:
            raise ValueError(f"Unsupported fixture_type for record parsing: {fixture.fixture_type.value}")
        if fixture.raw_html is None:
            raise ValueError("LP112 detail fixture requires raw_html")
        return self.parse_detail_html(fixture.raw_html, fixture.source_url)

    def parse_detail_html(self, html: str, source_url: str) -> ScrapedCarRecord:
        soup = BeautifulSoup(html, "html.parser")
        title = self._extract_title(soup)
        heading = self._extract_heading(soup)
        paragraph_texts = self._extract_paragraph_texts(soup)
        query_values = parse_qs(urlparse(source_url).query)
        model = _query_value(query_values, "Model") or "Unknown model"
        variant = _query_value(query_values, "Version")
        source_serial = _query_value(query_values, "ChassisNumber")

        intro_data = self._extract_intro_data(paragraph_texts)
        og_description = self._extract_og_description(soup)
        og_data = self._extract_og_description_data(og_description)
        year_built = self._extract_year(title, heading)
        drive_side = extract_drive_side(" ".join(part for part in (heading, title, og_description) if part)) or og_data.get(
            "drive_side"
        )
        serial_number = _choose_vehicle_id(source_serial, intro_data.get("short_serial"))
        original_color = intro_data.get("original_color") or og_data.get("original_color")
        interior_color = intro_data.get("interior_color") or og_data.get("interior_color")
        engine_number = self._extract_simple_value(paragraph_texts, ENGINE_PATTERN)
        publications = self._extract_simple_value(paragraph_texts, PUBLICATIONS_PATTERN)
        modifications = self._extract_simple_value(paragraph_texts, MODIFICATIONS_PATTERN)
        source_attribution = self._extract_simple_value(paragraph_texts, SOURCE_ATTRIBUTION_PATTERN)
        other_information = self._extract_simple_value(paragraph_texts, OTHER_INFORMATION_PATTERN)
        last_updated_label = self._extract_simple_value(paragraph_texts, UPDATED_PATTERN)
        location = intro_data.get("location")

        body_style = infer_body_style(model, variant, heading, title, other_information)
        notes = other_information or "Parsed from LP112 Lamborghini registry detail page."
        attributes = build_attribute_map(
            {
                "registry": "LP112.com",
                "source_heading": title,
                "variant": variant,
                "interior_color": interior_color,
                "engine_number": engine_number,
                "publications": publications,
                "modifications": modifications,
                "source_attribution": source_attribution,
                "location_text": location,
                "record_last_updated": last_updated_label,
            }
        )

        car_events: list[NormalizedTimelineEvent] = []
        if last_updated_label:
            event_date, event_precision, event_year = _parse_lp112_date(last_updated_label)
            car_events.append(
                NormalizedTimelineEvent(
                    event_kind="event",
                    event_date=event_date,
                    event_date_precision=event_precision,
                    event_year=event_year,
                    payload={
                        "event_name": "LP112 registry update",
                        "event_type": "registry_update",
                        "location": location,
                    },
                    source_reference=last_updated_label,
                )
            )

        return ScrapedCarRecord(
            source_url=source_url,
            car=NormalizedCar(
                serial_number=serial_number,
                make="Lamborghini",
                model=model,
                variant=variant,
                year_built=year_built,
                body_style=body_style,
                drive_side=drive_side,
                original_color=original_color,
                notes=notes,
                attributes=attributes,
            ),
            custody_events=[],
            car_events=car_events,
            media=self._extract_media(soup),
        )

    def _request(self, method: str, url: str) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                return self.client.request(method, url)
            except httpx.HTTPError as exc:
                last_error = exc
                self._log(f"LP112 request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"LP112 request failed with no exception for {url}")
        raise last_error

    def _extract_results_page_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = (anchor.get("href") or "").strip()
            absolute = urljoin(f"{self.base_url}/", href.lstrip("/"))
            parsed = urlparse(absolute)
            if not RESULTS_PATH_PATTERN.match(parsed.path):
                continue
            if not _query_value(parse_qs(parsed.query), "Model"):
                continue
            urls.append(absolute)
        return dedupe_preserving_order(urls)

    def _extract_detail_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = (anchor.get("href") or "").strip()
            absolute = urljoin(f"{self.base_url}/", href.lstrip("/"))
            if DETAIL_PATH_PATTERN.match(urlparse(absolute).path):
                urls.append(absolute)
        return dedupe_preserving_order(urls)

    def _select_result_pages(self, urls: list[str], *, max_pages: int) -> list[str]:
        if len(urls) <= max_pages:
            return urls
        if max_pages <= 1:
            return urls[:1]
        indexes = {
            round(index * (len(urls) - 1) / (max_pages - 1))
            for index in range(max_pages)
        }
        return [urls[index] for index in sorted(indexes)]

    def _extract_title(self, soup: BeautifulSoup) -> str:
        if soup.title and soup.title.get_text(" ", strip=True):
            return normalize_space(soup.title.get_text(" ", strip=True))
        return ""

    def _extract_heading(self, soup: BeautifulSoup) -> str:
        heading = soup.find("font", attrs={"size": "+3"})
        if heading:
            return normalize_space(heading.get_text(" ", strip=True))
        return ""

    def _extract_paragraph_texts(self, soup: BeautifulSoup) -> list[str]:
        paragraphs: list[str] = []
        for paragraph in soup.find_all("p"):
            text = normalize_space(paragraph.get_text(" ", strip=True))
            if text:
                paragraphs.append(text)
        return paragraphs

    def _extract_intro_data(self, paragraphs: list[str]) -> dict[str, str]:
        for text in paragraphs:
            match = INTRO_PATTERN.match(text)
            if not match:
                continue
            return {
                "short_serial": normalize_space(match.group("serial")),
                "original_color": normalize_space(match.group("color")),
                "interior_color": normalize_space((match.group("interior") or "").rstrip(",")),
                "location": normalize_space((match.group("location") or "").rstrip(",")),
            }
        return {}

    def _extract_simple_value(self, paragraphs: list[str], pattern: re.Pattern[str]) -> str | None:
        for text in paragraphs:
            match = pattern.match(text)
            if match:
                return normalize_space(match.group("value"))
        return None

    def _extract_og_description(self, soup: BeautifulSoup) -> str:
        node = soup.find("meta", attrs={"property": "og:description"})
        if node and node.get("content"):
            return normalize_space(str(node.get("content")))
        return ""

    def _extract_og_description_data(self, text: str) -> dict[str, str]:
        match = OG_DESCRIPTION_PATTERN.match(text)
        if not match:
            return {}
        data: dict[str, str] = {}
        drive_side = normalize_space(match.group("drive") or "")
        color = normalize_space(match.group("color"))
        interior = normalize_space(match.group("interior"))
        if drive_side:
            data["drive_side"] = drive_side
        if color:
            data["original_color"] = color
        if interior:
            data["interior_color"] = interior
        return data

    def _extract_year(self, title: str, heading: str) -> int | None:
        for text in (title, heading):
            match = TITLE_YEAR_PATTERN.search(text)
            if match:
                return int(match.group("year"))
        return None

    def _extract_media(self, soup: BeautifulSoup) -> list[dict[str, str | None]]:
        return collect_image_media(
            soup,
            base_url=self.base_url,
            allow_substrings=("images/cars/",),
            deny_substrings=("NoPic.jpg", "share_save_", "addtoany.com", "googlesyndication"),
        )


def _decode_html(raw: bytes | str) -> str:
    if isinstance(raw, str):
        return raw
    dammit = UnicodeDammit(raw, is_html=True)
    if dammit.unicode_markup:
        return dammit.unicode_markup
    return raw.decode("utf-8", errors="replace")


def _query_value(values: dict[str, list[str]], key: str) -> str | None:
    raw_value = next(iter(values.get(key) or []), "").strip()
    if not raw_value:
        return None
    return normalize_space(unquote_plus(raw_value))


def _choose_vehicle_id(primary: str | None, secondary: str | None) -> str:
    primary_value = normalize_space(primary or "")
    secondary_value = normalize_space(secondary or "")
    primary_normalized = "".join(character for character in primary_value if character.isalnum())
    secondary_normalized = "".join(character for character in secondary_value if character.isalnum())

    if len(primary_normalized) >= len(secondary_normalized) and len(primary_normalized) >= 4:
        return primary_value
    if len(secondary_normalized) >= 4:
        return secondary_value
    return primary_value or secondary_value or "Unknown vehicle ID"


def _parse_lp112_date(raw_value: str) -> tuple[date | None, str, int | None]:
    cleaned = normalize_space(raw_value)
    for fmt in ("%d-%b-%Y", "%d-%B-%Y"):
        try:
            parsed = datetime.strptime(cleaned, fmt).date()
            return parsed, "day", parsed.year
        except ValueError:
            continue
    return parse_day_month_year(cleaned)

from __future__ import annotations

import re
import time
from urllib.parse import urljoin, urlparse

import cloudscraper
from bs4 import BeautifulSoup

from digital_barn_finds.config import get_settings
from digital_barn_finds.services.scrapers.auction_helpers import (
    build_attribute_map,
    choose_serial,
    dedupe_preserving_order,
    extract_drive_side,
    normalize_space,
    parse_day_month_year,
    split_title,
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


DETAIL_PATH_PATTERN = re.compile(r"^/veh/(?P<slug>[^/?#]+)/?$", re.IGNORECASE)
PRICE_PATTERN = re.compile(r"\$[\d,]+(?:\.\d+)?")
STATUS_PATTERN = re.compile(r"\b(For Sale|Sold|Not Sold|Off Market|Last Asking)\b", re.IGNORECASE)
VIN_PATTERN = re.compile(r"\bVIN:\s*(?P<value>[A-Za-z0-9./-]+)", re.IGNORECASE)
VEHICLE_ID_PATTERN = re.compile(r"\bvehicle_id:\s*(?P<value>\d+)\b", re.IGNORECASE)
DATE_PATTERN = re.compile(r"\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\b")
MILEAGE_PATTERN = re.compile(r"\b(?P<value>[\d,]+(?:\.\d+)?)\s*(?:mi|km)\b", re.IGNORECASE)
LOCATION_PATTERN = re.compile(
    r"^(?P<value>.+?)\s+\d[\d,]*(?:\.\d+)?\s*(?:mi|km)\b",
    re.IGNORECASE,
)
SPEC_LABELS = {
    "Year",
    "Make",
    "Model Family",
    "Model Generation",
    "Model Variant",
    "Model Trim",
    "Engine",
    "Transmission",
    "Drive Type",
    "Originality",
    "Mileage",
    "VIN",
    "Vehicle Type",
    "Body Style",
    "Doors",
    "Driver Side",
    "Ext. Color Group",
    "Int. Color Group",
}
IGNORED_SELLER_TOKENS = {"by", "verified", "contact seller"}


class ClassicComScraper(BaseScraper):
    source_key = "classic"
    manifest = AdapterManifest(
        source_key="classic",
        display_name="Classic.com",
        base_url="https://www.classic.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="en",
        notes="Classic.com search and vehicle detail pages with VIN/spec extraction and listing-state events.",
    )

    def __init__(
        self,
        *,
        base_url: str | None = None,
        seed_paths: list[str] | None = None,
        delay_seconds: float | None = None,
        max_attempts: int | None = None,
        request_timeout_seconds: float | None = None,
        client: cloudscraper.CloudScraper | None = None,
        log_debug: bool = False,
    ) -> None:
        settings = get_settings()
        self.log_debug = log_debug
        self.base_url = (base_url or settings.classic_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.classic_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.classic_max_attempts if max_attempts is None else max_attempts
        self.request_timeout_seconds = (
            settings.classic_request_timeout_seconds
            if request_timeout_seconds is None
            else request_timeout_seconds
        )
        self.client = client or cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "darwin", "desktop": True}
        )
        self._search_referer = f"{self.base_url}/search"
        self._session_warmed = False

    def _log(self, message: str) -> None:
        if self.log_debug:
            print(message)

    def crawl(self, *, full: bool) -> list[str]:
        detail_links: list[str] = []
        last_error: Exception | None = None
        seed_paths = self.seed_paths if full else self.seed_paths[:3]
        for path in seed_paths:
            url = urljoin(f"{self.base_url}/", path.lstrip("/"))
            try:
                response = self._request("GET", url)
                response.raise_for_status()
            except Exception as exc:
                last_error = exc
                self._log(f"Classic discovery request failed for {url}: {exc}")
                continue
            detail_links.extend(self._extract_detail_links(response.text))
            time.sleep(self.delay_seconds)
        discovered = dedupe_preserving_order(detail_links)
        if discovered:
            return discovered
        if last_error is not None:
            raise last_error
        return []

    def parse_discovery_page(self, fixture: FixtureInput) -> list[str]:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type != FixtureType.SEARCH_RESULTS:
            raise ValueError(
                f"Expected fixture_type={FixtureType.SEARCH_RESULTS.value}, got {fixture.fixture_type.value}"
            )
        if fixture.raw_html is None:
            raise ValueError("Classic discovery fixture requires raw_html")
        return self._extract_detail_links(fixture.raw_html)

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        self._ensure_session()
        response = self._request("GET", url, referer=self._search_referer)
        response.raise_for_status()
        return self.parse_detail_html(response.text, str(response.url))

    def parse_record_fixture(self, fixture: FixtureInput) -> ScrapedCarRecord:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type == FixtureType.SEARCH_RESULTS:
            raise ValueError("SEARCH_RESULTS fixtures must be parsed with parse_discovery_page()")
        if fixture.fixture_type not in self.manifest.supported_detail_fixture_types:
            raise ValueError(f"Unsupported fixture_type for record parsing: {fixture.fixture_type.value}")
        if fixture.raw_html is None:
            raise ValueError("Classic detail fixture requires raw_html")
        return self.parse_detail_html(fixture.raw_html, fixture.source_url)

    def parse_detail_html(self, html: str, source_url: str) -> ScrapedCarRecord:
        soup = BeautifulSoup(html, "html.parser")
        title = self._extract_title(soup)
        specs = self._extract_specs_map(soup)
        year_built, title_make, title_model = split_title(title)
        make = specs.get("Make") or title_make
        model = specs.get("Model Family") or title_model
        variant = _join_variant(specs.get("Model Variant"), specs.get("Model Trim"))
        serial_number = choose_serial(
            specs.get("VIN") or self._extract_meta_vin(soup),
            self._extract_vehicle_id(soup) or self._fallback_serial_from_url(source_url),
        )
        body_style = specs.get("Body Style")
        drive_side = extract_drive_side(specs.get("Driver Side") or "")
        original_color = specs.get("Ext. Color Group")
        interior_color = specs.get("Int. Color Group")
        hero = self._extract_hero_block(soup)
        hero_text = hero.get_text("\n", strip=True) if hero is not None else soup.get_text("\n", strip=True)
        status = self._extract_status(hero_text)
        price = self._extract_price(hero_text)
        seller = self._extract_seller(hero)
        listing_date = self._extract_listing_date(hero_text)
        location = self._extract_location(soup)
        mileage = specs.get("Mileage") or _extract_first_group(MILEAGE_PATTERN, hero_text, "value")
        transmission = specs.get("Transmission")
        engine = specs.get("Engine")
        drive_type = specs.get("Drive Type")
        originality = specs.get("Originality")
        vehicle_type = specs.get("Vehicle Type")

        event_date, event_date_precision, event_year = parse_day_month_year(listing_date)
        if event_year is None:
            event_year = year_built

        event = NormalizedTimelineEvent(
            event_kind="event",
            event_date=event_date,
            event_date_precision=event_date_precision,
            event_year=event_year,
            payload={
                "event_name": _event_name_for_status(status),
                "event_type": _event_type_for_status(status),
                "result": _result_summary(status, price),
                "location": location,
                "seller": seller,
            },
            source_reference=normalize_space(" ".join(part for part in (status, price, listing_date) if part)) or None,
        )

        notes = normalize_space(
            " ".join(
                part
                for part in (
                    f"Classic.com {status.lower()} listing." if status else "Parsed from Classic.com vehicle detail page.",
                    f"Seller: {seller}." if seller else "",
                    f"Observed {listing_date}." if listing_date else "",
                )
                if part
            )
        )

        attributes = build_attribute_map(
            {
                "marketplace": "Classic.com",
                "source_heading": title,
                "vehicle_id": self._extract_vehicle_id(soup),
                "seller": seller,
                "listing_status": status,
                "listing_date": listing_date,
                "location_text": location,
                "mileage": mileage,
                "transmission": transmission,
                "engine_spec": engine,
                "drive_type": drive_type,
                "originality": originality,
                "vehicle_type": vehicle_type,
                "interior_color": interior_color,
            }
        )

        return ScrapedCarRecord(
            source_url=source_url,
            car=NormalizedCar(
                serial_number=serial_number,
                make=make,
                model=model,
                variant=variant,
                year_built=year_built,
                body_style=body_style,
                drive_side=drive_side,
                original_color=original_color,
                notes=notes or "Parsed from Classic.com vehicle detail page.",
                attributes=attributes,
            ),
            custody_events=[],
            car_events=[event],
            media=self._extract_media(soup),
        )

    def _ensure_session(self) -> None:
        if self._session_warmed:
            return
        response = self._request("GET", self._search_referer)
        response.raise_for_status()
        self._session_warmed = True
        self._search_referer = str(response.url)

    def _request(self, method: str, url: str, *, referer: str | None = None):
        last_error: Exception | None = None
        response = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                headers = {"Referer": referer} if referer else None
                response = self.client.request(
                    method,
                    url,
                    headers=headers,
                    timeout=self.request_timeout_seconds,
                )
                return response
            except Exception as exc:  # pragma: no cover - operational path
                last_error = exc
                self._log(f"Classic request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is not None:
            raise last_error
        raise RuntimeError(f"Classic request failed with no exception for {url}")

    def _extract_title(self, soup: BeautifulSoup) -> str:
        heading = soup.find("h1")
        if heading is not None:
            value = normalize_space(heading.get_text(" ", strip=True))
            if value:
                return value
        if soup.title is not None:
            value = normalize_space(soup.title.get_text(" ", strip=True))
            if value.endswith(" - CLASSIC.COM"):
                value = value.removesuffix(" - CLASSIC.COM").strip()
            value = re.sub(r"\s+VIN:\s+\S+$", "", value).strip()
            if value:
                return value
        return "Unknown Classic.com vehicle"

    def _extract_specs_map(self, soup: BeautifulSoup) -> dict[str, str]:
        heading = soup.find(lambda tag: tag.name in {"h2", "h3"} and normalize_space(tag.get_text()) == "Specs")
        if heading is None:
            return {}
        container = heading.parent.parent if heading.parent is not None and heading.parent.parent is not None else heading.parent
        if container is None:
            return {}
        lines = [normalize_space(line) for line in container.get_text("\n", strip=True).splitlines()]
        cleaned_lines = [
            line
            for line in lines
            if line
            and line not in {"Specs", "Details about this vehicle - curated by our market specialists.", "SEE SPECS"}
            and not line.startswith("See an error?")
        ]

        specs: dict[str, str] = {}
        for index, line in enumerate(cleaned_lines[:-1]):
            if line not in SPEC_LABELS:
                continue
            value = cleaned_lines[index + 1]
            if value in SPEC_LABELS:
                continue
            specs[line] = value
        return specs

    def _extract_hero_block(self, soup: BeautifulSoup):
        heading = soup.find("h1")
        if heading is None:
            return None
        return heading.find_parent(
            "div",
            class_=lambda classes: classes
            and "justify-between" in classes
            and "md:flex-row" in classes,
        )

    def _extract_status(self, text: str) -> str | None:
        match = STATUS_PATTERN.search(text)
        return normalize_space(match.group(1)) if match else None

    def _extract_price(self, text: str) -> str | None:
        match = PRICE_PATTERN.search(text)
        return normalize_space(match.group(0)) if match else None

    def _extract_listing_date(self, text: str) -> str | None:
        match = DATE_PATTERN.search(text)
        return normalize_space(match.group(0)) if match else None

    def _extract_seller(self, hero) -> str | None:
        if hero is None:
            return None
        anchor_candidates = [
            normalize_space(anchor.get_text(" ", strip=True))
            for anchor in hero.find_all("a", href=True)
        ]
        filtered_candidates = [
            candidate
            for candidate in anchor_candidates
            if candidate and candidate.lower() not in {"contact seller", "save"}
        ]
        if filtered_candidates:
            return filtered_candidates[0]

        lines = [normalize_space(line) for line in hero.get_text("\n", strip=True).splitlines() if normalize_space(line)]
        for index, line in enumerate(lines):
            if line.lower() != "by":
                continue
            for candidate in lines[index + 1 :]:
                lowered = candidate.lower()
                if lowered in IGNORED_SELLER_TOKENS:
                    continue
                if PRICE_PATTERN.search(candidate) or DATE_PATTERN.search(candidate):
                    break
                return candidate
        return None

    def _extract_location(self, soup: BeautifulSoup) -> str | None:
        stats = soup.find(
            "div",
            class_=lambda classes: classes
            and "md:items-center" in classes
            and "shadow" in classes
            and "gap-3" in classes,
        )
        if stats is None:
            return None
        text = normalize_space(stats.get_text(" ", strip=True))
        match = LOCATION_PATTERN.search(text)
        return normalize_space(match.group("value")) if match else None

    def _extract_meta_vin(self, soup: BeautifulSoup) -> str | None:
        title = soup.title.get_text(" ", strip=True) if soup.title is not None else ""
        return _extract_first_group(VIN_PATTERN, title, "value")

    def _extract_vehicle_id(self, soup: BeautifulSoup) -> str | None:
        page_text = soup.get_text(" ", strip=True)
        return _extract_first_group(VEHICLE_ID_PATTERN, page_text, "value")

    def _extract_media(self, soup: BeautifulSoup) -> list[dict[str, str | None]]:
        collected: list[str] = []
        og_image = soup.find("meta", attrs={"property": "og:image"})
        if og_image is not None:
            content = normalize_space(str(og_image.get("content") or ""))
            if content:
                collected.append(content.replace("&amp;", "&"))

        for image in soup.find_all("img", src=True):
            src = normalize_space(str(image.get("src") or ""))
            if "images.classic.com/vehicles/" not in src:
                continue
            if "uploads/dealer/" in src:
                continue
            collected.append(src.replace("&amp;", "&"))
            if len(dedupe_preserving_order(collected)) >= 4:
                break

        return [
            {"url": url, "media_type": "image/jpeg", "caption": None}
            for url in dedupe_preserving_order(collected)
        ]

    def _extract_detail_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        extracted: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = normalize_space(str(anchor.get("href") or ""))
            if not href:
                continue
            absolute = urljoin(f"{self.base_url}/", href)
            if not DETAIL_PATH_PATTERN.match(urlparse(absolute).path):
                continue
            extracted.append(absolute)
        return dedupe_preserving_order(extracted)

    def _fallback_serial_from_url(self, source_url: str) -> str:
        match = DETAIL_PATH_PATTERN.match(urlparse(source_url).path)
        if not match:
            return source_url.rstrip("/").rsplit("/", 1)[-1]
        slug = match.group("slug")
        parts = [part for part in slug.split("-") if part]
        if len(parts) >= 2:
            return parts[-2]
        return slug


def _extract_first_group(pattern: re.Pattern[str], text: str, group: str) -> str | None:
    match = pattern.search(text or "")
    if not match:
        return None
    return normalize_space(match.group(group))


def _join_variant(primary: str | None, secondary: str | None) -> str | None:
    values = [value for value in (primary, secondary) if value and value != "-"]
    if not values:
        return None
    return normalize_space(" ".join(values))


def _event_name_for_status(status: str | None) -> str:
    if status == "Sold":
        return "Classic.com sale result"
    if status == "Not Sold":
        return "Classic.com no-sale result"
    if status == "Off Market":
        return "Classic.com off-market listing"
    if status == "Last Asking":
        return "Classic.com last asking price"
    return "Classic.com listing observed"


def _event_type_for_status(status: str | None) -> str:
    if status == "Sold":
        return "listing_sold"
    if status == "Not Sold":
        return "listing_not_sold"
    if status == "Off Market":
        return "listing_off_market"
    if status == "Last Asking":
        return "listing_last_asking"
    return "listing_for_sale"


def _result_summary(status: str | None, price: str | None) -> str | None:
    if not status and not price:
        return None
    return normalize_space(" ".join(part for part in (status, price) if part))

from __future__ import annotations

import re
import time
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from digital_barn_finds.config import get_settings
from digital_barn_finds.services.scrapers.auction_helpers import (
    build_attribute_map,
    choose_serial,
    dedupe_preserving_order,
    extract_drive_side,
    extract_first_match,
    extract_semantic_value,
    extract_year,
    infer_body_style,
    normalize_money_text,
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


LOT_PATH_PATTERN = re.compile(r"^/[^/?#]*-rec\d+(?:-\d+)?-[a-z]+-\d{4}/?$", re.IGNORECASE)
CHASSIS_PATTERN = re.compile(r"(?:Chassis(?:\s+No\.?|\s+Number)?|VIN)\s*:?\s*(?P<value>[A-Za-z0-9./-]+)", re.IGNORECASE)
ENGINE_PATTERN = re.compile(r"Engine(?:\s+No\.?|\s+Number)?\s*:?\s*(?P<value>[A-Za-z0-9./-]+)", re.IGNORECASE)
REGISTRATION_PATTERN = re.compile(r"Registration(?:\s+Number)?\s*:?\s*(?P<value>[A-Za-z0-9 -]+)", re.IGNORECASE)
LOT_NUMBER_PATTERN = re.compile(r"Lot(?:\s+Number)?\s*:?\s*(?P<value>\d+[A-Za-z]?)", re.IGNORECASE)


class IconicScraper(BaseScraper):
    source_key = "iconic"
    manifest = AdapterManifest(
        source_key="iconic",
        display_name="Iconic Auctioneers",
        base_url="https://www.iconicauctioneers.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="en",
        notes="Structured UK auction lots with sold prices and exact sale-day metadata.",
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
        self.base_url = (base_url or settings.iconic_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.iconic_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.iconic_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.iconic_request_timeout_seconds
                if request_timeout_seconds is None
                else request_timeout_seconds
            ),
        )

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
            detail_links.extend(self._extract_lot_links(response.text))
            time.sleep(self.delay_seconds)
        return dedupe_preserving_order(detail_links)

    def parse_discovery_page(self, fixture: FixtureInput) -> list[str]:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type != FixtureType.SEARCH_RESULTS:
            raise ValueError(
                f"Expected fixture_type={FixtureType.SEARCH_RESULTS.value}, got {fixture.fixture_type.value}"
            )
        if fixture.raw_html is None:
            raise ValueError("Iconic discovery fixture requires raw_html")
        return self._extract_lot_links(fixture.raw_html)

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        response = self._request("GET", url)
        response.raise_for_status()
        return self.parse_detail_html(response.text, url)

    def parse_record_fixture(self, fixture: FixtureInput) -> ScrapedCarRecord:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type == FixtureType.SEARCH_RESULTS:
            raise ValueError("SEARCH_RESULTS fixtures must be parsed with parse_discovery_page()")
        if fixture.fixture_type not in self.manifest.supported_detail_fixture_types:
            raise ValueError(f"Unsupported fixture_type for record parsing: {fixture.fixture_type.value}")
        if fixture.raw_html is None:
            raise ValueError("Iconic detail fixture requires raw_html")
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
        page_text = soup.get_text("\n", strip=True).replace("\xa0", " ")
        detail_fields = self._extract_detail_fields(soup)
        context = self._extract_context(soup, page_text)
        if sale_context:
            context.update({key: value for key, value in sale_context.items() if value})

        raw_title = self._extract_title(soup)
        year_built, make, model = split_title(self._clean_title(raw_title))
        chassis_number = choose_serial(
            detail_fields.get("chassis number")
            or detail_fields.get("chassis no")
            or detail_fields.get("vin")
            or extract_first_match(CHASSIS_PATTERN, page_text),
            self._fallback_serial_number(source_url),
        )
        engine_number = (
            detail_fields.get("engine number")
            or detail_fields.get("engine no")
            or extract_first_match(ENGINE_PATTERN, page_text)
        )
        registration = (
            detail_fields.get("registration number")
            or detail_fields.get("registration")
            or extract_first_match(REGISTRATION_PATTERN, page_text)
        )
        sold = self._extract_sold(page_text)
        estimate = self._extract_estimate(page_text)
        lot_number = detail_fields.get("lot number") or extract_first_match(LOT_NUMBER_PATTERN, page_text)
        transmission = detail_fields.get("transmission") or extract_semantic_value(page_text, "transmission")
        interior_color = detail_fields.get("interior colour") or detail_fields.get("interior color") or extract_semantic_value(
            page_text,
            "interior_color",
        )
        exterior_color = (
            detail_fields.get("body colour")
            or detail_fields.get("body color")
            or detail_fields.get("exterior colour")
            or detail_fields.get("exterior color")
            or extract_semantic_value(page_text, "exterior_color", extra_labels=("Body Colour", "Body Color"))
        )
        odometer = (
            detail_fields.get("recorded mileage")
            or detail_fields.get("mileage")
            or detail_fields.get("odometer")
            or extract_semantic_value(page_text, "odometer", extra_labels=("Recorded Mileage",))
        )
        drive_side = extract_drive_side(page_text)
        body_style = infer_body_style(raw_title, model, source_url)
        event_name = context.get("sale_title") or "Iconic auction appearance"
        event_date, event_date_precision, event_year = parse_day_month_year(context.get("sale_date") or event_name)
        if event_year is None:
            event_year = extract_year(page_text) or extract_year(source_url)

        result_parts: list[str] = []
        if sold:
            result_parts.append(f"Sold {sold}")
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
            source_reference=self._build_source_reference(event_name, lot_number),
        )

        attributes = build_attribute_map(
            {"auction_house": "Iconic Auctioneers", "source_heading": self._clean_title(raw_title)},
            sale_title=context.get("sale_title"),
            sale_date=context.get("sale_date"),
            sale_location=context.get("sale_location"),
            estimate=estimate,
            sold_price=sold,
            engine_number=engine_number,
            registration=registration,
            lot_number=lot_number,
            transmission=transmission,
            interior_color=interior_color,
            exterior_color=exterior_color,
            odometer=odometer,
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
                original_color=exterior_color,
                notes="Parsed from Iconic Auctioneers lot page.",
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
                self._log(f"Iconic request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"Iconic request failed with no exception for {url}")
        raise last_error

    def _extract_lot_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = (anchor.get("href") or "").strip()
            path = urlparse(urljoin(f"{self.base_url}/", href)).path
            if not LOT_PATH_PATTERN.match(path):
                continue
            urls.append(urljoin(f"{self.base_url}/", href.lstrip("/")))
        return dedupe_preserving_order(urls)

    def _extract_title(self, soup: BeautifulSoup) -> str:
        if title_node := soup.find("h1"):
            return normalize_space(title_node.get_text(" ", strip=True))
        if soup.title:
            return normalize_space(soup.title.get_text(" ", strip=True))
        return ""

    def _clean_title(self, title: str) -> str:
        cleaned = re.sub(r"\s+\|\s+Iconic Auctioneers.*$", "", title, flags=re.IGNORECASE)
        return normalize_space(cleaned)

    def _extract_context(self, soup: BeautifulSoup, page_text: str) -> dict[str, str]:
        sale_title = extract_semantic_value(page_text, "sale_title")
        sale_date = extract_semantic_value(page_text, "sale_date")
        sale_location = extract_semantic_value(page_text, "sale_location")
        if not sale_title:
            match = re.search(r"(The [A-Za-z0-9 '&-]+?\d{4})", normalize_space(page_text))
            if match:
                sale_title = match.group(1)
        if not sale_date:
            match = re.search(
                r"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}",
                normalize_space(page_text),
            )
            if match:
                sale_date = match.group(0)
        if not sale_location:
            match = re.search(r"local time at (?P<value>[^.]+)", normalize_space(page_text), re.IGNORECASE)
            if match:
                sale_location = normalize_space(match.group("value"))
        if not sale_title:
            anchor = soup.find("a", href=lambda value: value and "sale" in value.lower())
            if anchor:
                sale_title = normalize_space(anchor.get_text(" ", strip=True))
        return {
            "sale_title": sale_title or "",
            "sale_date": sale_date or "",
            "sale_location": sale_location or "",
        }

    def _extract_sold(self, page_text: str) -> str | None:
        value = extract_semantic_value(page_text, "sold_price")
        if value and value.upper() == "NOT SOLD":
            return "NOT SOLD"
        return normalize_money_text(value) if value else None

    def _extract_estimate(self, page_text: str) -> str | None:
        value = extract_semantic_value(page_text, "estimate")
        return normalize_money_text(value) if value else None

    def _build_source_reference(self, sale_title: str | None, lot_number: str | None) -> str | None:
        if sale_title and lot_number:
            return f"{sale_title} / Lot {lot_number}"
        if sale_title:
            return sale_title
        if lot_number:
            return f"Lot {lot_number}"
        return None

    def _fallback_serial_number(self, source_url: str) -> str:
        return urlparse(source_url).path.strip("/").replace("/", "-") or "iconic-unknown"

    def _extract_detail_fields(self, soup: BeautifulSoup) -> dict[str, str]:
        fields: dict[str, str] = {}
        for label_node in soup.find_all("dt"):
            label = normalize_space(label_node.get_text(" ", strip=True)).rstrip(":")
            if not label:
                continue
            value_node = label_node.find_next_sibling("dd")
            if value_node is None:
                continue
            value = normalize_space(value_node.get_text(" ", strip=True))
            if not value:
                continue
            fields[label.lower()] = value
        return fields

    def _extract_media(self, soup: BeautifulSoup) -> list[dict[str, str | None]]:
        media: list[dict[str, str | None]] = []
        seen: set[str] = set()

        gallery_images = soup.select(
            ".image-gallery img, #gallery img[data-fancybox], #gallery img, img[data-fancybox='gallery_all']"
        )
        image_nodes = gallery_images or soup.find_all("img")
        for image in image_nodes:
            source = self._extract_media_source(image)
            if not source:
                continue
            absolute = urljoin(f"{self.base_url}/", source)
            if absolute in seen:
                continue
            seen.add(absolute)
            media.append({"url": absolute, "media_type": "image/jpeg", "caption": None})
        return media

    def _extract_media_source(self, image) -> str | None:
        candidates = (
            image.get("data-src"),
            image.get("data-lazy-src"),
            image.get("data-original"),
            image.get("data-lazy"),
            image.get("src"),
        )
        for candidate in candidates:
            cleaned = normalize_space(str(candidate or ""))
            if not cleaned:
                continue
            normalized = cleaned.split("?", 1)[0]
            if any(
                token in normalized
                for token in (
                    "/templates/",
                    "/assets/consignor/",
                    "/icons/",
                    "placeholder",
                    "newsletter-icon",
                    "pink-cross",
                    "close-x-icon",
                    "whatsapp",
                )
            ):
                continue
            if "/lot_images/" in normalized or "ctfassets.net" in normalized:
                return cleaned
        return None

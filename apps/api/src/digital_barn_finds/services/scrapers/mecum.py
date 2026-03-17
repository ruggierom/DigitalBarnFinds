from __future__ import annotations

import json
import re
import time
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from digital_barn_finds.config import get_settings
from digital_barn_finds.services.scrapers.auction_helpers import (
    build_attribute_map,
    collect_image_media,
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


LOT_PATH_PATTERN = re.compile(r"^/lots/(?P<lot_id>\d+)/(?P<slug>[^/?#]+)/?$", re.IGNORECASE)
CHASSIS_PATTERN = re.compile(
    r"(?:Chassis(?:\s+No\.?|\s+Number)?|Serial(?:\s+No\.?|\s+Number)?|VIN(?:\s*/\s*Serial)?)\s*:?\s*(?P<value>[A-Za-z0-9./-]+)",
    re.IGNORECASE,
)
ENGINE_PATTERN = re.compile(r"Engine(?:\s+No\.?|\s+Number)?\s*:?\s*(?P<value>[A-Za-z0-9./-]+)", re.IGNORECASE)
REGISTRATION_PATTERN = re.compile(r"Registration\s*:?\s*(?P<value>[A-Za-z0-9 -]+)", re.IGNORECASE)
LOT_NUMBER_PATTERN = re.compile(r"\bLot\s+(?P<value>[A-Z]?\d+)\b", re.IGNORECASE)


class MecumScraper(BaseScraper):
    source_key = "mecum"
    manifest = AdapterManifest(
        source_key="mecum",
        display_name="Mecum Auctions",
        base_url="https://www.mecum.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="en",
        notes="High-volume US auction archive for dated public sale appearances.",
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
        self.base_url = (base_url or settings.mecum_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.mecum_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.mecum_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.mecum_request_timeout_seconds
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
            raise ValueError("Mecum discovery fixture requires raw_html")
        return self._extract_lot_links(fixture.raw_html)

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        response = self._request("GET", url)
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
            raise ValueError("Mecum detail fixture requires raw_html")
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
        source_url = self._extract_canonical_url(soup) or source_url
        page_text = soup.get_text("\n", strip=True).replace("\xa0", " ")
        schema_car = self._extract_schema_car(soup)
        context = self._extract_context(soup, page_text)
        if sale_context:
            context.update({key: value for key, value in sale_context.items() if value})

        raw_title = self._extract_title(soup)
        year_built, make, model = split_title(self._clean_title(raw_title))
        schema_name = normalize_space(str(schema_car.get("name") or "")) if schema_car else ""
        if (make == "Unknown make" or model == "Unknown model") and schema_name:
            year_built, make, model = split_title(schema_name)

        payload_color = self._extract_payload_value(html, "color")
        payload_interior = self._extract_payload_value(html, "interior")
        payload_transmission = self._extract_payload_value(html, "transmission")
        payload_vin = self._extract_payload_value(html, "vinSerial")
        payload_lot_number = self._extract_payload_value(html, "lotNumber")
        payload_lot_series = self._extract_payload_value(html, "lotSeries")
        payload_odometer = self._extract_payload_value(html, "odometer")
        payload_odometer_units = self._extract_payload_value(html, "odometerUnits")
        payload_hammer_price = self._extract_payload_value(html, "hammerPrice")

        if make == "Unknown make" and schema_car and schema_car.get("manufacturer"):
            make = normalize_space(str(schema_car["manufacturer"]))
        if model == "Unknown model" and schema_car and schema_car.get("model"):
            model = normalize_space(str(schema_car["model"]))

        chassis_number = choose_serial(
            extract_first_match(CHASSIS_PATTERN, page_text) or payload_vin or self._extract_schema_serial(schema_car),
            self._fallback_serial_number(source_url),
        )
        engine_number = extract_first_match(ENGINE_PATTERN, page_text)
        engine_spec = self._extract_block_value(html, "ENGINE")
        registration = extract_first_match(REGISTRATION_PATTERN, page_text)
        sold = self._extract_sold(page_text) or self._normalize_money_amount(payload_hammer_price)
        estimate = self._extract_estimate(page_text)
        lot_number = (
            self._extract_header_lot_number(soup)
            or payload_lot_number
            or self._extract_lot_number(page_text, source_url)
        )
        lot_series = self._extract_header_series(soup) or payload_lot_series
        event_name = context.get("sale_title") or "Mecum auction appearance"
        event_date, event_date_precision, event_year = parse_day_month_year(context.get("sale_date") or event_name)
        if event_year is None:
            event_year = extract_year(page_text) or extract_year(source_url)

        exterior_color = (
            self._extract_block_value(html, "EXTERIOR COLOR")
            or (normalize_space(str(schema_car.get("color") or "")) if schema_car else "")
            or payload_color
        )
        interior_color = (
            self._extract_block_value(html, "INTERIOR COLOR")
            or (normalize_space(str(schema_car.get("vehicleInteriorColor") or "")) if schema_car else "")
            or payload_interior
        )
        transmission = (
            self._extract_block_value(html, "TRANSMISSION")
            or (normalize_space(str(schema_car.get("vehicleTransmission") or "")) if schema_car else "")
            or payload_transmission
        )
        odometer = self._extract_header_odometer(soup) or self._format_odometer(payload_odometer, payload_odometer_units)
        highlights = self._extract_block_list(html, "HIGHLIGHTS")
        equipment = self._extract_block_list(html, "EQUIPMENT")
        body_style = infer_body_style(raw_title, model, lot_series, source_url)
        drive_side = extract_drive_side(page_text)
        notes = self._build_notes(lot_series, highlights, equipment)

        result = "; ".join(
            part for part in [f"Sold {sold}" if sold else None, f"Estimate {estimate}" if estimate else None] if part
        ) or None

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
            source_reference=self._build_source_reference(context.get("sale_title"), lot_number),
        )

        attributes = build_attribute_map(
            {"auction_house": "Mecum", "source_heading": self._clean_title(raw_title)},
            sale_title=context.get("sale_title"),
            sale_date=context.get("sale_date"),
            sale_location=context.get("sale_location"),
            estimate=estimate,
            sold_price=sold,
            engine_number=engine_number,
            engine_spec=engine_spec,
            registration=registration,
            lot_number=lot_number,
            lot_series=lot_series,
            transmission=transmission,
            interior_color=interior_color,
            odometer=odometer,
            highlights=highlights,
            equipment=equipment,
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
                original_color=exterior_color or None,
                notes=notes,
                attributes=attributes,
            ),
            custody_events=[],
            car_events=[event],
            media=self._extract_media(soup, schema_car, html),
        )

    def _request(self, method: str, url: str) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                return self.client.request(method, url)
            except httpx.HTTPError as exc:
                last_error = exc
                self._log(f"Mecum request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"Mecum request failed with no exception for {url}")
        raise last_error

    def _extract_lot_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = (anchor.get("href") or "").strip()
            path = urlparse(urljoin(f"{self.base_url}/", href)).path
            match = LOT_PATH_PATTERN.match(path)
            if not match:
                continue
            slug = match.group("slug")
            if "[" in slug or "]" in slug or "..." in slug:
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
        return normalize_space(title.split("|", 1)[0])

    def _extract_context(self, soup: BeautifulSoup, page_text: str) -> dict[str, str]:
        text = normalize_space(page_text)
        sale_title = self._extract_header_sale_title(soup) or extract_semantic_value(page_text, "sale_title", extra_labels=("Event",))
        sale_date = self._extract_header_sale_date(soup) or extract_semantic_value(page_text, "sale_date")
        sale_location = extract_semantic_value(page_text, "sale_location")
        if not sale_title:
            anchor = soup.find("a", href=lambda value: value and "/auctions/" in value)
            if anchor:
                sale_title = normalize_space(anchor.get_text(" ", strip=True))
        if not sale_date:
            match = re.search(
                r"\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}",
                text,
            )
            if match:
                sale_date = match.group(0)
        return {
            "sale_title": sale_title or "",
            "sale_date": sale_date or "",
            "sale_location": sale_location or "",
        }

    def _extract_sold(self, page_text: str) -> str | None:
        value = extract_semantic_value(page_text, "sold_price")
        return normalize_money_text(value) if value else None

    def _extract_estimate(self, page_text: str) -> str | None:
        value = extract_semantic_value(page_text, "estimate")
        return normalize_money_text(value) if value else None

    def _extract_lot_number(self, page_text: str, source_url: str) -> str | None:
        value = extract_first_match(LOT_NUMBER_PATTERN, page_text)
        if value:
            return value
        match = LOT_PATH_PATTERN.match(urlparse(source_url).path)
        return match.group("slug").split("-", 1)[0].upper() if match else None

    def _build_source_reference(self, sale_title: str | None, lot_number: str | None) -> str | None:
        if sale_title and lot_number:
            return f"{sale_title} / Lot {lot_number}"
        if sale_title:
            return sale_title
        if lot_number:
            return f"Lot {lot_number}"
        return None

    def _fallback_serial_number(self, source_url: str) -> str:
        match = LOT_PATH_PATTERN.match(urlparse(source_url).path)
        if not match:
            return f"mecum-{urlparse(source_url).path.strip('/').replace('/', '-') or 'unknown'}"
        return f"mecum-lot-{match.group('lot_id')}"

    def _extract_canonical_url(self, soup: BeautifulSoup) -> str | None:
        canonical = soup.find("link", rel="canonical")
        href = canonical.get("href") if canonical else None
        return normalize_space(str(href)) if href else None

    def _extract_schema_car(self, soup: BeautifulSoup) -> dict[str, object]:
        for script in soup.find_all("script", type="application/ld+json"):
            raw = (script.string or script.get_text() or "").strip()
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if isinstance(payload, dict) and payload.get("@type") == "Car":
                return payload
        return {}

    def _extract_schema_serial(self, schema_car: dict[str, object]) -> str | None:
        candidates: list[str] = []
        for key in ("vehicleIdentificationNumber", "serialNumber"):
            value = normalize_space(str(schema_car.get(key) or ""))
            if value:
                candidates.append(value)

        identifier = schema_car.get("identifier")
        if isinstance(identifier, str):
            value = normalize_space(identifier)
            if value:
                candidates.append(value)
        elif isinstance(identifier, dict):
            value = normalize_space(str(identifier.get("value") or identifier.get("@value") or ""))
            if value:
                candidates.append(value)

        for candidate in candidates:
            if re.fullmatch(r"[A-Za-z0-9./-]{4,}", candidate):
                return candidate
        return None

    def _extract_header_lot_number(self, soup: BeautifulSoup) -> str | None:
        for span in soup.find_all("span"):
            text = normalize_space(span.get_text(" ", strip=True))
            if text.lower().startswith("lot "):
                return text.removeprefix("Lot ").strip()
        return None

    def _extract_header_sale_date(self, soup: BeautifulSoup) -> str | None:
        if time_node := soup.find("time"):
            datetime_value = normalize_space(str(time_node.get("datetime") or ""))
            if datetime_value:
                return datetime_value
            return normalize_space(time_node.get_text(" ", strip=True))
        return None

    def _extract_header_sale_title(self, soup: BeautifulSoup) -> str | None:
        for paragraph in soup.find_all("p"):
            classes = " ".join(paragraph.get("class") or [])
            if "LotHeader_number__" not in classes:
                continue
            time_seen = False
            for child in paragraph.children:
                name = getattr(child, "name", None)
                if name == "time":
                    time_seen = True
                    continue
                if not time_seen or name != "span":
                    continue
                text = normalize_space(child.get_text(" ", strip=True))
                if text and text != "//":
                    return text
        for anchor in soup.find_all("a", href=True):
            href = str(anchor.get("href") or "")
            if "/auctions/" not in href:
                continue
            text = normalize_space(anchor.get_text(" ", strip=True))
            if text and text.lower() != "auction details":
                return text
        return None

    def _extract_header_series(self, soup: BeautifulSoup) -> str | None:
        for paragraph in soup.find_all("p"):
            classes = " ".join(paragraph.get("class") or [])
            if "LotHeader_series__" not in classes:
                continue
            return normalize_space(paragraph.get_text(" ", strip=True))
        return None

    def _extract_header_odometer(self, soup: BeautifulSoup) -> str | None:
        for div in soup.find_all("div"):
            classes = " ".join(div.get("class") or [])
            if "LotHeader_odometerSerial__" not in classes:
                continue
            paragraphs = [normalize_space(node.get_text(" ", strip=True)) for node in div.find_all("p")]
            for index, text in enumerate(paragraphs):
                if text.lower().startswith("odometer reads") and index + 1 < len(paragraphs):
                    value = paragraphs[index + 1]
                    if re.search(r"\d", value):
                        return value
        return None

    def _extract_payload_value(self, html: str, key: str) -> str | None:
        match = re.search(rf'"{re.escape(key)}":"(?P<value>[^"]*)"', html)
        if not match:
            return None
        value = normalize_space(match.group("value"))
        return value or None

    def _extract_block_value(self, html: str, heading: str) -> str | None:
        values = self._extract_block_contents(html, heading, window=900)
        if not values:
            return None
        return values[0]

    def _extract_block_list(self, html: str, heading: str) -> list[str]:
        values = self._extract_block_contents(html, heading, window=2600)
        disallowed = {
            "CONDITIONS OF SALE",
            "ENGINE",
            "TRANSMISSION",
            "EXTERIOR COLOR",
            "INTERIOR COLOR",
            "MAKE",
        }
        items: list[str] = []
        for value in values:
            if value.upper() in disallowed:
                break
            items.append(value)
        return items

    def _extract_block_contents(self, html: str, heading: str, *, window: int) -> list[str]:
        marker = f'"content":"{heading}"'
        start = html.find(marker)
        if start == -1:
            return []
        chunk = html[start : start + window]
        values = re.findall(r'"content":"(.*?)"', chunk)
        cleaned: list[str] = []
        for value in values[1:]:
            text = self._decode_embedded_content(value)
            if text:
                cleaned.append(text)
        return cleaned

    def _decode_embedded_content(self, value: str) -> str:
        try:
            decoded = json.loads(f'"{value}"')
        except json.JSONDecodeError:
            decoded = value
        if "<" in decoded and ">" in decoded:
            return normalize_space(BeautifulSoup(decoded, "html.parser").get_text(" ", strip=True))
        return normalize_space(decoded)

    def _extract_media(
        self,
        soup: BeautifulSoup,
        schema_car: dict[str, object],
        html: str,
    ) -> list[dict[str, str | None]]:
        media: list[dict[str, str | None]] = []
        seen: set[str] = set()

        for candidate in schema_car.get("image", []) if isinstance(schema_car.get("image"), list) else []:
            url = normalize_space(str(candidate))
            if not url or url in seen:
                continue
            seen.add(url)
            media.append({"url": url, "media_type": "image/jpeg", "caption": None})

        for url, category in re.findall(r'"url":"(https://[^"]+)","category":"([^"]+)"', html):
            cleaned_url = normalize_space(url)
            if not cleaned_url or cleaned_url in seen:
                continue
            seen.add(cleaned_url)
            media.append(
                {
                    "url": cleaned_url,
                    "media_type": "image/jpeg",
                    "caption": normalize_space(category) or None,
                }
            )

        for item in collect_image_media(
            soup,
            base_url=self.base_url,
            allow_substrings=("images.mecum.com", "/images/", "res.cloudinary.com/mecum"),
            deny_substrings=("logo", "icon", "placeholder", "arrow", "avatar"),
        ):
            url = normalize_space(str(item.get("url") or ""))
            if not url or url in seen:
                continue
            seen.add(url)
            media.append(item)

        return media

    def _normalize_money_amount(self, raw_value: str | None) -> str | None:
        if not raw_value:
            return None
        digits = re.sub(r"[^\d]", "", raw_value)
        if not digits:
            return None
        return normalize_money_text(f"${int(digits):,}")

    def _format_odometer(self, raw_value: str | None, units: str | None) -> str | None:
        if not raw_value:
            return None
        digits = re.sub(r"[^\d]", "", raw_value)
        if not digits:
            return None
        suffix = "miles" if (units or "").upper().startswith("M") else "km" if units else ""
        return normalize_space(f"{int(digits):,} {suffix}")

    def _build_notes(self, lot_series: str | None, highlights: list[str], equipment: list[str]) -> str:
        parts: list[str] = ["Parsed from Mecum auction lot page."]
        if lot_series:
            parts.append(lot_series)
        if highlights:
            parts.append("Highlights: " + "; ".join(highlights[:5]))
        if equipment:
            parts.append("Equipment: " + "; ".join(equipment[:5]))
        return " ".join(part for part in parts if part).strip()

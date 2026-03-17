from __future__ import annotations

import html as html_lib
import json
import re
import time
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from digital_barn_finds.config import get_settings
from digital_barn_finds.services.scrapers.auction_helpers import (
    build_attribute_map,
    choose_serial,
    collect_image_media,
    dedupe_preserving_order,
    extract_drive_side,
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


LISTING_PATH_PATTERN = re.compile(r"^/listing/(?P<slug>[^/?#]+)/?$", re.IGNORECASE)
CHASSIS_PATTERN = re.compile(r"^(?:Chassis|VIN|Serial)\s*:\s*(?P<value>[A-Za-z0-9./-]+)$", re.IGNORECASE)
MILES_PATTERN = re.compile(
    r"^(?P<value>[\d,]+(?:\.\d+)?)\s*(?P<units>Miles|Kilometers|Kilometres|KM)\s+Shown$",
    re.IGNORECASE,
)
LOT_PATTERN = re.compile(r"#(?P<value>\d+)")
MONEY_PATTERN = re.compile(r"(?:USD|CAD|EUR|GBP)\s+\$?[\d,]+(?:\.\d+)?|\$[\d,]+(?:\.\d+)?")
YEAR_IN_TITLE_PATTERN = re.compile(r"\b(?P<year>(?:19|20)\d{2})\b")


class BringATrailerScraper(BaseScraper):
    source_key = "bat"
    manifest = AdapterManifest(
        source_key="bat",
        display_name="Bring a Trailer",
        base_url="https://bringatrailer.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="en",
        notes="Online auction archive with strong VIN/chassis, result-date, and gallery coverage.",
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
        self.base_url = (base_url or settings.bat_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.bat_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.bat_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.bat_request_timeout_seconds
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
            raise ValueError("BaT discovery fixture requires raw_html")
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
            raise ValueError("BaT detail fixture requires raw_html")
        return self.parse_detail_html(fixture.raw_html, fixture.source_url)

    def parse_detail_html(self, html: str, source_url: str) -> ScrapedCarRecord:
        soup = BeautifulSoup(html, "html.parser")
        title = self._extract_title(soup)
        normalized_title = self._normalize_title_for_split(title)
        year_built, make, model = split_title(normalized_title)
        description = self._extract_description(soup)
        detail_items = self._extract_listing_details(soup)
        stats = self._extract_stats_map(soup)
        chassis_number = choose_serial(
            self._extract_chassis_number(detail_items, description),
            self._fallback_serial_number(source_url),
        )
        lot_number = self._extract_lot_number(soup, source_url)
        seller = self._extract_labeled_value(soup, "Seller")
        location = self._extract_labeled_value(soup, "Location")
        seller_type = self._extract_labeled_value(soup, "Private Party or Dealer")
        sold_price, high_bidder = self._extract_sale_result(stats)
        auction_ended = stats.get("Auction Ended") or self._extract_available_date(soup)
        bid_count = stats.get("Bids")
        odometer = self._extract_odometer(detail_items)
        engine_spec = self._extract_engine_spec(detail_items)
        transmission = self._extract_transmission(detail_items)
        exterior_color = self._extract_exterior_color(detail_items)
        interior_color = self._extract_interior_color(detail_items)
        drive_side = extract_drive_side(" ".join([description, *detail_items]))
        body_style = infer_body_style(title, model, " ".join(detail_items), description, source_url)
        variant = self._extract_variant(model, body_style)
        event_date, event_date_precision, event_year = parse_day_month_year(auction_ended)
        if event_year is None:
            event_year = year_built

        result_parts = []
        if sold_price:
            result_parts.append(f"Sold {sold_price}")
        if high_bidder:
            result_parts.append(f"Winner {high_bidder}")
        result = "; ".join(result_parts) or None

        event = NormalizedTimelineEvent(
            event_kind="event",
            event_date=event_date,
            event_date_precision=event_date_precision,
            event_year=event_year,
            payload={
                "event_name": "Bring a Trailer auction result",
                "event_type": "auction_result",
                "car_number": lot_number,
                "result": result,
                "location": location,
            },
            source_reference=self._build_source_reference(lot_number, auction_ended),
        )

        attributes = build_attribute_map(
            {"auction_house": "Bring a Trailer", "source_heading": title},
            sale_title="Bring a Trailer auction result",
            sale_date=auction_ended,
            sale_location=location,
            sold_price=sold_price,
            lot_number=lot_number,
            seller=seller,
            seller_type=seller_type,
            bid_count=bid_count,
            winner=high_bidder,
            odometer=odometer,
            engine_spec=engine_spec,
            transmission=transmission,
            interior_color=interior_color,
            exterior_color=exterior_color,
            highlights=self._extract_highlights(detail_items),
        )

        return ScrapedCarRecord(
            source_url=source_url,
            car=NormalizedCar(
                serial_number=chassis_number,
                make=make,
                model=model,
                variant=variant,
                year_built=year_built,
                body_style=body_style,
                drive_side=drive_side,
                original_color=exterior_color,
                notes=description or "Parsed from Bring a Trailer auction listing.",
                attributes=attributes,
            ),
            custody_events=[],
            car_events=[event],
            media=self._extract_media(html, soup),
        )

    def _request(self, method: str, url: str) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                return self.client.request(method, url)
            except httpx.HTTPError as exc:
                last_error = exc
                self._log(f"BaT request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"BaT request failed with no exception for {url}")
        raise last_error

    def _extract_lot_links(self, html: str) -> list[str]:
        urls = self._extract_links_from_results_payload(html)
        if urls:
            return urls

        soup = BeautifulSoup(html, "html.parser")
        extracted: list[str] = []
        for anchor in soup.find_all("a", href=True):
            absolute = urljoin(f"{self.base_url}/", (anchor.get("href") or "").strip())
            if not LISTING_PATH_PATTERN.match(urlparse(absolute).path):
                continue
            extracted.append(absolute)
        return dedupe_preserving_order(extracted)

    def _extract_links_from_results_payload(self, html: str) -> list[str]:
        payload = self._extract_json_object(html, "BAT_MODEL_LISTINGS_COMPLETED_TOOLBAR")
        if payload is None:
            return []
        urls: list[str] = []
        for item in payload.get("items", []):
            url = str(item.get("url") or "").replace("\\/", "/")
            if not url:
                continue
            if not LISTING_PATH_PATTERN.match(urlparse(url).path):
                continue
            urls.append(url)
        return dedupe_preserving_order(urls)

    def _extract_json_object(self, html: str, variable_name: str) -> dict | None:
        prefix = f"var {variable_name} = "
        start = html.find(prefix)
        if start == -1:
            return None

        cursor = html.find("{", start + len(prefix))
        if cursor == -1:
            return None

        depth = 0
        in_string = False
        escaped = False
        for index in range(cursor, len(html)):
            character = html[index]
            if in_string:
                if escaped:
                    escaped = False
                elif character == "\\":
                    escaped = True
                elif character == '"':
                    in_string = False
                continue
            if character == '"':
                in_string = True
                continue
            if character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
                if depth == 0:
                    literal = html[cursor : index + 1]
                    try:
                        return json.loads(literal)
                    except json.JSONDecodeError:
                        return None
        return None

    def _extract_title(self, soup: BeautifulSoup) -> str:
        title_node = soup.select_one(".listing-post-title") or soup.find("h1")
        if title_node:
            return normalize_space(title_node.get_text(" ", strip=True))
        if soup.title:
            title_text = normalize_space(soup.title.get_text(" ", strip=True))
            return re.sub(r"\s+for sale on BaT Auctions.*$", "", title_text, flags=re.IGNORECASE)
        return ""

    def _normalize_title_for_split(self, title: str) -> str:
        cleaned = normalize_space(title)
        if YEAR_IN_TITLE_PATTERN.match(cleaned):
            return cleaned
        match = YEAR_IN_TITLE_PATTERN.search(cleaned)
        if not match:
            return cleaned
        return normalize_space(cleaned[match.start() :])

    def _extract_description(self, soup: BeautifulSoup) -> str:
        excerpt = soup.select_one(".post-excerpt")
        if not excerpt:
            return ""
        return normalize_space(excerpt.get_text(" ", strip=True))

    def _extract_listing_details(self, soup: BeautifulSoup) -> list[str]:
        return [
            normalize_space(node.get_text(" ", strip=True))
            for node in soup.select(".essentials .item ul li")
            if normalize_space(node.get_text(" ", strip=True))
        ]

    def _extract_chassis_number(self, detail_items: list[str], description: str) -> str | None:
        for item in detail_items:
            match = CHASSIS_PATTERN.match(item)
            if match:
                return normalize_space(match.group("value"))
        vin_match = re.search(r"\b([A-HJ-NPR-Z0-9]{17})\b", description)
        return vin_match.group(1) if vin_match else None

    def _extract_odometer(self, detail_items: list[str]) -> str | None:
        for item in detail_items:
            match = MILES_PATTERN.match(item)
            if not match:
                continue
            value = normalize_space(match.group("value"))
            units = match.group("units").lower()
            suffix = "miles" if "mile" in units else "km"
            return f"{value} {suffix}"
        return None

    def _extract_engine_spec(self, detail_items: list[str]) -> str | None:
        for item in detail_items:
            lowered = item.lower()
            if "liter" in lowered or "litre" in lowered or "electric motor" in lowered:
                return item
        return None

    def _extract_transmission(self, detail_items: list[str]) -> str | None:
        for item in detail_items:
            lowered = item.lower()
            if any(token in lowered for token in ("manual", "automatic", "transaxle", "transmission", "pdk", "tiptronic")):
                return item
        return None

    def _extract_exterior_color(self, detail_items: list[str]) -> str | None:
        for item in detail_items:
            if item.lower().endswith(" paint"):
                return item[: -len(" Paint")].strip()
        return None

    def _extract_interior_color(self, detail_items: list[str]) -> str | None:
        for item in detail_items:
            lowered = item.lower()
            if "upholstery" in lowered or "interior" in lowered:
                suffixes = (
                    " Leather Upholstery",
                    " Connolly Leather Upholstery",
                    " Upholstery",
                    " Interior",
                )
                for suffix in suffixes:
                    if item.endswith(suffix):
                        return item[: -len(suffix)].strip()
                return item
        return None

    def _extract_variant(self, model: str, body_style: str | None) -> str | None:
        working_model = normalize_space(model)
        if body_style:
            working_model = normalize_space(
                re.sub(rf"\b{re.escape(body_style)}\b", "", working_model, count=1, flags=re.IGNORECASE)
            )
        tokens = working_model.split()
        if len(tokens) <= 1:
            return None
        return normalize_space(" ".join(tokens[1:]))

    def _extract_highlights(self, detail_items: list[str]) -> list[str]:
        highlights: list[str] = []
        for item in detail_items:
            if CHASSIS_PATTERN.match(item) or MILES_PATTERN.match(item):
                continue
            if item == self._extract_engine_spec(detail_items):
                continue
            if item == self._extract_transmission(detail_items):
                continue
            if item.endswith(" Paint") or "Upholstery" in item or item.endswith(" Interior"):
                continue
            highlights.append(item)
        return highlights

    def _extract_labeled_value(self, soup: BeautifulSoup, label: str) -> str | None:
        essentials = soup.select_one(".essentials")
        if essentials is None:
            return None
        html = str(essentials)
        pattern = re.compile(
            rf"<strong>{re.escape(label)}</strong>\s*:\s*(?:<a[^>]*>)?(?P<value>[^<]+)",
            re.IGNORECASE,
        )
        match = pattern.search(html)
        if not match:
            return None
        return normalize_space(html_lib.unescape(match.group("value")))

    def _extract_lot_number(self, soup: BeautifulSoup, source_url: str) -> str | None:
        essentials = soup.select_one(".essentials")
        if essentials is not None:
            match = re.search(r"<strong>Lot</strong>\s*#(?P<value>\d+)", str(essentials), re.IGNORECASE)
            if match:
                return match.group("value")
        title_match = re.search(r"Lot\s+#?(?P<value>\d+)", soup.get_text(" ", strip=True), re.IGNORECASE)
        if title_match:
            return title_match.group("value")
        slug = urlparse(source_url).path.strip("/").split("/")[-1]
        return slug or None

    def _extract_stats_map(self, soup: BeautifulSoup) -> dict[str, str]:
        stats: dict[str, str] = {}
        for row in soup.select("table.listing-stats tr"):
            label_node = row.select_one(".listing-stats-label")
            value_node = row.select_one(".listing-stats-value")
            if label_node is None or value_node is None:
                continue
            label = normalize_space(label_node.get_text(" ", strip=True))
            value = normalize_space(value_node.get_text(" ", strip=True))
            if label and value:
                stats[label] = value
        return stats

    def _extract_sale_result(self, stats: dict[str, str]) -> tuple[str | None, str | None]:
        winning_bid = stats.get("Winning Bid") or stats.get("Final Bid")
        if not winning_bid:
            return None, None
        amount_match = MONEY_PATTERN.search(winning_bid)
        bidder_match = re.search(r"\bby\s+(?P<value>.+)$", winning_bid)
        amount = normalize_money_text(amount_match.group(0)) if amount_match else None
        bidder = normalize_space(bidder_match.group("value")) if bidder_match else None
        return amount, bidder

    def _extract_available_date(self, soup: BeautifulSoup) -> str | None:
        available = soup.select_one(".listing-available-info")
        if not available:
            return None
        text = normalize_space(available.get_text(" ", strip=True))
        match = re.search(r"on\s+(?P<value>\d{1,2}/\d{1,2}/\d{2,4})", text)
        return match.group("value") if match else None

    def _extract_media(self, html: str, soup: BeautifulSoup) -> list[dict[str, str | None]]:
        media = self._extract_gallery_media(html)
        if media:
            return media
        return collect_image_media(
            soup,
            base_url=self.base_url,
            allow_substrings=("/wp-content/uploads/",),
            deny_substrings=("comments.svg", "opt-out.svg", "countries/", "icon", "logo"),
            strip_query=False,
        )

    def _extract_gallery_media(self, html: str) -> list[dict[str, str | None]]:
        match = re.search(r"data-gallery-items=(?P<quote>['\"])(?P<value>\[.*?\])(?P=quote)", html, re.IGNORECASE)
        if not match:
            return []
        try:
            payload = json.loads(html_lib.unescape(match.group("value")))
        except json.JSONDecodeError:
            return []

        media: list[dict[str, str | None]] = []
        seen: set[str] = set()
        for item in payload:
            large = item.get("large") or {}
            url = str(large.get("url") or "").replace("\\/", "/").strip()
            if not url or url in seen:
                continue
            seen.add(url)
            media.append({"url": url, "media_type": "image/jpeg", "caption": str(item.get("title") or "").strip() or None})
        return media

    def _build_source_reference(self, lot_number: str | None, auction_ended: str | None) -> str | None:
        if lot_number and auction_ended:
            return f"Bring a Trailer Lot #{lot_number} / {auction_ended}"
        if lot_number:
            return f"Bring a Trailer Lot #{lot_number}"
        return auction_ended

    def _fallback_serial_number(self, source_url: str) -> str:
        return urlparse(source_url).path.strip("/").replace("/", "-") or "bat-unknown"

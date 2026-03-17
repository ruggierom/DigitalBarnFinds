from __future__ import annotations

from datetime import date
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
    dedupe_preserving_order,
    extract_drive_side,
    infer_body_style,
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


LOT_PATH_PATTERN = re.compile(
    r"^/auctions/(?P<sale_code>[^/]+)/lots/(?P<slug>[^/?#]+)/?$",
    re.IGNORECASE,
)
SALE_PATH_PATTERN = re.compile(r"^/auctions/(?P<sale_code>[^/]+)/?$", re.IGNORECASE)
LOT_RESULTS_PATH_PATTERN = re.compile(r"^/auctions/(?P<sale_code>[^/]+)/lots/?$", re.IGNORECASE)
LOT_NUMBER_PATTERN = re.compile(r"\bLot\s+(?P<value>\d+)\b", re.IGNORECASE)
SOLD_PATTERN = re.compile(r"(?P<value>[€£$][\d,]+(?:\.\d+)?\s+[A-Z]{3}\s+\|\s+Sold)", re.IGNORECASE)


class RMSothebysScraper(BaseScraper):
    source_key = "rm_sothebys"
    manifest = AdapterManifest(
        source_key="rm_sothebys",
        display_name="RM Sotheby's",
        base_url="https://rmsothebys.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="en",
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
        self.base_url = (base_url or settings.rm_sothebys_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.rm_sothebys_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.rm_sothebys_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.rm_sothebys_request_timeout_seconds
                if request_timeout_seconds is None
                else request_timeout_seconds
            ),
        )
        self._sale_context_by_code: dict[str, dict[str, str]] = {}

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

            sale_context = self._extract_sale_context_from_page(response.text, str(response.url))
            sale_code = sale_context.get("sale_code")
            if sale_code:
                self._sale_context_by_code[sale_code] = sale_context

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
            raise ValueError("RM Sotheby's discovery fixture requires raw_html")
        return self._extract_lot_links(fixture.raw_html)

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        response = self._request("GET", url)
        response.raise_for_status()
        sale_code = self._extract_sale_code_from_url(str(response.url))
        sale_context = self._sale_context_by_code.get(sale_code or "", {})
        return self.parse_detail_html(response.text, str(response.url), sale_context=sale_context)

    def parse_record_fixture(self, fixture: FixtureInput) -> ScrapedCarRecord:
        if fixture.source_key != self.source_key:
            raise ValueError(f"Expected source_key={self.source_key}, got {fixture.source_key}")
        if fixture.fixture_type == FixtureType.SEARCH_RESULTS:
            raise ValueError("SEARCH_RESULTS fixtures must be parsed with parse_discovery_page()")
        if fixture.fixture_type not in self.manifest.supported_detail_fixture_types:
            raise ValueError(f"Unsupported fixture_type for record parsing: {fixture.fixture_type.value}")
        if fixture.raw_html is None:
            raise ValueError("RM Sotheby's detail fixture requires raw_html")
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
        context = self._extract_sale_context_from_detail_page(soup, source_url)
        if sale_context:
            context.update({key: value for key, value in sale_context.items() if value})

        title = self._extract_title(soup)
        year_built, make, model = split_title(title)
        id_fields = self._extract_id_fields(soup)
        chassis_number = choose_serial(id_fields.get("Chassis No."), self._fallback_serial_number(source_url))
        sold_price = self._extract_sold_price(soup)
        lot_number = self._extract_lot_number(soup, source_url)
        highlights = self._extract_highlights(soup)
        notes = " ".join(highlights) if highlights else "Parsed from RM Sotheby's lot page."
        drive_side = extract_drive_side(" ".join(highlights))
        body_style = infer_body_style(title, model, notes, source_url)
        event_date, event_date_precision, event_year = self._extract_event_date(context.get("sale_date"))
        if event_year is None:
            event_year = self._extract_year_from_sale_title(context.get("sale_title"))
            if event_year is not None:
                event_date_precision = "year"

        event = NormalizedTimelineEvent(
            event_kind="event",
            event_date=event_date,
            event_date_precision=event_date_precision,
            event_year=event_year,
            payload={
                "event_name": context.get("sale_title") or "RM Sotheby's auction result",
                "event_type": "auction_result",
                "car_number": lot_number,
                "result": sold_price,
                "location": id_fields.get("Location"),
            },
            source_reference=self._build_source_reference(context.get("sale_title"), lot_number),
        )

        attributes = build_attribute_map(
            {"auction_house": "RM Sotheby's", "source_heading": title},
            sale_code=context.get("sale_code"),
            sale_title=context.get("sale_title"),
            sale_date=context.get("sale_date"),
            sale_location=id_fields.get("Location"),
            sold_price=sold_price,
            lot_number=lot_number,
            registration=id_fields.get("Registration"),
            engine_number=id_fields.get("Engine No."),
            gearbox_number=id_fields.get("Gearbox No."),
            body_number=id_fields.get("Body No."),
            highlights=highlights,
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
                notes=notes,
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
                self._log(f"RM Sotheby's request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"RM Sotheby's request failed with no exception for {url}")
        raise last_error

    def _extract_lot_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = (anchor.get("href") or "").strip()
            absolute = urljoin(f"{self.base_url}/", href)
            if not LOT_PATH_PATTERN.match(urlparse(absolute).path):
                continue
            urls.append(absolute)
        return dedupe_preserving_order(urls)

    def _extract_sale_context_from_page(self, html: str, source_url: str) -> dict[str, str]:
        soup = BeautifulSoup(html, "html.parser")
        context = {
            "sale_code": self._extract_sale_code_from_url(source_url) or "",
            "sale_title": "",
            "sale_date": "",
            "sale_location": "",
        }

        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            raw = normalize_space(script.string or script.get_text(" ", strip=True))
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if payload.get("@type") != "Event":
                continue
            context["sale_title"] = normalize_space(str(payload.get("headline") or payload.get("name") or ""))
            context["sale_date"] = normalize_space(str(payload.get("startDate") or ""))
            location = payload.get("location") or {}
            address = location.get("address") or {}
            city = normalize_space(str(address.get("addressLocality") or ""))
            country = normalize_space(str(address.get("addressCountry") or ""))
            context["sale_location"] = ", ".join(part for part in [city, country] if part)
            break

        if not context["sale_title"] and soup.title:
            context["sale_title"] = normalize_space(soup.title.get_text(" ", strip=True).split("|", 1)[0])

        return context

    def _extract_sale_context_from_detail_page(self, soup: BeautifulSoup, source_url: str) -> dict[str, str]:
        sale_title = ""
        sale_code = self._extract_sale_code_from_url(source_url) or ""
        auction_details = soup.select_one(".auctiondetails")
        if auction_details:
            text = normalize_space(auction_details.get_text(" ", strip=True))
            sale_title = normalize_space(text.split(", Lot", 1)[0].strip(", "))
        if not sale_title and soup.title:
            title_parts = [part.strip() for part in normalize_space(soup.title.get_text(" ", strip=True)).split("|") if part.strip()]
            if len(title_parts) >= 2:
                sale_title = title_parts[1]
        return {
            "sale_code": sale_code,
            "sale_title": sale_title,
            "sale_date": "",
            "sale_location": "",
        }

    def _extract_title(self, soup: BeautifulSoup) -> str:
        title_node = soup.select_one(".w-100 h1.heading-title, .w-100 h1, h1.heading-title")
        if title_node is None:
            title_node = soup.find("h1")
        if title_node:
            return normalize_space(title_node.get_text(" ", strip=True))
        if soup.title:
            return normalize_space(soup.title.get_text(" ", strip=True).split("|", 1)[0])
        return ""

    def _extract_id_fields(self, soup: BeautifulSoup) -> dict[str, str]:
        fields: dict[str, str] = {}
        for block in soup.select("div.ids div.body-text--copy"):
            label_node = block.select_one(".idlabel")
            if label_node is None:
                continue
            label = normalize_space(label_node.get_text(" ", strip=True))
            if not label:
                continue
            raw_text = normalize_space(block.get_text(" ", strip=True))
            value = normalize_space(raw_text.removeprefix(label).lstrip("| ").strip())
            if value:
                fields[label] = value
        return fields

    def _extract_sold_price(self, soup: BeautifulSoup) -> str | None:
        for node in soup.select(".lot-header--detail-container p.body-text--copy, .lot-header--detail-container p"):
            text = normalize_space(node.get_text(" ", strip=True))
            if "| Sold" in text:
                return text
        full_text = normalize_space(soup.get_text(" ", strip=True))
        match = SOLD_PATTERN.search(full_text)
        if match:
            return normalize_space(match.group("value"))
        return None

    def _extract_lot_number(self, soup: BeautifulSoup, source_url: str) -> str | None:
        node = soup.select_one(".auctiondetails .lotnumber")
        if node:
            match = LOT_NUMBER_PATTERN.search(normalize_space(node.get_text(" ", strip=True)))
            if match:
                return match.group("value")
        text = normalize_space(soup.get_text(" ", strip=True))
        match = LOT_NUMBER_PATTERN.search(text)
        if match:
            return match.group("value")
        return urlparse(source_url).path.rstrip("/").split("/")[-1] or None

    def _extract_highlights(self, soup: BeautifulSoup) -> list[str]:
        container = soup.select_one(".lot-header--detail-container")
        if container is None:
            return []
        highlights: list[str] = []
        for item in container.select("ul.list-bullets li"):
            text = normalize_space(item.get_text(" ", strip=True))
            if text:
                highlights.append(text)
        return dedupe_preserving_order(highlights)

    def _extract_event_date(self, raw_value: str | None) -> tuple[date | None, str, int | None]:
        if raw_value:
            try:
                parsed = date.fromisoformat(raw_value)
            except ValueError:
                return parse_day_month_year(raw_value)
            return None, "year", parsed.year
        return None, "unknown", None

    def _extract_year_from_sale_title(self, sale_title: str | None) -> int | None:
        if not sale_title:
            return None
        match = re.search(r"\b(19|20)\d{2}\b", sale_title)
        return int(match.group(0)) if match else None

    def _extract_media(self, soup: BeautifulSoup) -> list[dict[str, str | None]]:
        urls: list[str] = []
        seen: set[str] = set()
        for image in soup.find_all("img"):
            source = (image.get("data-ngsrc") or image.get("src") or "").strip()
            if "cdn.rmsothebys.com" not in source:
                continue
            if source in seen:
                continue
            seen.add(source)
            urls.append(source)
        return [{"url": url, "media_type": "image/webp", "caption": None} for url in urls]

    def _extract_sale_code_from_url(self, source_url: str) -> str | None:
        path = urlparse(source_url).path
        for pattern in (LOT_PATH_PATTERN, SALE_PATH_PATTERN, LOT_RESULTS_PATH_PATTERN):
            match = pattern.match(path)
            if match:
                return match.groupdict().get("sale_code")
        return None

    def _build_source_reference(self, sale_title: str | None, lot_number: str | None) -> str | None:
        if sale_title and lot_number:
            return f"{sale_title} Lot {lot_number}"
        if sale_title:
            return sale_title
        if lot_number:
            return f"Lot {lot_number}"
        return None

    def _fallback_serial_number(self, source_url: str) -> str:
        slug = urlparse(source_url).path.rstrip("/").split("/")[-1]
        return slug or source_url


__all__ = ["RMSothebysScraper"]

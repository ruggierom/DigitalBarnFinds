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
    extract_year,
    infer_body_style,
    normalize_space,
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


LOT_PATH_PATTERN = re.compile(r"^/lot/(?P<slug>[^/?#]+)/?$", re.IGNORECASE)
AUCTION_PATH_PATTERN = re.compile(r"^/auction/(?P<slug>[^/?#]+)/?$", re.IGNORECASE)
LOT_NUMBER_PATTERN = re.compile(r"\bLot\s+(?P<value>\d+)\b", re.IGNORECASE)
CHASSIS_PATTERN = re.compile(r"^Chassis\s+(?P<value>.+?)(?:\s+Engine\b.*)?$", re.IGNORECASE)
ENGINE_PATTERN = re.compile(r"^Engine\s+(?P<value>.+)$", re.IGNORECASE)
SRCSET_CANDIDATE_PATTERN = re.compile(r"(?P<url>\S+)\s+\d+w")


class GoodingScraper(BaseScraper):
    source_key = "gooding"
    manifest = AdapterManifest(
        source_key="gooding",
        display_name="Gooding Christie's",
        base_url="https://www.goodingco.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="en",
        notes="Auction appearance archive with strong lot-result and chassis detail.",
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
        self.base_url = (base_url or settings.gooding_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.gooding_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.gooding_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.gooding_request_timeout_seconds
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
            raise ValueError("Gooding discovery fixture requires raw_html")
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
            raise ValueError("Gooding detail fixture requires raw_html")
        return self.parse_detail_html(fixture.raw_html, fixture.source_url)

    def parse_detail_html(self, html: str, source_url: str) -> ScrapedCarRecord:
        soup = BeautifulSoup(html, "html.parser")
        title = self._extract_title(soup)
        year_built, make, model = split_title(title)
        sale_title, sale_year = self._extract_sale_heading(soup)
        lot_number = self._extract_lot_number(soup, source_url)
        sold_price = self._extract_sold_price(soup)
        estimate = self._extract_estimate(soup)
        chassis_number = choose_serial(
            self._extract_chassis_number(soup),
            self._fallback_serial_number(source_url),
        )
        engine_number = self._extract_engine_number(soup)
        coachwork = self._extract_coachwork(soup)
        highlights = self._extract_highlights(soup)
        notes = " ".join(highlights) if highlights else "Parsed from Gooding Christie's auction lot page."
        drive_side = extract_drive_side(" ".join(highlights))
        body_style = infer_body_style(title, model, coachwork, notes, source_url)

        result_parts: list[str] = []
        if sold_price:
            result_parts.append(f"Sold {sold_price}")
        if estimate:
            result_parts.append(f"Estimate {estimate}")
        result = "; ".join(result_parts) or None

        event = NormalizedTimelineEvent(
            event_kind="event",
            event_date=None,
            event_date_precision="year" if sale_year is not None else "unknown",
            event_year=sale_year,
            payload={
                "event_name": sale_title or "Gooding Christie's auction result",
                "event_type": "auction_result",
                "car_number": lot_number,
                "result": result,
                "location": None,
            },
            source_reference=self._build_source_reference(sale_title, lot_number),
        )

        attributes = build_attribute_map(
            {"auction_house": "Gooding Christie's", "source_heading": title},
            sale_title=sale_title,
            sale_year=sale_year,
            sold_price=sold_price,
            estimate=estimate,
            engine_number=engine_number,
            coachwork=coachwork,
            lot_number=lot_number,
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
                self._log(f"Gooding request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"Gooding request failed with no exception for {url}")
        raise last_error

    def _extract_lot_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = (anchor.get("href") or "").strip()
            if not LOT_PATH_PATTERN.match(urlparse(urljoin(f"{self.base_url}/", href)).path):
                continue
            urls.append(urljoin(f"{self.base_url}/", href.lstrip("/")))
        return dedupe_preserving_order(urls)

    def _extract_title(self, soup: BeautifulSoup) -> str:
        heading = soup.select_one("[class*=vehicleDetails-module--mainHeading]") or soup.find("h1")
        if heading:
            return normalize_space(heading.get_text(" ", strip=True))
        if soup.title:
            return normalize_space(soup.title.get_text(" ", strip=True).split("|", 1)[0])
        return ""

    def _extract_sale_heading(self, soup: BeautifulSoup) -> tuple[str | None, int | None]:
        modal = soup.select_one("[class*=vehicleDetails-module--modal]")
        if modal:
            year_text = normalize_space(" ".join(node.get_text(" ", strip=True) for node in modal.select("h2")))
            sale_title = normalize_space(" ".join(node.get_text(" ", strip=True) for node in modal.select("a")))
            return sale_title or None, extract_year(year_text)
        if soup.title:
            title_text = normalize_space(soup.title.get_text(" ", strip=True))
            parts = [part.strip() for part in title_text.split("|") if part.strip()]
            if len(parts) >= 2:
                return parts[1], extract_year(parts[1])
        return None, None

    def _extract_lot_number(self, soup: BeautifulSoup, source_url: str) -> str | None:
        for heading in soup.find_all(["h1", "h2", "h3"]):
            text = normalize_space(heading.get_text(" ", strip=True))
            match = LOT_NUMBER_PATTERN.search(text)
            if match:
                return match.group("value")
        return urlparse(source_url).path.rstrip("/").split("/")[-1] or None

    def _extract_sold_price(self, soup: BeautifulSoup) -> str | None:
        for block in soup.select("[class*=vehicleDetails-module--specification]"):
            text = normalize_space(block.get_text(" ", strip=True))
            if text.startswith("SOLD "):
                return normalize_space(text.removeprefix("SOLD "))
        return None

    def _extract_estimate(self, soup: BeautifulSoup) -> str | None:
        for block in soup.select("[class*=vehicleDetails-module--specification]"):
            text = normalize_space(block.get_text(" ", strip=True))
            if text.startswith("Estimate "):
                return normalize_space(text.removeprefix("Estimate "))
        return None

    def _extract_chassis_number(self, soup: BeautifulSoup) -> str | None:
        for block in soup.select("[class*=vehicleDetails-module--specification]"):
            text = normalize_space(block.get_text(" ", strip=True))
            match = CHASSIS_PATTERN.match(text)
            if match:
                return normalize_space(match.group("value").replace("(VIN)", "").strip())
        return None

    def _extract_engine_number(self, soup: BeautifulSoup) -> str | None:
        for block in soup.select("[class*=vehicleDetails-module--specification]"):
            text = normalize_space(block.get_text(" ", strip=True))
            match = ENGINE_PATTERN.match(text)
            if match:
                return normalize_space(match.group("value"))
        return None

    def _extract_coachwork(self, soup: BeautifulSoup) -> str | None:
        owner_block = soup.select_one("[class*=vehicleDetails-module--owner]")
        if not owner_block:
            return None
        return normalize_space(owner_block.get_text(" ", strip=True)) or None

    def _extract_highlights(self, soup: BeautifulSoup) -> list[str]:
        section = soup.select_one("[class*=vehicleDetails-module--details]")
        if section is None:
            return []
        highlights: list[str] = []
        for node in section.find_all(["li", "p"]):
            text = normalize_space(node.get_text(" ", strip=True))
            if not text or text.lower() in {"car highlights", "technical specs"}:
                continue
            highlights.append(text)
        return dedupe_preserving_order(highlights)

    def _extract_media(self, soup: BeautifulSoup) -> list[dict[str, str | None]]:
        media_by_key: dict[str, str] = {}
        for image in soup.find_all(["img", "source"]):
            candidates = self._extract_image_candidates(image)

            for source in candidates:
                absolute = urljoin(f"{self.base_url}/", source)
                if "media.goodingco.com" not in absolute:
                    continue
                if (
                    "/static/" in absolute
                    or "badge" in absolute
                    or "q_10,w_10" in absolute
                    or "/v1/" not in absolute
                ):
                    continue
                key = absolute.split("/v1/", 1)[-1]
                existing = media_by_key.get(key)
                if existing is None or self._media_score(absolute) > self._media_score(existing):
                    media_by_key[key] = absolute

        return [
            {"url": url, "media_type": "image/jpeg", "caption": None}
            for url in media_by_key.values()
        ]

    def _media_score(self, value: str) -> tuple[int, int]:
        return (0 if "q_10,w_10" in value else 1, len(value))

    def _extract_image_candidates(self, image: BeautifulSoup) -> list[str]:
        candidates: list[str] = []
        for attribute in ("src", "data-src", "data-original"):
            source = normalize_space((image.get(attribute) or "").strip())
            if source:
                candidates.append(source)

        srcset = image.get("srcset") or image.get("data-srcset") or ""
        for match in SRCSET_CANDIDATE_PATTERN.finditer(srcset):
            candidate = match.group("url").lstrip(",")
            if candidate:
                candidates.append(candidate)
        return candidates

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


__all__ = ["GoodingScraper"]

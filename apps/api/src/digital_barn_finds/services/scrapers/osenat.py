from __future__ import annotations

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
    extract_labeled_value,
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


LOT_PATH_PATTERN = re.compile(r"^/lot/(?P<sale_id>\d+)/(?P<lot_id>\d+)(?:-[^/?#]+)?/?$", re.IGNORECASE)
CHASSIS_PATTERN = re.compile(
    r"\b(?:Num[ée]ro de s[ée]rie|N(?:°|\.)\s*de s[ée]rie|Ch[âa]ssis(?:\s+(?:No\.?|num[ée]ro|number))?|Chassis(?:\s+(?:No\.?|number))?|Serial number|VIN)\b\s*:?\s*(?P<value>[A-Za-z0-9./ -]+)",
    re.IGNORECASE,
)
ENGINE_PATTERN = re.compile(
    r"\b(?:Moteur\s+(?:No\.?|num[ée]ro)|Engine number)\b\s*:?\s*(?P<value>[A-Za-z0-9./ -]+)",
    re.IGNORECASE,
)
REGISTRATION_PATTERN = re.compile(
    r"(?:Carte grise [^\n]+|Titre de circulation [^\n]+|French registration [^\n]+)",
    re.IGNORECASE,
)
LOT_NUMBER_PATTERN = re.compile(r"\bLot\s+(?P<value>\d+)\b", re.IGNORECASE)
CHASSIS_LABELS = (
    "Numéro de série",
    "N° de série",
    "N. de série",
    "Châssis numéro",
    "Châssis numero",
    "Châssis No",
    "Châssis No.",
    "Châssis",
    "Chassis",
    "Chassis number",
    "Chassis No",
    "Chassis No.",
    "Serial number",
)
ENGINE_LABELS = (
    "Moteur numéro",
    "Moteur numero",
    "Moteur No",
    "Moteur No.",
    "Engine number",
)


class OsenatScraper(BaseScraper):
    source_key = "osenat"
    manifest = AdapterManifest(
        source_key="osenat",
        display_name="Osenat Automobiles",
        base_url="https://www.osenat.com",
        supported_detail_fixture_types=[FixtureType.DETAIL_PAGE],
        supported_discovery_fixture_types=[FixtureType.SEARCH_RESULTS],
        language="fr",
        notes="French auction archive with chassis-rich catalogue entries and realized prices.",
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
        self.base_url = (base_url or settings.osenat_base_url).rstrip("/")
        self.seed_paths = seed_paths or settings.osenat_seed_paths
        self.delay_seconds = settings.request_delay_seconds if delay_seconds is None else delay_seconds
        self.max_attempts = settings.osenat_max_attempts if max_attempts is None else max_attempts
        effective_user_agent = user_agent or settings.effective_user_agent
        self.client = client or httpx.Client(
            headers={"User-Agent": effective_user_agent},
            follow_redirects=True,
            timeout=(
                settings.osenat_request_timeout_seconds
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
            raise ValueError("Osenat discovery fixture requires raw_html")
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
            raise ValueError("Osenat detail fixture requires raw_html")
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
        context = self._extract_context(soup, page_text)
        if sale_context:
            context.update({key: value for key, value in sale_context.items() if value})

        raw_title = self._extract_title(soup)
        year_built, make, model = split_title(self._clean_title(raw_title))
        chassis_number = self._extract_chassis_number(page_text, source_url)
        engine_number = self._extract_engine_number(page_text)
        registration_match = REGISTRATION_PATTERN.search(page_text)
        registration = normalize_space(registration_match.group(0)) if registration_match else None
        sold = self._extract_result(page_text)
        estimate = self._extract_estimate(page_text)
        lot_number = extract_first_match(LOT_NUMBER_PATTERN, page_text)
        transmission = extract_semantic_value(page_text, "transmission")
        interior_color = extract_semantic_value(page_text, "interior_color")
        exterior_color = extract_semantic_value(page_text, "exterior_color")
        odometer = extract_semantic_value(page_text, "odometer")
        drive_side = extract_drive_side(page_text)
        body_style = infer_body_style(raw_title, model, source_url)
        event_name = context.get("sale_title") or "Osenat auction appearance"
        event_date, event_date_precision, event_year = parse_day_month_year(context.get("sale_date") or event_name)
        if event_year is None:
            event_year = extract_year(page_text) or extract_year(source_url)

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
            {"auction_house": "Osenat", "source_heading": self._clean_title(raw_title)},
            sale_id=self._extract_sale_id(source_url),
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
                notes="Parsed from Osenat auction lot page.",
                attributes=attributes,
            ),
            custody_events=[],
            car_events=[event],
            media=collect_image_media(
                soup,
                base_url=self.base_url,
                allow_substrings=("/uploads/", "osenat.com/lot/", "cdn.drouot.com/d/image/lot"),
                deny_substrings=("logo", "icon", "picto", "facebook", "instagram"),
                strip_query=False,
            ),
        )

    def _request(self, method: str, url: str) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                return self.client.request(method, url)
            except httpx.HTTPError as exc:
                last_error = exc
                self._log(f"Osenat request failed ({attempt}/{self.max_attempts}) for {url}: {exc}")
                if attempt < self.max_attempts:
                    time.sleep(self.delay_seconds)
        if last_error is None:
            raise RuntimeError(f"Osenat request failed with no exception for {url}")
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
        cleaned = re.sub(r"\s*-\s*Lot\s+\d+\s*$", "", title, flags=re.IGNORECASE)
        return normalize_space(cleaned)

    def _extract_context(self, soup: BeautifulSoup, page_text: str) -> dict[str, str]:
        sale_title = extract_semantic_value(page_text, "sale_title")
        sale_date = extract_semantic_value(page_text, "sale_date")
        sale_location = extract_semantic_value(page_text, "sale_location")
        if not sale_title:
            anchor = soup.find("a", href=lambda value: value and "/vente/" in value.lower())
            if anchor:
                sale_title = normalize_space(anchor.get_text(" ", strip=True))
        if not sale_date:
            match = re.search(r"\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4}", normalize_space(page_text))
            if match:
                sale_date = match.group(0)
        return {
            "sale_title": sale_title or "",
            "sale_date": sale_date or "",
            "sale_location": sale_location or "",
        }

    def _extract_estimate(self, page_text: str) -> str | None:
        value = extract_semantic_value(page_text, "estimate")
        return normalize_money_text(value) if value else None

    def _extract_result(self, page_text: str) -> str | None:
        value = extract_semantic_value(page_text, "sold_price")
        return normalize_money_text(value) if value else None

    def _extract_sale_id(self, source_url: str) -> str | None:
        match = LOT_PATH_PATTERN.match(urlparse(source_url).path)
        return match.group("sale_id") if match else None

    def _build_sourceReference(self, sale_title: str | None, lot_number: str | None) -> str | None:
        if sale_title and lot_number:
            return f"{sale_title} / Lot {lot_number}"
        if sale_title:
            return sale_title
        if lot_number:
            return f"Lot {lot_number}"
        return None

    def _build_source_reference(self, sale_title: str | None, lot_number: str | None) -> str | None:
        return self._build_sourceReference(sale_title, lot_number)

    def _fallback_serial_number(self, source_url: str) -> str:
        match = LOT_PATH_PATTERN.match(urlparse(source_url).path)
        if not match:
            return f"osenat-{urlparse(source_url).path.strip('/').replace('/', '-') or 'unknown'}"
        return f"osenat-sale-{match.group('sale_id')}-item-{match.group('lot_id')}"

    def _extract_chassis_number(self, page_text: str, source_url: str) -> str:
        for candidate in (
            extract_labeled_value(page_text, CHASSIS_LABELS),
            extract_first_match(CHASSIS_PATTERN, page_text),
            self._extract_slug_serial_number(source_url),
        ):
            normalized = self._normalize_identifier_candidate(candidate, allow_short=True)
            if normalized:
                if candidate == self._extract_slug_serial_number(source_url):
                    return choose_serial(normalized, self._fallback_serial_number(source_url))
                return normalized
        return self._fallback_serial_number(source_url)

    def _extract_engine_number(self, page_text: str) -> str | None:
        for candidate in (
            extract_labeled_value(page_text, ENGINE_LABELS),
            extract_first_match(ENGINE_PATTERN, page_text),
        ):
            normalized = self._normalize_identifier_candidate(
                candidate,
                allow_short=True,
                require_digit=True,
            )
            if normalized:
                return normalized
        return None

    def _extract_slug_serial_number(self, source_url: str) -> str | None:
        path = urlparse(source_url).path
        slug = path.rsplit("/", 1)[-1].lower()
        if not slug:
            return None

        stop_tokens = {
            "allemand",
            "allemande",
            "appartenant",
            "belge",
            "belgique",
            "carte",
            "collection",
            "depuis",
            "etranger",
            "famille",
            "french",
            "francais",
            "francaise",
            "français",
            "française",
            "immatriculation",
            "meme",
            "moteur",
            "numero",
            "sur",
            "titre",
            "type",
            "vendu",
            "vendue",
        }
        markers = ("chassis-numero", "chassis-ndeg", "chassis", "numero-de-serie", "ndeg-de-serie")

        for marker in markers:
            marker_token = f"-{marker}-"
            index = slug.find(marker_token)
            if index == -1:
                continue
            tail = slug[index + len(marker_token) :]
            parts = [part for part in tail.split("-") if part]
            candidate_parts: list[str] = []
            for part in parts:
                if part in stop_tokens:
                    break
                if not re.fullmatch(r"[a-z0-9]{1,20}", part):
                    break
                candidate_parts.append(part)
            candidate = "-".join(candidate_parts).strip("-")
            normalized = "".join(character for character in candidate if character.isalnum())
            if len(normalized) >= 4:
                return candidate.upper()
        return None

    def _normalize_identifier_candidate(
        self,
        value: str | None,
        *,
        allow_short: bool = False,
        require_digit: bool = False,
    ) -> str | None:
        cleaned = normalize_space(value or "").strip(" ,;:/-")
        cleaned = re.sub(r"^(?:n(?:°|o|\.?)|num[ée]ro)\s+", "", cleaned, flags=re.IGNORECASE)
        normalized = "".join(character for character in cleaned if character.isalnum()).lower()
        if not normalized:
            return None
        if require_digit and not any(character.isdigit() for character in normalized):
            return None
        if len(normalized) < 4 and not allow_short:
            return None
        if len(normalized) < 4 and allow_short and not any(character.isdigit() for character in normalized):
            return None
        if normalized in {"num", "numero", "ndeg", "serie", "serial", "number", "vin"}:
            return None
        return cleaned

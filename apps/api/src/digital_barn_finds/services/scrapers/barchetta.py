from __future__ import annotations

import re
import time
from datetime import date
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlencode, urljoin, urlparse
from xml.etree import ElementTree as ET

import httpx
from bs4 import BeautifulSoup

from digital_barn_finds.config import get_settings
from digital_barn_finds.services.scrapers.base import (
    BaseScraper,
    NormalizedCar,
    NormalizedTimelineEvent,
    ScrapedCarRecord,
)


class BarchettaScraper(BaseScraper):
    source_key = "barchetta"

    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.barchetta_base_url.replace("https://www.barchetta.cc", "http://www.barchetta.cc")
        self.discovery_base_urls = list(
            dict.fromkeys(
                [
                    self.base_url.rstrip("/") + "/",
                    "http://www.barchetta.cc/",
                    "https://www.barchetta.cc/",
                    "http://barchetta.cc/",
                    "https://barchetta.cc/",
                ]
            )
        )
        self.delay_seconds = settings.request_delay_seconds
        self.seed_paths = settings.barchetta_seed_paths
        user_agent = settings.effective_user_agent
        print(f"BarchettaScraper using User-Agent: {user_agent}")
        print(f"BarchettaScraper discovery paths: {self.seed_paths}")
        print(f"BarchettaScraper discovery bases: {self.discovery_base_urls}")
        self.max_attempts = 3
        self.client = httpx.Client(
            headers={"User-Agent": user_agent},
            follow_redirects=True,
            timeout=30.0,
        )

    def crawl(self, *, full: bool) -> list[str]:
        detail_links: list[str] = []
        seed_paths = self.seed_paths if full else self.seed_paths[:1]
        for path in seed_paths:
            path_links: list[str] = []
            for base_url in self.discovery_base_urls:
                url = urljoin(base_url, path)
                try:
                    response = self._request("GET", url)
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code in {403, 404}:
                        status = "blocked" if exc.response.status_code == 403 else "missing"
                        print(f"BarchettaScraper skipping {status} discovery path: {url}")
                        continue
                    raise
                except httpx.HTTPError as exc:
                    print(f"BarchettaScraper skipping errored discovery path: {url} ({exc})")
                    continue

                extracted_links = self._extract_detail_links(response.text)
                if extracted_links:
                    path_links.extend(extracted_links)
                    if base_url != self.discovery_base_urls[0]:
                        print(
                            f"BarchettaScraper discovered {len(extracted_links)} links via alternate base: {url}"
                        )
                    break

                print(f"BarchettaScraper found 0 detail links at discovery path: {url}")

            detail_links.extend(path_links)
            time.sleep(self.delay_seconds)
        return sorted(set(detail_links))

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        response = self._request("GET", url)
        response.raise_for_status()
        record = self.parse_detail_html(response.text, url)
        soup = BeautifulSoup(response.text, "html.parser")

        for iframe_url in self._extract_media_iframe_urls(soup, record.source_url):
            try:
                self._merge_media(
                    record.media,
                    self._query_mediacenter_images(iframe_url),
                )
                iframe_response = self._request("GET", iframe_url)
                iframe_response.raise_for_status()
                iframe_soup = BeautifulSoup(iframe_response.text, "html.parser")
                self._merge_media(
                    record.media,
                    self._parse_media(iframe_soup, iframe_url, iframe_url),
                )
                time.sleep(self.delay_seconds)
            except httpx.HTTPError as exc:
                print(f"BarchettaScraper media iframe fetch failed for {iframe_url}: {exc}")

        time.sleep(self.delay_seconds)
        return record

    def parse_detail_file(self, path: str | Path) -> ScrapedCarRecord:
        file_path = Path(path)
        html = _read_fixture_text(file_path)
        return self.parse_detail_html(html, file_path.as_uri())

    def parse_detail_html(self, html: str, source_url: str) -> ScrapedCarRecord:
        soup = BeautifulSoup(html, "html.parser")

        title = soup.title.string.strip() if soup.title and soup.title.string else "Unknown"
        canonical_url = self._extract_saved_url(html) or source_url
        heading = self._extract_heading(soup)
        summary = self._extract_summary_metadata(soup)
        serial_number = self._extract_serial(canonical_url, title, heading)
        make, model = self._extract_make_and_model(canonical_url, title, heading, summary)

        return ScrapedCarRecord(
            source_url=canonical_url,
            car=NormalizedCar(
                serial_number=summary.get("serial_number") or serial_number,
                make=summary.get("make") or make,
                model=summary.get("model") or model,
                year_built=_int_or_none(summary.get("year_built")),
                build_date=summary.get("build_date"),
                build_date_precision=_string_or_none(summary.get("build_date_precision")),
                drive_side=_string_or_none(summary.get("drive_side")),
                original_color=_string_or_none(summary.get("original_color")),
                notes="Parsed from saved Barchetta detail page.",
                attributes={
                    key: value
                    for key, value in {
                        "build_date_label": summary.get("build_date_label"),
                        "source_heading": summary.get("heading_text"),
                    }.items()
                    if value
                },
            ),
            custody_events=self._parse_custody_events(soup),
            car_events=self._parse_car_events(soup),
            media=self._parse_media(soup, canonical_url, source_url),
        )

    def _extract_media_iframe_urls(self, soup: BeautifulSoup, canonical_url: str) -> list[str]:
        urls: list[str] = []
        seen: set[str] = set()
        for iframe in soup.find_all("iframe", src=True):
            src = iframe["src"].strip()
            if "mediacenter" not in src.lower():
                continue
            resolved = urljoin(canonical_url, src)
            if resolved in seen:
                continue
            seen.add(resolved)
            urls.append(resolved)
        return urls

    def _merge_media(
        self,
        existing: list[dict[str, str | None]],
        additional: list[dict[str, str | None]],
    ) -> None:
        seen = {str(item.get("url")) for item in existing if item.get("url")}
        for item in additional:
            url = str(item.get("url") or "")
            if not url or url in seen:
                continue
            seen.add(url)
            existing.append(item)

    def _extract_detail_links(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        links: list[str] = []
        seen: set[str] = set()
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            if "Detail/" in href and href.lower().endswith(".htm"):
                resolved = urljoin(self.base_url, href)
                if resolved not in seen:
                    seen.add(resolved)
                    links.append(resolved)

        # Some Barchetta pages render malformed or partial anchor markup in production.
        # A raw HTML pass keeps discovery working when BeautifulSoup misses links.
        for match in re.findall(
            r"""https?://(?:www\.)?barchetta\.cc/english/(?:All|all)\.ferraris/Detail/[^"'\\s<>]+?\.htm""",
            html,
            flags=re.IGNORECASE,
        ):
            resolved = urljoin(self.base_url, match)
            if resolved not in seen:
                seen.add(resolved)
                links.append(resolved)
        for match in re.findall(
            r"""(?:href=)?["']?((?:\.\./)+english/(?:All|all)\.ferraris/Detail/[^"'\\s<>]+?\.htm)""",
            html,
            flags=re.IGNORECASE,
        ):
            resolved = urljoin(self.base_url, match)
            if resolved not in seen:
                seen.add(resolved)
                links.append(resolved)
        return links

    def _extract_serial(self, url: str, title: str, heading: str | None) -> str:
        decoded_url = unquote(url)
        match = re.search(r"/Detail/([^./]+)", url)
        if match:
            return match.group(1)
        for text in (heading, title, decoded_url):
            if not text:
                continue
            title_match = re.search(r"s/n\s+([A-Za-z0-9]+)", text, re.IGNORECASE)
            if title_match:
                return title_match.group(1)
        file_match = re.search(r"([^/]+)\.html?$", decoded_url, re.IGNORECASE)
        if file_match:
            candidate = file_match.group(1)
            candidate = re.sub(r"\s+s[_/]n\s+", " ", candidate, flags=re.IGNORECASE)
            maybe_serial = re.search(r"([A-Za-z0-9]+)$", candidate)
            if maybe_serial:
                return maybe_serial.group(1)
        return title.split()[0]

    def _extract_make_and_model(
        self, url: str, title: str, heading: str | None, summary: dict[str, object] | None = None
    ) -> tuple[str, str]:
        if summary:
            make = _string_or_none(summary.get("make"))
            model = _string_or_none(summary.get("model"))
            if make and model:
                return make, model
        combined = " ".join(part for part in [heading, title, unquote(url)] if part)
        lowered = combined.lower()
        if "ferrari" in lowered:
            source_text = heading or title or combined
            model = re.sub(r"(?i)\bferrari\b", "", source_text).strip()
            model = re.sub(r"(?i)s/n\s+[A-Za-z0-9]+", "", model).strip(" -")
            return "Ferrari", _normalize_whitespace(model) or "Unknown"
        if "maserati" in lowered:
            source_text = heading or title or combined
            model = re.sub(r"(?i)\bmaserati\b", "", source_text).strip()
            model = re.sub(r"(?i)s/n\s+[A-Za-z0-9]+", "", model).strip(" -")
            return "Maserati", _normalize_whitespace(model) or "Unknown"
        if "alfa" in lowered:
            source_text = heading or title or combined
            model = re.sub(r"(?i)s/n\s+[A-Za-z0-9]+", "", source_text).strip(" -")
            return "Alfa Romeo", _normalize_whitespace(model) or "Unknown"
        if "fiat" in lowered:
            source_text = heading or title or combined
            model = re.sub(r"(?i)\bfiat\b", "", source_text).strip()
            model = re.sub(r"(?i)s/n\s+[A-Za-z0-9]+", "", model).strip(" -")
            return "Fiat", _normalize_whitespace(model) or "Unknown"
        if ".ferraris/" in lowered or "all.ferraris" in lowered:
            model = re.sub(r"(?i)s/n\s+[A-Za-z0-9]+", "", title).strip(" -")
            return "Ferrari", _normalize_whitespace(model) or "Unknown"
        return "Unknown", _normalize_whitespace(re.sub(r"(?i)s/n\s+[A-Za-z0-9]+", "", title).strip()) or "Unknown"

    def _extract_summary_metadata(self, soup: BeautifulSoup) -> dict[str, object]:
        summary_nodes = []
        for node in soup.find_all("dt", limit=12):
            text = _normalize_whitespace(node.get_text(" ", strip=True))
            if text:
                summary_nodes.append(text)

        if len(summary_nodes) < 3:
            return {}

        heading_text = summary_nodes[0]
        primary_line = summary_nodes[1]
        model_line = summary_nodes[2]
        color_line = summary_nodes[3] if len(summary_nodes) > 3 else ""

        summary: dict[str, object] = {"heading_text": heading_text}
        primary_match = re.match(
            r"(?P<serial>[A-Za-z0-9]+)\s+(?P<build>\d{4}(?:/[a-z]{3}(?:/\d{1,2})?)?)",
            primary_line,
            re.IGNORECASE,
        )
        if primary_match:
            build_text = primary_match.group("build")
            build_date, build_precision, build_year = _parse_barchetta_date(build_text)
            summary["serial_number"] = primary_match.group("serial")
            summary["build_date"] = build_date
            summary["build_date_precision"] = build_precision
            summary["build_date_label"] = build_text
            summary["year_built"] = build_year

        drive_side = None
        if model_line:
            line_parts = [part.strip() for part in model_line.split(",") if part.strip()]
            first_part = line_parts[0] if line_parts else model_line
            if first_part.lower().startswith("ferrari "):
                summary["make"] = "Ferrari"
                summary["model"] = _normalize_whitespace(first_part.removeprefix("Ferrari").strip()) or "Unknown"
            elif first_part.lower().startswith("maserati "):
                summary["make"] = "Maserati"
                summary["model"] = _normalize_whitespace(first_part.removeprefix("Maserati").strip()) or "Unknown"
            elif first_part.lower().startswith("alfa romeo "):
                summary["make"] = "Alfa Romeo"
                summary["model"] = _normalize_whitespace(first_part.removeprefix("Alfa Romeo").strip()) or "Unknown"
            elif first_part.lower().startswith("fiat "):
                summary["make"] = "Fiat"
                summary["model"] = _normalize_whitespace(first_part.removeprefix("Fiat").strip()) or "Unknown"
            if len(line_parts) > 1 and line_parts[-1].upper() in {"LHD", "RHD"}:
                drive_side = line_parts[-1].upper()
        summary["drive_side"] = drive_side

        if color_line and color_line.upper() not in {"LHD", "RHD"}:
            summary["original_color"] = color_line

        return summary

    def _extract_saved_url(self, html: str) -> str | None:
        match = re.search(r"saved from url=\(\d+\)(https?://[^\s>]+)", html, re.IGNORECASE)
        if match:
            return match.group(1)
        return None

    def _extract_heading(self, soup: BeautifulSoup) -> str | None:
        for node in soup.find_all(["dt", "h1", "h2"], limit=12):
            text = node.get_text(" ", strip=True)
            if not text or text == "\xa0":
                continue
            if "s/n" in text.lower() or text.lower().startswith("ferrari "):
                return text
        return None

    def _parse_custody_events(self, soup: BeautifulSoup) -> list[NormalizedTimelineEvent]:
        table = self._find_timeline_table(soup)
        if table is None:
            return []

        events: list[NormalizedTimelineEvent] = []
        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = row.find_all("td")
            if not cells:
                continue

            if len(cells) >= 2 and _is_custody_row(cells):
                main_text = _normalize_whitespace(cells[0].get_text(" ", strip=True))
                source_reference = _normalize_whitespace(cells[-1].get_text(" ", strip=True)) or None
                parsed_date, precision, year = _parse_barchetta_date(main_text)
                owner_name = _extract_owner_name(main_text)
                events.append(
                    NormalizedTimelineEvent(
                        event_kind="custody",
                        event_date=parsed_date,
                        event_date_precision=precision,
                        event_year=year,
                        source_reference=source_reference,
                        payload={
                            "owner_name": owner_name,
                            "transaction_notes": main_text,
                            "location": None,
                        },
                    )
                )
        return events

    def _parse_car_events(self, soup: BeautifulSoup) -> list[NormalizedTimelineEvent]:
        table = self._find_timeline_table(soup)
        if table is None:
            return []

        events: list[NormalizedTimelineEvent] = []
        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = row.find_all("td")
            if not cells:
                continue

            if len(cells) == 6 and not _is_colspan_row(cells):
                date_text = _normalize_whitespace(cells[0].get_text(" ", strip=True))
                result_text = _normalize_whitespace(cells[1].get_text(" ", strip=True)) or None
                event_name = _normalize_whitespace(cells[2].get_text(" ", strip=True)) or None
                driver = _normalize_whitespace(cells[3].get_text(" ", strip=True)) or None
                car_number = _normalize_whitespace(cells[4].get_text(" ", strip=True)) or None
                reference = _normalize_whitespace(cells[5].get_text(" ", strip=True)) or None
                parsed_date, precision, year = _parse_barchetta_date(date_text)
                events.append(
                    NormalizedTimelineEvent(
                        event_kind="event",
                        event_date=parsed_date,
                        event_date_precision=precision,
                        event_year=year,
                        source_reference=reference,
                        payload={
                            "event_name": event_name,
                            "event_type": _classify_event_type(event_name, result_text),
                            "driver": driver,
                            "car_number": car_number,
                            "result": result_text,
                            "location": _extract_location_from_event(event_name),
                        },
                    )
                )
                continue

            if len(cells) >= 2 and _is_narrative_row(cells):
                main_text = _normalize_whitespace(cells[0].get_text(" ", strip=True))
                source_reference = _normalize_whitespace(cells[-1].get_text(" ", strip=True)) or None
                parsed_date, precision, year = _parse_barchetta_date(main_text)
                events.append(
                    NormalizedTimelineEvent(
                        event_kind="event",
                        event_date=parsed_date,
                        event_date_precision=precision,
                        event_year=year,
                        source_reference=source_reference,
                        payload={
                            "event_name": main_text,
                            "event_type": _classify_event_type(main_text, None),
                            "driver": None,
                            "car_number": None,
                            "result": None,
                            "location": _extract_location_from_event(main_text),
                        },
                    )
                )
        return events

    def _find_timeline_table(self, soup: BeautifulSoup) -> BeautifulSoup | None:
        for table in soup.find_all("table"):
            headers = [
                _normalize_whitespace(cell.get_text(" ", strip=True)).lower()
                for cell in table.find_all("td", limit=6)
            ]
            if headers[:6] == ["date", "result", "event", "driver", "#", "reference"]:
                return table
        return None

    def _parse_media(
        self, soup: BeautifulSoup, canonical_url: str, source_url: str
    ) -> list[dict[str, str | None]]:
        media: list[dict[str, str | None]] = []
        seen: set[str] = set()

        for image in soup.find_all("img", src=True):
            src = image["src"].strip()
            if not _looks_like_car_image(src):
                continue
            url = _resolve_media_src(src, canonical_url, source_url)
            caption = _normalize_whitespace(image.get("alt", "")) or None
            if _is_generic_registry_image(url, caption):
                continue
            if url in seen:
                continue
            seen.add(url)
            media.append(
                {
                    "media_type": "photo",
                    "url": url,
                    "caption": caption,
                }
            )

        self._append_mediacenter_media(media, seen, soup, canonical_url)

        if source_url.startswith("file://"):
            fixture_path = Path(unquote(source_url.removeprefix("file://")))
            fixture_dir = fixture_path.with_name(f"{fixture_path.stem}_files")
            if fixture_dir.exists():
                for file_path in sorted(fixture_dir.iterdir()):
                    if not file_path.is_file() or not _looks_like_car_image(file_path.name):
                        continue
                    url = file_path.as_uri()
                    if url in seen:
                        continue
                    seen.add(url)
                    media.append(
                        {
                            "media_type": "photo",
                            "url": url,
                            "caption": file_path.stem.replace("_", " "),
                        }
                    )

        return media

    def _append_mediacenter_media(
        self,
        media: list[dict[str, str | None]],
        seen: set[str],
        soup: BeautifulSoup,
        canonical_url: str,
    ) -> None:
        for meta_name in ("og:image", "twitter:image"):
            for tag in soup.find_all("meta", attrs={"property": meta_name}) + soup.find_all(
                "meta", attrs={"name": meta_name}
            ):
                content = tag.get("content", "").strip()
                caption = _extract_mediacenter_caption(soup) or None
                if (
                    not content
                    or content in seen
                    or not _looks_like_car_image(content)
                    or _is_generic_registry_image(content, caption)
                ):
                    continue
                seen.add(content)
                media.append(
                    {
                        "media_type": "photo",
                        "url": content,
                        "caption": caption,
                    }
                )

        for node in soup.find_all(attrs={"data-imgsrc": True}):
            src = node.get("data-imgsrc", "").strip()
            if not src:
                continue
            url = urljoin(canonical_url, src)
            if url in seen or not _looks_like_car_image(url):
                continue
            seen.add(url)
            caption = _normalize_whitespace(
                node.get("data-description") or node.get("data-title") or ""
            ) or None
            if _is_generic_registry_image(url, caption):
                continue
                media.append(
                    {
                        "media_type": "photo",
                        "url": url,
                        "caption": caption,
                    }
                )

    def _query_mediacenter_images(self, iframe_url: str) -> list[dict[str, str | None]]:
        parsed = urlparse(iframe_url)
        mediacenter_host = parsed.netloc.replace(".pro", ".plus")
        params = parse_qs(parsed.query)
        dir_id = _first_int(params.get("dir"))
        root_dir_id = _first_int(params.get("rd"))
        search_ft = _first_value(params.get("ft"))
        search_sort = _first_value(params.get("so"))
        if dir_id is None or root_dir_id is None or not search_ft:
            return []

        service_url = (
            f"{parsed.scheme}://{mediacenter_host}/Community/CommunityService.asmx/QueryMoreImagesFiltered"
        )
        search_query = parsed.query
        if search_query:
            search_query = f"?{search_query}"
        search_filter = search_ft.removeprefix("search.").replace("+", " ")
        display_dirs = _first_value(params.get("flat"), "").lower() != "true"
        flat_dir_id = dir_id if _first_value(params.get("flat"), "").lower() == "true" else -1
        search_options = f"so={search_sort}" if search_sort else "*"

        offset = 0
        page_size = 100
        total_items: int | None = None
        media: list[dict[str, str | None]] = []
        seen: set[str] = set()

        while total_items is None or offset < total_items:
            payload = {
                "sQueryString": search_query,
                "lDirID": dir_id,
                "lOffset": offset,
                "nCount": page_size,
                "lRootDirID": root_dir_id,
                "lFlatDirID": flat_dir_id,
                "bDisplayDirs": display_dirs,
                "queryFT": search_ft,
                "nFileTypes": 11111,
                "strSearchOptions": search_options,
                "Filter": search_filter,
                "FilterAny": "",
                "FilterExact": "",
                "nMaxThumbWidth": 1200,
                "nMaxThumbHeight": 60000,
                "nMaxHoverWidth": 1600,
                "nMaxHoverHeight": 60000,
                "bFullInfo": False,
            }
            response = self._request("POST", service_url, json=payload)
            response.raise_for_status()
            xml_text = response.text.strip()
            if not xml_text:
                break

            root = ET.fromstring(xml_text)
            info = root.find("Info")
            if info is None:
                break

            try:
                total_items = int(info.attrib.get("Items", "0"))
            except ValueError:
                total_items = 0

            images = root.findall("Image")
            if not images:
                break

            for image in images:
                image_id = image.attrib.get("ID")
                image_dir_id = image.attrib.get("dirID") or str(dir_id)
                version = image.attrib.get("Vs", "1")
                orig_width = _int_or_zero(image.attrib.get("OrigWidth"))
                orig_height = _int_or_zero(image.attrib.get("OrigHeight"))
                if not image_id or not image_dir_id:
                    continue

                portrait = orig_height > orig_width if orig_width and orig_height else False
                width = min(orig_width or 1200, 1200)
                thumb_query = urlencode({"w": width, "f": "p" if portrait else "l"})
                url = (
                    f"{parsed.scheme}://{mediacenter_host}/"
                    f"SLOAIMGTMB_{image_id}_{image_dir_id}_{version}.jpg?{thumb_query}"
                )
                caption = _normalize_whitespace(
                    image.attrib.get("HoverTitle")
                    or image.attrib.get("HoverDescription")
                    or image.attrib.get("AltText")
                    or ""
                ) or None
                if _is_generic_registry_image(url, caption) or url in seen:
                    continue
                seen.add(url)
                media.append(
                    {
                        "media_type": "photo",
                        "url": url,
                        "caption": caption,
                    }
                )

            offset += len(images)
            if len(images) < page_size:
                break
            time.sleep(self.delay_seconds)

        return media

    def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        last_error: httpx.HTTPError | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                return self.client.request(method, url, **kwargs)
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt == self.max_attempts:
                    break
                sleep_seconds = max(self.delay_seconds, 1.0) * attempt
                print(
                    f"BarchettaScraper retrying {method} {url} "
                    f"(attempt {attempt + 1}/{self.max_attempts}) after {exc}"
                )
                time.sleep(sleep_seconds)
        assert last_error is not None
        raise last_error


def _read_fixture_text(path: Path) -> str:
    raw = path.read_bytes()
    for encoding in ("utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _resolve_media_src(src: str, canonical_url: str, source_url: str) -> str:
    if source_url.startswith("file://") and not src.startswith(("http://", "https://", "file://")):
        fixture_path = Path(unquote(source_url.removeprefix("file://")))
        candidate = (fixture_path.parent / unquote(src)).resolve()
        return candidate.as_uri()
    return urljoin(canonical_url, src)


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _string_or_none(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _int_or_none(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _int_or_zero(value: object) -> int:
    try:
        return int(str(value or "0"))
    except (TypeError, ValueError):
        return 0


def _first_value(values: list[str] | None, default: str | None = None) -> str | None:
    if not values:
        return default
    value = str(values[0]).strip()
    return value or default


def _first_int(values: list[str] | None) -> int | None:
    value = _first_value(values)
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _looks_like_car_image(path: str) -> bool:
    lowered = path.lower()
    if not lowered.endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
        return False
    blocked = [
        "arrow",
        "homebutton",
        "mailicon",
        "copyright",
        "galleryicon",
        "library",
        "resultsicon",
        "background",
        "logo",
        "icon",
        "querylist",
        "empty",
        "checkbox",
        "casa",
        "tp.gif",
        "lg.php",
        "resource",
        "black.jpg",
    ]
    return not any(token in lowered for token in blocked)


MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def _parse_barchetta_date(value: str) -> tuple[date | None, str, int | None]:
    text = _normalize_whitespace(value)
    match = re.match(r"(?P<year>\d{4}|\d{3}\.|\d{2}\.\.)", text)
    if not match:
        return None, "unknown", None

    raw_year = match.group("year")
    if "." in raw_year:
        year = int(raw_year.replace(".", "0")[0:4])
        return None, "decade", year

    year = int(raw_year)
    remainder = text[match.end() :].lstrip("/")
    if not remainder or remainder.startswith("-"):
        return date(year, 1, 1), "year", year

    month_match = re.match(r"([a-z]{3})", remainder, re.IGNORECASE)
    if not month_match:
        return date(year, 1, 1), "year", year

    month = MONTHS.get(month_match.group(1).lower())
    if month is None:
        return date(year, 1, 1), "year", year

    remainder = remainder[month_match.end() :]
    day_match = re.match(r"/(\d{1,2})", remainder)
    if day_match:
        return date(year, month, int(day_match.group(1))), "day", year
    return date(year, month, 1), "month", year


def _is_colspan_row(cells: list[BeautifulSoup]) -> bool:
    return any(int(cell.get("colspan", "1")) > 1 for cell in cells)


def _is_custody_row(cells: list[BeautifulSoup]) -> bool:
    if not _is_colspan_row(cells):
        return False
    text = _normalize_whitespace(cells[0].get_text(" ", strip=True))
    if not text:
        return False
    has_owner_markup = bool(cells[0].find(["b", "strong"]))
    return has_owner_markup and " - " in text


def _is_narrative_row(cells: list[BeautifulSoup]) -> bool:
    if not _is_colspan_row(cells):
        return False
    text = _normalize_whitespace(cells[0].get_text(" ", strip=True))
    return bool(text)


def _extract_owner_name(text: str) -> str | None:
    match = re.match(r"[^-]+-\s*(.+)", text)
    if not match:
        return None
    owner = match.group(1)
    owner = owner.split(" - ")[0]
    owner = owner.split("(")[0]
    return _normalize_whitespace(owner) or None


def _extract_mediacenter_caption(soup: BeautifulSoup) -> str | None:
    for selector in (
        ('meta[property="og:title"]', "content"),
        ('meta[name="twitter:title"]', "content"),
    ):
        node = soup.select_one(selector[0])
        if node and node.get(selector[1]):
            return _normalize_whitespace(node.get(selector[1], ""))

    title = soup.title.string if soup.title and soup.title.string else ""
    normalized = _normalize_whitespace(title)
    return normalized or None


def _is_generic_registry_image(url: str, caption: str | None) -> bool:
    lowered_url = url.lower()
    lowered_caption = (caption or "").strip().lower()
    if lowered_caption == "ferrari - registry":
        return True
    return "mcsimg_1f0ce3bb-c8a5-44c0-ae9d-d17a91550813" in lowered_url


def _classify_event_type(event_name: str | None, result: str | None) -> str:
    haystack = " ".join(part for part in [event_name, result] if part).lower()
    if any(keyword in haystack for keyword in ["auction", "offered", "sold", "lot "]):
        return "auction"
    if any(keyword in haystack for keyword in ["concours", "concorso", "classic"]):
        return "concours"
    if any(keyword in haystack for keyword in ["restoration", "restored"]):
        return "restoration"
    if any(keyword in haystack for keyword in ["race", "grand prix", "tour", "historic", "sebring"]):
        return "race"
    return "history"


def _extract_location_from_event(event_name: str | None) -> str | None:
    if not event_name or "," not in event_name:
        return None
    return _normalize_whitespace(event_name.split(",")[-1])

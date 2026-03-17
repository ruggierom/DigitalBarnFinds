from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, is_dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.base import (  # noqa: E402
    AdapterManifest,
    FixtureInput,
    FixtureType,
)
from digital_barn_finds.services.scrapers.fixtures import (  # noqa: E402
    FixtureDefinition,
    get_fixture_root,
    load_fixture_definition,
    load_source_fixture_definitions,
)
from digital_barn_finds.services.scrapers.registry import get_scraper, list_scraper_keys  # noqa: E402

VALID_EVENT_KINDS = {"custody", "event"}
VALID_DATE_PRECISIONS = {"day", "month", "year", "decade", "unknown"}
BCP47_PATTERN = re.compile(r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="adapter_runner.py")
    parser.add_argument("--adapter")
    parser.add_argument("--fixture")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--fail-fast", action="store_true")
    parser.add_argument("--output")
    parser.add_argument("--build-fixture", action="store_true")
    parser.add_argument("--html")
    parser.add_argument("--url")
    parser.add_argument("--description")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    prime_placeholder_settings()
    if args.build_fixture:
        return build_fixture(args)

    if args.output not in {None, "json"}:
        raise SystemExit("--output only accepts 'json' in test mode")

    selected = [bool(args.adapter), bool(args.fixture), bool(args.all)]
    if sum(selected) != 1:
        raise SystemExit("Choose exactly one of --adapter, --fixture, or --all")

    adapter_runs: list[dict[str, Any]] = []

    if args.fixture:
        fixture_definition = load_fixture_definition(args.fixture)
        adapter_runs.append(
            run_adapter(
                fixture_definition.fixture.source_key,
                fixture_definitions=[fixture_definition],
                live=args.live,
                verbose=args.verbose,
                fail_fast=args.fail_fast,
            )
        )
    elif args.adapter:
        adapter_runs.append(
            run_adapter(
                args.adapter,
                fixture_definitions=None,
                live=args.live,
                verbose=args.verbose,
                fail_fast=args.fail_fast,
            )
        )
    else:
        for source_key in discover_all_source_keys():
            adapter_runs.append(
                run_adapter(
                    source_key,
                    fixture_definitions=None,
                    live=args.live,
                    verbose=args.verbose,
                    fail_fast=args.fail_fast,
                )
            )
            if args.fail_fast and not adapter_runs[-1]["pass"]:
                break

    overall_pass = all(adapter["pass"] for adapter in adapter_runs)
    payload = {
        "run_at": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "pass": overall_pass,
        "adapters": adapter_runs,
    }

    if args.output == "json":
        print(json.dumps(payload, indent=2, default=_json_default))
    else:
        render_human(payload, verbose=args.verbose)

    return 0 if overall_pass else 1


def discover_all_source_keys() -> list[str]:
    fixture_root = get_fixture_root()
    source_keys = set(list_scraper_keys())
    for manifest_path in sorted(fixture_root.glob("*/_manifest.json")):
        source_keys.add(manifest_path.parent.name)
    return sorted(source_keys)


def prime_placeholder_settings() -> None:
    os.environ.setdefault("DBF_DATABASE_URL", "postgresql://adapter-runner-placeholder")
    os.environ.setdefault("DBF_ADMIN_TOKEN", "adapter-runner-placeholder")


def run_adapter(
    source_key: str,
    *,
    fixture_definitions: list[FixtureDefinition] | None,
    live: bool,
    verbose: bool,
    fail_fast: bool,
) -> dict[str, Any]:
    result = {
        "source_key": source_key,
        "display_name": source_key,
        "pass": True,
        "layers": {
            "contract": new_layer(),
            "manifest": new_layer(),
            "fixtures": {"pass": True, "fixtures": [], "assertions": 0, "failures": [], "warnings": [], "infos": []},
            "live": {"skipped": not live, "warnings": [], "infos": [], "note": None},
        },
    }

    try:
        scraper = get_scraper(source_key)
    except Exception as exc:
        add_check(result["layers"]["contract"], False, f"adapter registry lookup failed: {exc}")
        result["pass"] = False
        result["layers"]["manifest"]["skipped"] = True
        result["layers"]["fixtures"]["infos"].append("skipped due to contract failure")
        result["layers"]["live"]["note"] = "skipped due to contract failure"
        return result

    result["display_name"] = getattr(getattr(scraper, "manifest", None), "display_name", source_key)

    validate_contract(scraper, result["layers"]["contract"])
    validate_manifest(scraper, result["layers"]["manifest"])

    if fixture_definitions is None:
        try:
            fixture_definitions = load_source_fixture_definitions(source_key)
        except Exception as exc:
            add_check(result["layers"]["fixtures"], False, f"failed to load fixtures: {exc}")
            result["pass"] = False
            result["layers"]["live"]["note"] = "skipped due to fixture loading failure"
            return result

    if result["layers"]["contract"]["pass"] and result["layers"]["manifest"]["pass"]:
        if not fixture_definitions:
            add_check(result["layers"]["fixtures"], False, "no fixtures found")
        else:
            for definition in fixture_definitions:
                fixture_result = run_fixture(scraper, definition, verbose=verbose)
                result["layers"]["fixtures"]["fixtures"].append(fixture_result)
                result["layers"]["fixtures"]["assertions"] += fixture_result["assertions"]
                result["layers"]["fixtures"]["warnings"].extend(fixture_result["warnings"])
                result["layers"]["fixtures"]["infos"].extend(fixture_result["infos"])
                if not fixture_result["pass"]:
                    result["layers"]["fixtures"]["pass"] = False
                    result["layers"]["fixtures"]["failures"].extend(fixture_result["failures"])
                    if fail_fast:
                        break
    else:
        result["layers"]["fixtures"]["infos"].append("skipped due to contract or manifest failure")

    layers = result["layers"]
    layers["contract"]["pass"] = not layers["contract"]["failures"]
    layers["manifest"]["pass"] = not layers["manifest"]["failures"]
    layers["fixtures"]["pass"] = not layers["fixtures"]["failures"]

    if live:
        if layers["contract"]["pass"] and layers["manifest"]["pass"] and layers["fixtures"]["pass"]:
            run_live_smoke(scraper, layers["live"])
        else:
            layers["live"]["note"] = "skipped because Layers 1-3 did not fully pass"
    else:
        layers["live"]["note"] = "use --live to enable; results are warnings only"

    result["pass"] = layers["contract"]["pass"] and layers["manifest"]["pass"] and layers["fixtures"]["pass"]
    return result


def new_layer() -> dict[str, Any]:
    return {"pass": True, "assertions": 0, "checks": [], "failures": [], "warnings": [], "infos": []}


def add_check(container: dict[str, Any], passed: bool, message: str) -> None:
    container["assertions"] += 1
    container.setdefault("checks", []).append({"pass": passed, "message": message})
    if not passed:
        container.setdefault("failures", []).append(message)
        container["pass"] = False


def validate_contract(scraper: object, layer: dict[str, Any]) -> None:
    add_check(layer, bool(getattr(scraper, "source_key", "")), "source_key present")
    add_check(layer, isinstance(getattr(scraper, "manifest", None), AdapterManifest), "manifest is AdapterManifest")
    add_check(layer, callable(getattr(scraper, "crawl", None)), "crawl() callable")
    add_check(layer, callable(getattr(scraper, "parse_discovery_page", None)), "parse_discovery_page() callable")
    add_check(layer, callable(getattr(scraper, "parse_detail_page", None)), "parse_detail_page() callable")
    add_check(layer, callable(getattr(scraper, "parse_record_fixture", None)), "parse_record_fixture() callable")


def validate_manifest(scraper: object, layer: dict[str, Any]) -> None:
    manifest = getattr(scraper, "manifest", None)
    if not isinstance(manifest, AdapterManifest):
        add_check(layer, False, "manifest missing or invalid")
        return

    add_check(layer, bool(manifest.source_key.strip()), f"source_key = {manifest.source_key!r}")
    add_check(layer, bool(manifest.display_name.strip()), f"display_name = {manifest.display_name!r}")
    add_check(layer, is_absolute_url(manifest.base_url), f"base_url = {manifest.base_url!r}")
    add_check(
        layer,
        bool(manifest.supported_detail_fixture_types)
        and all(item in {FixtureType.DETAIL_PAGE, FixtureType.API_RESPONSE} for item in manifest.supported_detail_fixture_types),
        f"supported_detail_fixture_types = {[item.value for item in manifest.supported_detail_fixture_types]!r}",
    )
    add_check(
        layer,
        all(item == FixtureType.SEARCH_RESULTS for item in manifest.supported_discovery_fixture_types),
        f"supported_discovery_fixture_types = {[item.value for item in manifest.supported_discovery_fixture_types]!r}",
    )
    add_check(
        layer,
        bool(BCP47_PATTERN.fullmatch(manifest.language)),
        f"language = {manifest.language!r}",
    )


def run_fixture(scraper: object, definition: FixtureDefinition, *, verbose: bool) -> dict[str, Any]:
    result = {
        "file": definition.path.name,
        "path": str(definition.path),
        "description": definition.description,
        "pass": True,
        "assertions": 0,
        "checks": [],
        "failures": [],
        "warnings": [],
        "infos": [],
        "record_summary": None,
    }

    fixture = definition.fixture
    manifest: AdapterManifest = getattr(scraper, "manifest")
    if fixture.fixture_type in manifest.supported_detail_fixture_types:
        try:
            record = scraper.parse_record_fixture(fixture)
        except Exception as exc:
            add_check(result, False, f"parse_record_fixture() raised: {exc}")
            return result

        result["record_summary"] = {
            "serial_number": record.car.serial_number,
            "make": record.car.make,
            "model": record.car.model,
            "custody_events": len(record.custody_events),
            "car_events": len(record.car_events),
            "media": len(record.media),
        }
        validate_record(record, definition, result)
        if verbose:
            result["record"] = serialize_for_json(record)
    elif fixture.fixture_type in manifest.supported_discovery_fixture_types:
        try:
            urls = scraper.parse_discovery_page(fixture)
        except Exception as exc:
            add_check(result, False, f"parse_discovery_page() raised: {exc}")
            return result

        result["record_summary"] = {"discovery_urls": len(urls)}
        add_check(result, bool(urls), f"discovery returned {len(urls)} URLs")
        add_check(
            result,
            all(is_absolute_url(url) for url in urls),
            "all discovery URLs are absolute",
        )
        validate_discovery_urls(urls, definition, result)
        if verbose:
            result["discovery_urls"] = urls
    else:
        add_check(result, False, f"unsupported fixture_type={fixture.fixture_type.value!r}")

    if fixture.metadata.get("mediacenter_iframe_urls") and not fixture.auxiliary_payloads:
        result["warnings"].append("mediacenter_iframe_urls present; auxiliary payloads not bundled")
    if not definition.expected:
        result["infos"].append("no expected block; skipping value assertions")

    result["pass"] = not result["failures"]
    return result


def validate_record(record: Any, definition: FixtureDefinition, result: dict[str, Any]) -> None:
    add_check(result, bool(str(record.car.serial_number or "").strip()), f"serial_number = {record.car.serial_number!r}")
    add_check(result, bool(str(record.car.make or "").strip()), f"make = {record.car.make!r}")
    add_check(result, bool(str(record.car.model or "").strip()), f"model = {record.car.model!r}")
    add_check(result, is_absolute_url(str(record.source_url or "")), f"source_url = {record.source_url!r}")

    all_events = [*record.custody_events, *record.car_events]
    add_check(
        result,
        all(event.event_kind in VALID_EVENT_KINDS for event in all_events),
        f"event_kind valid ({len(all_events)} events)",
    )
    add_check(
        result,
        all(event.event_date_precision in VALID_DATE_PRECISIONS for event in all_events),
        "date_precision valid",
    )
    add_check(
        result,
        all((event.event_date is not None) if event.event_date_precision == "day" else True for event in all_events)
        and all((event.event_date is None) if event.event_date_precision == "decade" else True for event in all_events),
        "date/year consistency valid",
    )

    media_urls = []
    media_url_valid = True
    media_type_valid = True
    for item in record.media:
        url = item.get("url")
        media_urls.append(str(url or ""))
        if not isinstance(url, str) or not url.strip():
            media_url_valid = False
        if "media_type" in item:
            media_type = item.get("media_type")
            if media_type is not None and (not isinstance(media_type, str) or not media_type.strip()):
                media_type_valid = False

    add_check(result, media_url_valid, f"media url non-empty ({len(record.media)} items)")
    add_check(result, media_type_valid, "media type valid")
    non_empty_media_urls = [url for url in media_urls if url]
    add_check(
        result,
        len(non_empty_media_urls) == len(set(non_empty_media_urls)),
        "no duplicate media urls",
    )
    add_check(
        result,
        all(isinstance(value, str) for value in record.car.attributes.values()),
        "attributes are strings",
    )

    if len(record.media) == 0:
        result["warnings"].append("media count is 0")

    expected = definition.expected
    if not expected:
        return

    expected_car = expected.get("car") or {}
    for field_name, expected_value in expected_car.items():
        actual_value = getattr(record.car, field_name)
        if isinstance(actual_value, date):
            actual_value = actual_value.isoformat()
        add_check(
            result,
            actual_value == expected_value,
            f"expected.car.{field_name} match (got {actual_value!r}, expected {expected_value!r})",
        )

    if "custody_event_count" in expected:
        actual = len(record.custody_events)
        expected_value = expected["custody_event_count"]
        add_check(
            result,
            actual == expected_value,
            f"expected.custody_event_count match (got {actual}, expected {expected_value})",
        )

    if "car_event_count" in expected:
        actual = len(record.car_events)
        expected_value = expected["car_event_count"]
        add_check(
            result,
            actual == expected_value,
            f"expected.car_event_count match (got {actual}, expected {expected_value})",
        )

    if "media_count_min" in expected:
        actual = len(record.media)
        expected_value = expected["media_count_min"]
        add_check(
            result,
            actual >= expected_value,
            f"expected.media_count_min match (got {actual}, expected >= {expected_value})",
        )

    if "first_custody_owner" in expected:
        actual = record.custody_events[0].payload.get("owner_name") if record.custody_events else None
        expected_value = expected["first_custody_owner"]
        add_check(
            result,
            actual == expected_value,
            f"expected.first_custody_owner match (got {actual!r}, expected {expected_value!r})",
        )

    if "event_kinds" in expected:
        actual = sorted({event.event_kind for event in all_events})
        expected_value = sorted(expected["event_kinds"])
        add_check(
            result,
            actual == expected_value,
            f"expected.event_kinds match (got {actual!r}, expected {expected_value!r})",
        )

    if "date_precisions" in expected:
        actual = sorted({event.event_date_precision for event in all_events})
        expected_value = sorted(expected["date_precisions"])
        add_check(
            result,
            actual == expected_value,
            f"expected.date_precisions match (got {actual!r}, expected {expected_value!r})",
        )


def validate_discovery_urls(urls: list[str], definition: FixtureDefinition, result: dict[str, Any]) -> None:
    expected = definition.expected
    if not expected:
        return

    if "discovery_url_count" in expected:
        actual = len(urls)
        expected_value = expected["discovery_url_count"]
        add_check(
            result,
            actual == expected_value,
            f"expected.discovery_url_count match (got {actual}, expected {expected_value})",
        )

    if "discovery_urls" in expected:
        expected_value = list(expected["discovery_urls"])
        add_check(
            result,
            urls == expected_value,
            f"expected.discovery_urls match (got {urls!r}, expected {expected_value!r})",
        )


def run_live_smoke(scraper: object, live_layer: dict[str, Any]) -> None:
    live_layer["skipped"] = False
    try:
        urls = scraper.crawl(full=False)
        if not urls:
            live_layer["warnings"].append("crawl(full=False) returned no URLs")
            return
        invalid_urls = [url for url in urls if not is_absolute_url(url)]
        if invalid_urls:
            live_layer["warnings"].append(f"crawl(full=False) returned invalid URLs: {invalid_urls[:3]!r}")
        try:
            record = scraper.parse_detail_page(urls[0])
            temp_result = {"assertions": 0, "checks": [], "failures": [], "warnings": [], "infos": [], "pass": True}
            validate_record(
                record,
                FixtureDefinition(
                    path=Path(urls[0]),
                    description="live smoke",
                    fixture=FixtureInput(
                        fixture_type=FixtureType.DETAIL_PAGE,
                        source_key=getattr(scraper, "source_key"),
                        source_url=urls[0],
                    ),
                    expected={},
                ),
                temp_result,
            )
            if temp_result["failures"]:
                live_layer["warnings"].extend(temp_result["failures"])
            live_layer["infos"].append(f"live smoke parsed {record.car.serial_number!r} from {urls[0]!r}")
        except Exception as exc:
            live_layer["warnings"].append(f"parse_detail_page() raised: {exc}")
    except Exception as exc:
        live_layer["warnings"].append(f"crawl(full=False) raised: {exc}")


def render_human(payload: dict[str, Any], *, verbose: bool) -> None:
    print("DBF Adapter Test Runner")
    print("=" * 72)
    for adapter in payload["adapters"]:
        print()
        print(f"ADAPTER: {adapter['source_key']} ({adapter['display_name']})")

        render_layer("LAYER 1 - Contract validation", adapter["layers"]["contract"])
        render_layer("LAYER 2 - Manifest validation", adapter["layers"]["manifest"])

        print("LAYER 3 - Fixtures")
        for fixture in adapter["layers"]["fixtures"]["fixtures"]:
            status = "PASS" if fixture["pass"] else "FAIL"
            print(f"  [{status}] {fixture['file']} - {fixture['description']}")
            for check in fixture["checks"]:
                prefix = "PASS" if check["pass"] else "FAIL"
                print(f"    [{prefix}] {check['message']}")
            for warning in fixture["warnings"]:
                print(f"    [WARN] {warning}")
            for info in fixture["infos"]:
                print(f"    [INFO] {info}")
            if verbose and fixture.get("record") is not None:
                print("    [VERBOSE] ScrapedCarRecord:")
                print(json.dumps(fixture["record"], indent=2, default=_json_default))

        if not adapter["layers"]["fixtures"]["fixtures"]:
            for failure in adapter["layers"]["fixtures"]["failures"]:
                print(f"  [FAIL] {failure}")
            for info in adapter["layers"]["fixtures"]["infos"]:
                print(f"  [INFO] {info}")

        print("LAYER 4 - Live smoke test")
        live_layer = adapter["layers"]["live"]
        if live_layer.get("skipped"):
            print(f"  [INFO] {live_layer['note']}")
        else:
            for info in live_layer["infos"]:
                print(f"  [INFO] {info}")
            for warning in live_layer["warnings"]:
                print(f"  [WARN] {warning}")
            if not live_layer["infos"] and not live_layer["warnings"]:
                print("  [INFO] live smoke completed with no warnings")

        fixture_assertions = sum(fixture["assertions"] for fixture in adapter["layers"]["fixtures"]["fixtures"])
        total_assertions = (
            adapter["layers"]["contract"]["assertions"]
            + adapter["layers"]["manifest"]["assertions"]
            + fixture_assertions
        )
        total_failures = (
            len(adapter["layers"]["contract"]["failures"])
            + len(adapter["layers"]["manifest"]["failures"])
            + len(adapter["layers"]["fixtures"]["failures"])
        )
        total_passes = total_assertions - total_failures
        print("-" * 72)
        print(
            f"{adapter['source_key']}: {len(adapter['layers']['fixtures']['fixtures'])} fixtures | "
            f"{total_assertions} assertions | {total_passes} pass | {total_failures} fail"
        )
        print("-" * 72)

    overall_assertions = 0
    overall_failures = 0
    overall_fixtures = 0
    for adapter in payload["adapters"]:
        overall_assertions += adapter["layers"]["contract"]["assertions"]
        overall_assertions += adapter["layers"]["manifest"]["assertions"]
        overall_assertions += sum(fixture["assertions"] for fixture in adapter["layers"]["fixtures"]["fixtures"])
        overall_failures += len(adapter["layers"]["contract"]["failures"])
        overall_failures += len(adapter["layers"]["manifest"]["failures"])
        overall_failures += len(adapter["layers"]["fixtures"]["failures"])
        overall_fixtures += len(adapter["layers"]["fixtures"]["fixtures"])

    print()
    print(
        f"TOTAL: {len(payload['adapters'])} adapters | {overall_fixtures} fixtures | "
        f"{overall_assertions} assertions | {overall_failures} fail"
    )


def render_layer(title: str, layer: dict[str, Any]) -> None:
    print(title)
    for check in layer.get("checks", []):
        prefix = "PASS" if check["pass"] else "FAIL"
        print(f"  [{prefix}] {check['message']}")
    for warning in layer.get("warnings", []):
        print(f"  [WARN] {warning}")
    for info in layer.get("infos", []):
        print(f"  [INFO] {info}")


def build_fixture(args: argparse.Namespace) -> int:
    if not args.adapter:
        raise SystemExit("--build-fixture requires --adapter")
    if not args.html or not args.url or not args.description or not args.output:
        raise SystemExit("--build-fixture requires --html, --url, --description, and --output <path>")

    html_path = Path(args.html).resolve()
    output_path = Path(args.output).resolve()
    raw_html = read_text_with_fallbacks(html_path)
    scraper = get_scraper(args.adapter)

    fixture = FixtureInput(
        fixture_type=FixtureType.DETAIL_PAGE,
        source_key=args.adapter,
        source_url=args.url,
        raw_html=raw_html,
    )
    record = scraper.parse_record_fixture(fixture)

    metadata: dict[str, Any] = {}
    if args.adapter == "barchetta" and hasattr(scraper, "_extract_media_iframe_urls"):
        soup = BeautifulSoup(raw_html, "html.parser")
        iframe_urls = scraper._extract_media_iframe_urls(soup, args.url)
        if iframe_urls:
            metadata["mediacenter_iframe_urls"] = iframe_urls

    output_payload = {
        "fixture_type": fixture.fixture_type.value,
        "source_key": fixture.source_key,
        "source_url": fixture.source_url,
        "description": args.description,
        "raw_html": raw_html,
        "raw_json": None,
        "raw_xml": None,
        "auxiliary_payloads": [],
        "metadata": metadata,
        "expected": {
            "car": {
                "serial_number": record.car.serial_number,
                "make": record.car.make,
                "model": record.car.model,
            },
            "custody_event_count": len(record.custody_events),
            "car_event_count": len(record.car_events),
            "media_count_min": len(record.media),
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output_payload, indent=2, default=_json_default), encoding="utf-8")
    print(json.dumps(serialize_for_json(record), indent=2, default=_json_default))
    print(f"Wrote fixture to {output_path}")
    return 0


def serialize_for_json(value: Any) -> Any:
    if is_dataclass(value):
        return serialize_for_json(asdict(value))
    if isinstance(value, dict):
        return {str(key): serialize_for_json(item) for key, item in value.items()}
    if isinstance(value, list):
        return [serialize_for_json(item) for item in value]
    if isinstance(value, tuple):
        return [serialize_for_json(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def is_absolute_url(value: str) -> bool:
    parsed = urlparse(value)
    if parsed.scheme in {"http", "https"}:
        return bool(parsed.netloc)
    if parsed.scheme == "file":
        return True
    return False


def read_text_with_fallbacks(path: Path) -> str:
    raw = path.read_bytes()
    for encoding in ("utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _json_default(value: Any) -> Any:
    serialized = serialize_for_json(value)
    if serialized is value:
        raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")
    return serialized


if __name__ == "__main__":
    raise SystemExit(main())

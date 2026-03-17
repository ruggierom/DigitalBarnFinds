from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from dataclasses import asdict
from pathlib import Path
from typing import Any

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.fixtures import load_source_fixture_definitions  # noqa: E402
from digital_barn_finds.services.scrapers.registry import get_scraper, list_scraper_keys  # noqa: E402

PROFILE_FIELDS = ("year_built", "body_style", "drive_side", "original_color", "notes")
ATTRIBUTE_KEYS_TO_IGNORE = {
    "auction_house",
    "source_heading",
    "sale_title",
    "sale_date",
    "sale_location",
    "sale_id",
    "sale_number",
    "estimate",
    "sold_price",
    "lot_number",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="adapter_field_audit.py")
    parser.add_argument("--adapter")
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def main() -> int:
    prime_placeholder_settings()
    args = parse_args()
    source_keys = [args.adapter] if args.adapter else sorted(list_scraper_keys())
    adapters: list[dict[str, Any]] = []
    attr_sources: dict[str, set[str]] = defaultdict(set)

    for source_key in source_keys:
        scraper = get_scraper(source_key)
        fixture_definitions = [
            definition
            for definition in load_source_fixture_definitions(source_key)
            if definition.fixture.fixture_type in scraper.manifest.supported_detail_fixture_types
        ]

        profile_coverage = Counter()
        attribute_counts = Counter()
        records = []

        for definition in fixture_definitions:
            record = scraper.parse_record_fixture(definition.fixture)
            records.append(record)
            for field_name in PROFILE_FIELDS:
                if getattr(record.car, field_name):
                    profile_coverage[field_name] += 1
            for key in record.car.attributes:
                attribute_counts[key] += 1
                attr_sources[key].add(source_key)

        adapters.append(
            {
                "source_key": source_key,
                "display_name": scraper.manifest.display_name,
                "detail_fixtures": len(records),
                "profile_coverage": {
                    field_name: {
                        "present": profile_coverage[field_name],
                        "total": len(records),
                    }
                    for field_name in PROFILE_FIELDS
                },
                "attribute_counts": dict(sorted(attribute_counts.items())),
            }
        )

    repeated_attribute_keys = []
    for key, sources in sorted(attr_sources.items()):
        if key in ATTRIBUTE_KEYS_TO_IGNORE:
            continue
        if len(sources) < 2:
            continue
        repeated_attribute_keys.append({"attribute_key": key, "sources": sorted(sources)})

    payload = {
        "adapters": adapters,
        "repeated_attribute_keys": repeated_attribute_keys,
    }

    if args.json:
        print(json.dumps(payload, indent=2, default=_json_default))
    else:
        render_human(payload)
    return 0


def prime_placeholder_settings() -> None:
    os.environ.setdefault("DBF_DATABASE_URL", "postgresql://adapter-audit-placeholder")
    os.environ.setdefault("DBF_ADMIN_TOKEN", "adapter-audit-placeholder")


def render_human(payload: dict[str, Any]) -> None:
    print("DBF Adapter Field Audit")
    print("=" * 72)
    for adapter in payload["adapters"]:
        print(f"\n{adapter['source_key']}: {adapter['display_name']}")
        print(f"  detail fixtures: {adapter['detail_fixtures']}")
        print("  profile coverage:")
        for field_name, counts in adapter["profile_coverage"].items():
            print(f"    {field_name}: {counts['present']}/{counts['total']}")
        print("  attribute keys:")
        for key, uses in adapter["attribute_counts"].items():
            print(f"    {key}: {uses}")

    print("\nRepeated attribute keys across multiple adapters:")
    if not payload["repeated_attribute_keys"]:
        print("  none")
        return
    for item in payload["repeated_attribute_keys"]:
        print(f"  {item['attribute_key']}: {', '.join(item['sources'])}")


def _json_default(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "__dict__"):
        return value.__dict__
    return asdict(value)


if __name__ == "__main__":
    raise SystemExit(main())

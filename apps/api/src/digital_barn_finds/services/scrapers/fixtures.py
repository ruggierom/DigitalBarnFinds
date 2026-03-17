from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from digital_barn_finds.services.scrapers.base import FixtureInput, FixtureType


FIXTURE_ROOT = Path(__file__).resolve().parents[4] / "fixtures"


@dataclass(frozen=True, slots=True)
class FixtureDefinition:
    path: Path
    description: str
    fixture: FixtureInput
    expected: dict[str, Any]


@dataclass(frozen=True, slots=True)
class FixtureManifestEntry:
    file: str
    description: str


@dataclass(frozen=True, slots=True)
class SourceFixtureManifest:
    source_key: str
    display_name: str
    fixtures: list[FixtureManifestEntry]


def get_fixture_root() -> Path:
    return FIXTURE_ROOT


def get_source_fixture_dir(source_key: str) -> Path:
    return FIXTURE_ROOT / source_key


def get_source_manifest_path(source_key: str) -> Path:
    return get_source_fixture_dir(source_key) / "_manifest.json"


def load_source_manifest(source_key: str) -> SourceFixtureManifest:
    manifest_path = get_source_manifest_path(source_key)
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    fixtures = [
        FixtureManifestEntry(
            file=str(item["file"]),
            description=str(item.get("description") or item["file"]),
        )
        for item in payload.get("fixtures", [])
    ]
    return SourceFixtureManifest(
        source_key=str(payload["source_key"]),
        display_name=str(payload.get("display_name") or payload["source_key"]),
        fixtures=fixtures,
    )


def load_fixture_definition(path: str | Path) -> FixtureDefinition:
    fixture_path = Path(path).resolve()
    payload = json.loads(fixture_path.read_text(encoding="utf-8"))
    fixture = FixtureInput(
        fixture_type=FixtureType(str(payload["fixture_type"])),
        source_key=str(payload["source_key"]),
        source_url=str(payload["source_url"]),
        raw_html=payload.get("raw_html"),
        raw_json=payload.get("raw_json"),
        raw_xml=payload.get("raw_xml"),
        auxiliary_payloads=list(payload.get("auxiliary_payloads") or []),
        metadata=dict(payload.get("metadata") or {}),
    )
    return FixtureDefinition(
        path=fixture_path,
        description=str(payload.get("description") or fixture_path.name),
        fixture=fixture,
        expected=dict(payload.get("expected") or {}),
    )


def load_source_fixture_definitions(source_key: str) -> list[FixtureDefinition]:
    manifest = load_source_manifest(source_key)
    fixture_dir = get_source_fixture_dir(source_key)
    return [
        load_fixture_definition(fixture_dir / entry.file)
        for entry in manifest.fixtures
    ]

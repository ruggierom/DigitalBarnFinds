from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "postgresql://research-test-placeholder")
os.environ.setdefault("DBF_ADMIN_TOKEN", "research-test-placeholder")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.research import build_research_links  # noqa: E402


def test_build_research_links_generates_google_queries_from_serial() -> None:
    car = SimpleNamespace(
        display_serial_number="ZFFYT53A620127086",
        make="Ferrari",
        model="360 Spider",
        year_built=2002,
        variant=None,
    )

    links = build_research_links(car)
    queries = [item.query for item in links]
    labels = [item.label for item in links]

    assert any(query == '"ZFFYT53A620127086" 2002 Ferrari 360 Spider' for query in queries)
    assert "Google exact" in labels
    assert "Google images" in labels
    assert any("site:bringatrailer.com" in query for query in queries)


def test_build_research_links_marks_known_source_domains() -> None:
    car = SimpleNamespace(
        display_serial_number="0465GT",
        make="Ferrari",
        model="275 GTB",
        variant=None,
    )
    source = SimpleNamespace(
        source_url="https://www.barchetta.cc/english/All.Ferraris/Detail/0465GT.275GTB.htm",
    )

    links = build_research_links(car, [source])

    assert any(link.label == "barchetta.cc (known source)" for link in links)
    assert any(link.query.startswith('site:barchetta.cc "0465GT"') for link in links)

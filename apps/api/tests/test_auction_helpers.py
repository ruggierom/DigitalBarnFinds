from __future__ import annotations

import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.auction_helpers import (  # noqa: E402
    build_attribute_map,
    extract_drive_side,
    extract_semantic_value,
    infer_body_style,
)


def test_extract_semantic_value_supports_synonyms() -> None:
    page_text = "\n".join(
        [
            "Sale Date: Sunday 1st June 2025",
            "Sold For: £11,250",
            "Location: Bicester Motion",
            "Transmission: Manual",
        ]
    )

    assert extract_semantic_value(page_text, "sale_date") == "Sunday 1st June 2025"
    assert extract_semantic_value(page_text, "sold_price") == "£11,250"
    assert extract_semantic_value(page_text, "sale_location") == "Bicester Motion"
    assert extract_semantic_value(page_text, "transmission") == "Manual"


def test_extract_semantic_value_ignores_prose_mentions() -> None:
    page_text = "\n".join(
        [
            "La voiture conserve une couleur tres distinctive pour cette serie.",
            "Couleur: Bleu de France",
        ]
    )

    assert extract_semantic_value(page_text, "exterior_color") == "Bleu de France"
    assert extract_semantic_value(
        "La voiture conserve une couleur tres distinctive pour cette serie.",
        "exterior_color",
    ) is None


def test_build_attribute_map_normalizes_and_joins_list_values() -> None:
    attributes = build_attribute_map(
        {"auction_house": " Mecum ", "source_heading": " 2024 Corvette Z06 "},
        highlights=["83 miles", "", "Carbon ceramic brakes"],
        transmission=" Automatic ",
        empty_value="   ",
    )

    assert attributes == {
        "auction_house": "Mecum",
        "source_heading": "2024 Corvette Z06",
        "highlights": "83 miles | Carbon ceramic brakes",
        "transmission": "Automatic",
    }


def test_infer_body_style_detects_common_terms() -> None:
    assert infer_body_style("2002 Ferrari 360 Spider", "360 Spider", None) == "Spider"
    assert infer_body_style("2024 Chevrolet Corvette Z06 3LZ Convertible", None) == "Convertible"
    assert infer_body_style("1964 Oldsmobile Ninety-Eight Custom Sports Coupe", None) == "Coupe"


def test_extract_drive_side_detects_lhd_and_rhd() -> None:
    assert extract_drive_side("Factory original LHD example") == "LHD"
    assert extract_drive_side("Described as right-hand drive throughout") == "RHD"
    assert extract_drive_side("No steering-side note present") is None

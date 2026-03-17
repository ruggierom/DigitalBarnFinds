from __future__ import annotations

import sys
from pathlib import Path

import httpx

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.barchetta import _decode_http_text  # noqa: E402


def test_decode_http_text_handles_cp1252_html() -> None:
    payload = "<html><head><title>Ferrari 250 GT PF Coup\xe9</title></head><body>Coup\xe9</body></html>".encode(
        "cp1252"
    )
    response = httpx.Response(
        200,
        headers={"content-type": "text/html"},
        content=payload,
    )

    decoded = _decode_http_text(response, is_html=True)

    assert "Coupé" in decoded

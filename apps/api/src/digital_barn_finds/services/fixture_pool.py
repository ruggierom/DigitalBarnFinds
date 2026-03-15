from __future__ import annotations

from pathlib import Path


IGNORED_HTML_FILENAMES = {
    "update.html",
    "automobiles.html",
    "saved_resource.html",
    "afr.html",
}


def get_barchetta_fixture_root() -> Path:
    return Path(__file__).resolve().parents[3] / "fixtures" / "barchetta"


def discover_barchetta_fixture_pages() -> list[Path]:
    root = get_barchetta_fixture_root()
    if not root.exists():
        return []

    pages: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".htm", ".html"}:
            continue
        if any(part.endswith("_files") for part in path.parts):
            continue
        if path.name.lower() in IGNORED_HTML_FILENAMES:
            continue
        pages.append(path.resolve())

    return sorted(set(pages))

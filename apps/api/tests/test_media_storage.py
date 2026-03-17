from __future__ import annotations

import sys
from pathlib import Path

import httpx

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.config import get_settings  # noqa: E402
from digital_barn_finds.services.media_storage import (  # noqa: E402
    persist_local_media,
    persist_media_items,
    persist_remote_media,
)

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDAT\x08\x99c``\x00\x00"
    b"\x00\x04\x00\x01\xf6\x178U\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_persist_remote_media_writes_file_into_local_media_root(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("DBF_DATABASE_URL", "postgresql://test")
    monkeypatch.setenv("DBF_ADMIN_TOKEN", "test-token")
    monkeypatch.setenv("DBF_MEDIA_STORAGE_MODE", "filesystem")
    monkeypatch.setenv("DBF_MEDIA_LOCAL_ROOT", str(tmp_path))
    get_settings.cache_clear()

    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            headers={"content-type": "image/png"},
            content=PNG_BYTES,
        )
    )
    with httpx.Client(transport=transport) as client:
        stored = persist_remote_media(
            "https://example.com/images/car.png",
            source_key="aguttes",
            serial_number="939 EXB 1138",
            client=client,
        )

    assert stored.url.startswith("file://")
    saved_path = Path(stored.url.removeprefix("file://"))
    assert saved_path.exists()
    assert saved_path.is_file()
    assert saved_path.read_bytes() == PNG_BYTES
    assert saved_path.is_relative_to(tmp_path)
    get_settings.cache_clear()


def test_persist_local_media_rehydrates_managed_file_into_current_backend(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("DBF_DATABASE_URL", "postgresql://test")
    monkeypatch.setenv("DBF_ADMIN_TOKEN", "test-token")
    monkeypatch.setenv("DBF_MEDIA_STORAGE_MODE", "filesystem")
    target_root = tmp_path / "target"
    monkeypatch.setenv("DBF_MEDIA_LOCAL_ROOT", str(target_root))
    get_settings.cache_clear()

    original_root = tmp_path / "original"
    original_root.mkdir()
    original_file = original_root / "demo.png"
    original_file.write_bytes(PNG_BYTES)

    stored = persist_local_media(
        f"file://{original_file}",
        source_key="artcurial",
        serial_number="sale-6144-lot-16",
    )

    assert stored.url.startswith("file://")
    saved_path = Path(stored.url.removeprefix("file://"))
    assert saved_path.exists()
    assert saved_path.read_bytes() == PNG_BYTES
    assert saved_path.is_relative_to(target_root)
    get_settings.cache_clear()


def test_persist_media_items_falls_back_to_remote_url_for_non_image(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("DBF_DATABASE_URL", "postgresql://test")
    monkeypatch.setenv("DBF_ADMIN_TOKEN", "test-token")
    monkeypatch.setenv("DBF_MEDIA_STORAGE_MODE", "filesystem")
    monkeypatch.setenv("DBF_MEDIA_LOCAL_ROOT", str(tmp_path))
    get_settings.cache_clear()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "text/html"},
            content=b"<html>not an image</html>",
        )

    class MockClient(httpx.Client):
        def __init__(self, *args, **kwargs) -> None:
            kwargs["transport"] = httpx.MockTransport(handler)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "Client", MockClient)
    items = persist_media_items(
        [{"url": "https://example.com/not-an-image"}],
        source_key="aguttes",
        serial_number="939 EXB 1138",
    )
    get_settings.cache_clear()

    assert items[0]["url"] == "https://example.com/not-an-image"
    assert list(tmp_path.rglob("*")) == []


def test_persist_media_items_dedupes_identical_stored_assets(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("DBF_DATABASE_URL", "postgresql://test")
    monkeypatch.setenv("DBF_ADMIN_TOKEN", "test-token")
    monkeypatch.setenv("DBF_MEDIA_STORAGE_MODE", "filesystem")
    monkeypatch.setenv("DBF_MEDIA_LOCAL_ROOT", str(tmp_path))
    get_settings.cache_clear()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "image/jpeg"},
            content=b"\xff\xd8\xffdemo-jpeg",
        )

    class MockClient(httpx.Client):
        def __init__(self, *args, **kwargs) -> None:
            kwargs["transport"] = httpx.MockTransport(handler)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "Client", MockClient)
    items = persist_media_items(
        [
            {"url": "https://example.com/a.jpg"},
            {"url": "https://example.com/b.jpg"},
        ],
        source_key="barchetta",
        serial_number="0553GT",
    )
    get_settings.cache_clear()

    assert len(items) == 1
    assert str(items[0]["url"]).startswith("file://")


def test_persist_media_items_limits_result_count(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("DBF_DATABASE_URL", "postgresql://test")
    monkeypatch.setenv("DBF_ADMIN_TOKEN", "test-token")
    monkeypatch.setenv("DBF_MEDIA_STORAGE_MODE", "filesystem")
    monkeypatch.setenv("DBF_MEDIA_LOCAL_ROOT", str(tmp_path))
    monkeypatch.setenv("DBF_MAX_MEDIA_PER_CAR", "10")
    get_settings.cache_clear()

    def handler(request: httpx.Request) -> httpx.Response:
        body = b"\xff\xd8\xff" + request.url.path.encode("utf-8")
        return httpx.Response(
            200,
            headers={"content-type": "image/jpeg"},
            content=body,
        )

    class MockClient(httpx.Client):
        def __init__(self, *args, **kwargs) -> None:
            kwargs["transport"] = httpx.MockTransport(handler)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "Client", MockClient)
    items = persist_media_items(
        [{"url": f"https://example.com/{index}.jpg"} for index in range(25)],
        source_key="bat",
        serial_number="SCFRMHAV2PGR10465",
    )
    get_settings.cache_clear()

    assert len(items) == 10

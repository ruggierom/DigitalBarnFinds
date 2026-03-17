from __future__ import annotations

import hashlib
import logging
import mimetypes
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Protocol

import httpx

from digital_barn_finds.config import get_settings

try:
    from azure.core.exceptions import ResourceExistsError
    from azure.storage.blob import BlobServiceClient, ContentSettings
except ImportError:  # pragma: no cover - exercised when dependency is not installed.
    BlobServiceClient = None
    ContentSettings = None
    ResourceExistsError = Exception

logger = logging.getLogger(__name__)

IMAGE_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/bmp": ".bmp",
}
MANAGED_MEDIA_PREFIXES = ("file://", "dbfblob://")


class MediaBackend(Protocol):
    def store(self, key: str, payload: bytes, *, content_type: str | None = None) -> str: ...


@dataclass(frozen=True)
class StoredMediaAsset:
    url: str
    bytes_written: int
    content_type: str | None = None


class FilesystemMediaBackend:
    def __init__(self, root: Path) -> None:
        self.root = root

    def store(self, key: str, payload: bytes, *, content_type: str | None = None) -> str:
        destination = (self.root / key).resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            destination.write_bytes(payload)
        return f"file://{destination}"


class AzureBlobMediaBackend:
    def __init__(self, connection_string: str, container: str) -> None:
        if BlobServiceClient is None or ContentSettings is None:
            raise RuntimeError("azure-storage-blob is not installed")
        self.connection_string = connection_string
        self.container = container

    def store(self, key: str, payload: bytes, *, content_type: str | None = None) -> str:
        _get_blob_container_ready(self.connection_string, self.container)
        blob_client = _get_blob_service_client(self.connection_string).get_blob_client(
            container=self.container,
            blob=key,
        )
        try:
            blob_client.upload_blob(
                payload,
                overwrite=False,
                content_settings=ContentSettings(content_type=content_type or "application/octet-stream"),
            )
        except ResourceExistsError:
            pass
        return f"dbfblob://{key}"


@lru_cache
def _get_blob_service_client(connection_string: str) -> BlobServiceClient:
    if BlobServiceClient is None:
        raise RuntimeError("azure-storage-blob is not installed")
    return BlobServiceClient.from_connection_string(connection_string)


@lru_cache
def _get_blob_container_ready(connection_string: str, container: str) -> bool:
    client = _get_blob_service_client(connection_string).get_container_client(container)
    _ensure_blob_container(client)
    return True


def _ensure_blob_container(container_client) -> None:
    try:
        container_client.create_container()
    except ResourceExistsError:
        pass


def persist_media_items(
    media_items: list[dict[str, object]],
    *,
    source_key: str,
    serial_number: str,
) -> list[dict[str, object]]:
    settings = get_settings()
    if settings.media_storage_mode.strip().lower() == "remote":
        deduped_remote: list[dict[str, object]] = []
        seen_remote_urls: set[str] = set()
        for item in media_items:
            persisted = dict(item)
            raw_url = str(item.get("url") or "").strip()
            if raw_url and raw_url in seen_remote_urls:
                continue
            if raw_url:
                seen_remote_urls.add(raw_url)
            deduped_remote.append(persisted)
        return deduped_remote

    persisted_items: list[dict[str, object]] = []
    seen_urls: set[str] = set()
    client: httpx.Client | None = None
    try:
        for item in media_items:
            persisted = dict(item)
            raw_url = str(item.get("url") or "").strip()
            if not raw_url or _is_managed_media_reference(raw_url):
                final_url = str(persisted.get("url") or "").strip()
                if final_url and final_url in seen_urls:
                    continue
                if final_url:
                    seen_urls.add(final_url)
                persisted_items.append(persisted)
                continue

            if client is None:
                client = httpx.Client(
                    follow_redirects=True,
                    timeout=settings.media_download_timeout_seconds,
                    headers={"User-Agent": settings.effective_user_agent},
                )

            try:
                stored_asset = persist_remote_media(
                    raw_url,
                    source_key=source_key,
                    serial_number=serial_number,
                    client=client,
                )
                persisted["url"] = stored_asset.url
            except Exception as exc:  # noqa: BLE001
                logger.warning("Falling back to remote media URL %s: %s", raw_url, exc)
            final_url = str(persisted.get("url") or "").strip()
            if final_url and final_url in seen_urls:
                continue
            if final_url:
                seen_urls.add(final_url)
            persisted_items.append(persisted)
    finally:
        if client is not None:
            client.close()

    return persisted_items


def persist_remote_media(
    source_url: str,
    *,
    source_key: str,
    serial_number: str,
    client: httpx.Client,
) -> StoredMediaAsset:
    settings = get_settings()
    content_type: str | None = None
    payload = bytearray()

    with client.stream("GET", source_url) as response:
        response.raise_for_status()
        content_type = _normalize_content_type(response.headers.get("content-type"))
        content_length = response.headers.get("content-length")
        if content_length and int(content_length) > settings.media_download_max_bytes:
            raise ValueError(f"media exceeds max size of {settings.media_download_max_bytes} bytes")

        for chunk in response.iter_bytes():
            payload.extend(chunk)
            if len(payload) > settings.media_download_max_bytes:
                raise ValueError(f"media exceeds max size of {settings.media_download_max_bytes} bytes")

    raw_bytes = bytes(payload)
    if not raw_bytes:
        raise ValueError("media response was empty")
    if not _looks_like_image(source_url, content_type, raw_bytes):
        raise ValueError("media response does not look like an image")

    suffix = _choose_suffix(source_url, content_type, raw_bytes)
    digest = hashlib.sha256(raw_bytes).hexdigest()
    key = _build_storage_key(source_key, serial_number, digest, suffix)
    stored_url = _get_media_backend().store(key, raw_bytes, content_type=content_type)
    return StoredMediaAsset(url=stored_url, bytes_written=len(raw_bytes), content_type=content_type)


def read_blob_media(key: str) -> tuple[bytes, str | None]:
    settings = get_settings()
    if settings.media_storage_mode.strip().lower() != "azure_blob":
        raise RuntimeError("blob media requested while azure blob storage is not configured")
    if not settings.media_storage_connection_string:
        raise RuntimeError("blob media requested without a storage connection string")

    _get_blob_container_ready(settings.media_storage_connection_string, settings.media_storage_container)
    blob_client = _get_blob_service_client(settings.media_storage_connection_string).get_blob_client(
        container=settings.media_storage_container,
        blob=key,
    )
    content_type = None
    props = blob_client.get_blob_properties()
    if props.content_settings:
        content_type = props.content_settings.content_type
    payload = blob_client.download_blob().readall()
    return payload, content_type


def _get_media_backend() -> MediaBackend:
    settings = get_settings()
    if settings.media_storage_mode.strip().lower() == "azure_blob":
        if not settings.media_storage_connection_string:
            raise RuntimeError("DBF_MEDIA_STORAGE_CONNECTION_STRING is required for azure_blob mode")
        _get_blob_container_ready(settings.media_storage_connection_string, settings.media_storage_container)
        return AzureBlobMediaBackend(
            connection_string=settings.media_storage_connection_string,
            container=settings.media_storage_container,
        )
    return FilesystemMediaBackend(settings.media_local_root_path)


def _is_managed_media_reference(url: str) -> bool:
    return url.startswith(MANAGED_MEDIA_PREFIXES)


def _build_storage_key(source_key: str, serial_number: str, digest: str, suffix: str) -> str:
    source_fragment = _slugify_segment(source_key, fallback="source")
    serial_fragment = _slugify_segment(serial_number, fallback="car")
    return f"{source_fragment}/{serial_fragment}/{digest[:24]}{suffix}"


def _slugify_segment(value: str, *, fallback: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized[:80] or fallback


def _normalize_content_type(value: str | None) -> str | None:
    if not value:
        return None
    return value.split(";", 1)[0].strip().lower() or None


def _choose_suffix(source_url: str, content_type: str | None, payload: bytes) -> str:
    if content_type in IMAGE_CONTENT_TYPES:
        return IMAGE_CONTENT_TYPES[content_type]

    guessed_type, _ = mimetypes.guess_type(source_url)
    if guessed_type in IMAGE_CONTENT_TYPES:
        return IMAGE_CONTENT_TYPES[guessed_type]

    if payload.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if payload.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if payload.startswith(b"BM"):
        return ".bmp"
    if payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return ".webp"
    if payload[4:12] in {b"ftypavif", b"ftypavis"}:
        return ".avif"
    return ".img"


def _looks_like_image(source_url: str, content_type: str | None, payload: bytes) -> bool:
    if content_type and content_type.startswith("image/"):
        return True

    guessed_type, _ = mimetypes.guess_type(source_url)
    if guessed_type and guessed_type.startswith("image/"):
        return True

    return _choose_suffix(source_url, content_type, payload) != ".img"

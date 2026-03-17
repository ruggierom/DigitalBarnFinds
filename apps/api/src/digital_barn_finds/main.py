from __future__ import annotations

import csv
import html
import re
import unicodedata
from datetime import date, datetime
from io import BytesIO, StringIO
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlparse

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from openpyxl import Workbook
from sqlalchemy import Float, String, case, cast, func, literal, or_
from sqlalchemy.orm import Session

from digital_barn_finds.config import get_settings
from digital_barn_finds.database import get_db
from digital_barn_finds.deps import require_admin_token
from digital_barn_finds.models import (
    AppSetting,
    Car,
    CarEvent,
    CarMedia,
    CarSource,
    CustodyEvent,
    DarknessScore,
    ScrapeLog,
    Source,
    WatchlistEntry,
)
from digital_barn_finds.schemas import (
    CarMediaItem,
    CarSourceItem,
    CarTimelineItem,
    CarListItem,
    CarEnrichmentResultItem,
    EnrichmentRunResultItem,
    ImportUrlRequest,
    ImportUrlResultItem,
    ResearchLinkItem,
    SearchCandidateItem,
    DashboardSnapshot,
    BarchettaRequestDiagnostics,
    RegistryStats,
    RequestLabInput,
    RequestLabResult,
    RequestHeaderItem,
    RequestPreview,
    ResponsePreview,
    SettingItem,
    SettingUpdate,
    SourceSummary,
    WatchlistItem,
    WatchlistUpdate,
)
from digital_barn_finds.services.darkness import compute_scores
from digital_barn_finds.services.enrichment import enrich_cars
from digital_barn_finds.services.fetch_more import fetch_random_cars
from digital_barn_finds.services.import_by_url import import_car_from_url
from digital_barn_finds.services.media_backfill import cache_existing_media
from digital_barn_finds.services.media_storage import read_blob_media
from digital_barn_finds.services.research import build_research_links
from digital_barn_finds.services.reset_content import reset_content
from digital_barn_finds.seed import seed_sources

settings = get_settings()
app = FastAPI(title="DigitalBarnFinds API", version="0.1.1")
FIXTURE_ROOT = Path(__file__).resolve().parents[2] / "fixtures"
LOCAL_MEDIA_ROOT = settings.media_local_root_path
RENDERABLE_EXTENSIONS = ("jpg", "jpeg", "png", "webp", "gif", "avif", "bmp", "jfif")
EXPORT_COLUMNS = [
    ("serial_number", "Vehicle ID"),
    ("make", "Make"),
    ("model", "Model"),
    ("variant", "Variant"),
    ("year_built", "Year Built"),
    ("build_date_label", "Build Date"),
    ("build_date_precision", "Build Date Precision"),
    ("body_style", "Body Style"),
    ("drive_side", "Drive Side"),
    ("original_color", "Original Color"),
    ("darkness_score", "Darkness Score"),
    ("last_known_year", "Last Known Year"),
    ("gap_years", "Longest Gap Years"),
    ("years_since_last_seen", "Years Since Last Seen"),
    ("is_currently_dark", "Currently Dark"),
    ("qualifies_primary", "Primary Candidate"),
    ("qualifies_secondary", "Secondary Candidate"),
    ("watchlist_status", "Watchlist Status"),
    ("source_count", "Source Count"),
    ("source_names", "Source Names"),
    ("source_urls", "Source URLs"),
    ("image_count", "Image Count"),
    ("lead_image_url", "Lead Image URL"),
    ("notes", "Notes"),
]
COUNTRY_LABELS = {
    "AE": "United Arab Emirates",
    "AT": "Austria",
    "AU": "Australia",
    "BE": "Belgium",
    "CA": "Canada",
    "CH": "Switzerland",
    "DE": "Germany",
    "DK": "Denmark",
    "ES": "Spain",
    "FR": "France",
    "GB": "United Kingdom",
    "IT": "Italy",
    "JP": "Japan",
    "LU": "Luxembourg",
    "MC": "Monaco",
    "MX": "Mexico",
    "NL": "Netherlands",
    "NO": "Norway",
    "NZ": "New Zealand",
    "PT": "Portugal",
    "SE": "Sweden",
    "US": "United States",
    "ZA": "South Africa",
}
COUNTRY_ALIASES = {
    "AE": (
        "united arab emirates",
        "uae",
        "dubai",
        "abu dhabi",
    ),
    "AT": ("austria", "vienna"),
    "AU": ("australia", "sydney", "melbourne"),
    "BE": ("belgium", "brussels", "bruxelles"),
    "CA": ("canada", "toronto", "montreal", "vancouver"),
    "CH": ("switzerland", "geneva", "genève", "zurich"),
    "DE": ("germany", "deutschland", "duesseldorf", "dusseldorf", "nurburgring", "nürburgring"),
    "DK": ("denmark", "copenhagen"),
    "ES": ("spain", "madrid", "barcelona"),
    "FR": ("france", "paris", "bagatelle", "retromobile"),
    "GB": (
        "united kingdom",
        "great britain",
        "britain",
        "england",
        "london",
        "goodwood",
        "silverstone",
        "bicester",
        "ascot",
        "scotland",
        "wales",
    ),
    "IT": ("italy", "torino", "turin", "modena", "milan", "milano", "verona", "monza", "rome", "maranello"),
    "JP": ("japan", "tokyo", "osaka", "yokohama"),
    "LU": ("luxembourg",),
    "MC": ("monaco", "monte carlo"),
    "MX": ("mexico", "culiacan", "culiacán", "mexico city"),
    "NL": ("netherlands", "dutch", "amsterdam", "rotterdam"),
    "NO": ("norway", "oslo"),
    "NZ": ("new zealand", "auckland"),
    "PT": ("portugal", "lisbon"),
    "SE": ("sweden", "stockholm"),
    "US": (
        "united states",
        "usa",
        "u s a",
        "america",
        "washington dc",
        "fort lauderdale",
        "homestead",
        "sebring",
        "amelia island",
        "pebble beach",
        "monterey",
        "scottsdale",
        "florida",
        "california",
        "new york",
        "los angeles",
        "miami",
    ),
    "ZA": ("south africa", "johannesburg", "cape town"),
}
SHORT_COUNTRY_LOCATION_TOKENS = {
    "b": "BE",
    "ch": "CH",
    "d": "DE",
    "f": "FR",
    "gb": "GB",
    "i": "IT",
    "j": "JP",
    "jp": "JP",
    "nl": "NL",
    "uk": "GB",
    "us": "US",
    "usa": "US",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.api_route("/debug/echo", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"])
async def debug_echo(request: Request) -> dict[str, object]:
    body = await request.body()
    return {
        "method": request.method,
        "url": str(request.url),
        "headers": dict(request.headers),
        "body": body.decode("utf-8", errors="replace"),
    }


@app.get("/media/local")
def get_local_media(path: str = Query(...)) -> FileResponse:
    candidate = Path(unquote(path)).resolve()
    if not candidate.exists() or not _is_allowed_local_media_path(candidate):
        raise HTTPException(status_code=404, detail="Media not found.")
    return FileResponse(candidate)


@app.get("/media/blob")
def get_blob_media(key: str = Query(...)) -> StreamingResponse:
    try:
        payload, content_type = read_blob_media(unquote(key))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=404, detail=f"Blob media not found: {exc}") from exc
    return StreamingResponse(
        BytesIO(payload),
        media_type=content_type or "application/octet-stream",
    )


@app.get("/dashboard", response_model=DashboardSnapshot, dependencies=[Depends(require_admin_token)])
def get_dashboard(db: Session = Depends(get_db)) -> DashboardSnapshot:
    candidate_count = (
        db.query(func.count(DarknessScore.id))
        .filter(or_(DarknessScore.qualifies_primary.is_(True), DarknessScore.qualifies_secondary.is_(True)))
        .scalar()
        or 0
    )
    watchlist_count = db.query(func.count(WatchlistEntry.id)).scalar() or 0
    source_count = db.query(func.count(Source.id)).filter(Source.enabled.is_(True)).scalar() or 0
    dark_now_count = (
        db.query(func.count(DarknessScore.id))
        .filter(DarknessScore.is_currently_dark.is_(True))
        .scalar()
        or 0
    )
    return DashboardSnapshot(
        candidate_count=candidate_count,
        watchlist_count=watchlist_count,
        source_count=source_count,
        dark_now_count=dark_now_count,
    )


@app.get("/stats", response_model=RegistryStats)
def get_registry_stats(db: Session = Depends(get_db)) -> RegistryStats:
    total_cars = db.query(func.count(Car.id)).scalar() or 0
    cars_with_media = db.query(func.count(func.distinct(CarMedia.car_id))).scalar() or 0
    media_rows = db.query(func.count(CarMedia.id)).scalar() or 0
    enabled_sources = db.query(func.count(Source.id)).filter(Source.enabled.is_(True)).scalar() or 0
    watchlist_count = db.query(func.count(WatchlistEntry.id)).scalar() or 0
    dark_now_count = (
        db.query(func.count(DarknessScore.id))
        .filter(DarknessScore.is_currently_dark.is_(True))
        .scalar()
        or 0
    )
    primary_candidate_count = (
        db.query(func.count(DarknessScore.id))
        .filter(DarknessScore.qualifies_primary.is_(True))
        .scalar()
        or 0
    )
    secondary_candidate_count = (
        db.query(func.count(DarknessScore.id))
        .filter(DarknessScore.qualifies_secondary.is_(True))
        .scalar()
        or 0
    )

    return RegistryStats(
        total_cars=total_cars,
        cars_with_media=cars_with_media,
        media_rows=media_rows,
        enabled_sources=enabled_sources,
        watchlist_count=watchlist_count,
        dark_now_count=dark_now_count,
        primary_candidate_count=primary_candidate_count,
        secondary_candidate_count=secondary_candidate_count,
    )


@app.get("/cars", response_model=list[CarListItem], dependencies=[Depends(require_admin_token)])
def list_cars(
    request: Request,
    q: str | None = Query(default=None),
    query: str | None = Query(default=None),
    candidates_only: bool | None = Query(default=None),
    make: str | None = Query(default=None),
    model: str | None = Query(default=None),
    drive_side: str | None = Query(default=None),
    original_color: str | None = Query(default=None),
    source: str | None = Query(default=None),
    serial_number: str | None = Query(default=None),
    build_date: date | None = Query(default=None),
    year_from: int | None = Query(default=None, ge=1800, le=2100),
    year_to: int | None = Query(default=None, ge=1800, le=2100),
    last_seen_before: int | None = Query(default=None, ge=1800, le=2100),
    score_min: float | None = Query(default=None, ge=0, le=100),
    score_max: float | None = Query(default=None, ge=0, le=100),
    dark_now: bool | None = Query(default=None),
    has_images: bool | None = Query(default=None),
    sort: str = Query(default="relevance"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[CarListItem]:
    cars = _run_car_query(
        db=db,
        q=q,
        query=query,
        candidates_only=candidates_only,
        make=make,
        model=model,
        drive_side=drive_side,
        original_color=original_color,
        source=source,
        serial_number=serial_number,
        build_date=build_date,
        year_from=year_from,
        year_to=year_to,
        last_seen_before=last_seen_before,
        score_min=score_min,
        score_max=score_max,
        dark_now=dark_now,
        has_images=has_images,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return [_serialize_car(car, request) for car in cars]


@app.get("/cars/export", dependencies=[Depends(require_admin_token)])
def export_cars(
    request: Request,
    format: str = Query(default="csv", pattern="^(csv|xlsx)$"),
    q: str | None = Query(default=None),
    query: str | None = Query(default=None),
    candidates_only: bool | None = Query(default=None),
    make: str | None = Query(default=None),
    model: str | None = Query(default=None),
    drive_side: str | None = Query(default=None),
    original_color: str | None = Query(default=None),
    source: str | None = Query(default=None),
    serial_number: str | None = Query(default=None),
    build_date: date | None = Query(default=None),
    year_from: int | None = Query(default=None, ge=1800, le=2100),
    year_to: int | None = Query(default=None, ge=1800, le=2100),
    last_seen_before: int | None = Query(default=None, ge=1800, le=2100),
    score_min: float | None = Query(default=None, ge=0, le=100),
    score_max: float | None = Query(default=None, ge=0, le=100),
    dark_now: bool | None = Query(default=None),
    has_images: bool | None = Query(default=None),
    sort: str = Query(default="relevance"),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    cars = _run_car_query(
        db=db,
        q=q,
        query=query,
        candidates_only=candidates_only,
        make=make,
        model=model,
        drive_side=drive_side,
        original_color=original_color,
        source=source,
        serial_number=serial_number,
        build_date=build_date,
        year_from=year_from,
        year_to=year_to,
        last_seen_before=last_seen_before,
        score_min=score_min,
        score_max=score_max,
        dark_now=dark_now,
        has_images=has_images,
        sort=sort,
        page=1,
        page_size=5000,
    )
    rows = [_export_row(_serialize_car(car, request)) for car in cars]
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")

    if format == "xlsx":
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = "Cars"
        worksheet.append([label for _, label in EXPORT_COLUMNS])
        for row in rows:
            worksheet.append([row[key] for key, _ in EXPORT_COLUMNS])
        content = BytesIO()
        workbook.save(content)
        content.seek(0)
        return StreamingResponse(
            content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="digital-barn-finds-{timestamp}.xlsx"'},
        )

    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=[key for key, _ in EXPORT_COLUMNS])
    writer.writeheader()
    writer.writerows(rows)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="digital-barn-finds-{timestamp}.csv"'},
    )


@app.get("/cars/{car_id}/research-links", response_model=list[ResearchLinkItem], dependencies=[Depends(require_admin_token)])
def get_car_research_links(car_id: str, db: Session = Depends(get_db)) -> list[ResearchLinkItem]:
    car = db.query(Car).filter(Car.id == car_id).one_or_none()
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found.")
    return [ResearchLinkItem(**link.__dict__) for link in build_research_links(car, car.sources)]


def _is_renderable_media_item(media_type: str | None, url: str | None) -> bool:
    normalized_type = (media_type or "").lower()
    normalized_url = (url or "").lower()

    if normalized_type.startswith("image/"):
        return True

    return any(
        normalized_url.endswith(f".{extension}") or f".{extension}?" in normalized_url
        for extension in RENDERABLE_EXTENSIONS
    )


def _run_car_query(
    *,
    db: Session,
    q: str | None,
    query: str | None,
    candidates_only: bool | None,
    make: str | None,
    model: str | None,
    drive_side: str | None,
    original_color: str | None,
    source: str | None,
    serial_number: str | None,
    build_date: date | None,
    year_from: int | None,
    year_to: int | None,
    last_seen_before: int | None,
    score_min: float | None,
    score_max: float | None,
    dark_now: bool | None,
    has_images: bool | None,
    sort: str,
    page: int,
    page_size: int,
) -> list[Car]:
    dialect_name = db.bind.dialect.name if db.bind is not None else ""
    search_text = _normalize_search_text(q or query)
    car_query = db.query(Car).outerjoin(DarknessScore)

    if make:
        car_query = car_query.filter(func.lower(Car.make).like(f"%{make.strip().lower()}%"))
    if model:
        car_query = car_query.filter(func.lower(Car.model).like(f"%{model.strip().lower()}%"))
    if drive_side:
        car_query = car_query.filter(func.lower(func.coalesce(Car.drive_side, "")).like(f"%{drive_side.strip().lower()}%"))
    if original_color:
        car_query = car_query.filter(
            func.lower(func.coalesce(Car.original_color, "")).like(f"%{original_color.strip().lower()}%")
        )
    if serial_number:
        car_query = car_query.filter(
            func.lower(Car.display_serial_number).like(f"%{serial_number.strip().lower()}%")
        )
    if build_date is not None:
        car_query = car_query.filter(Car.build_date == build_date)
    if source:
        source_term = f"%{source.strip().lower()}%"
        car_query = car_query.filter(
            Car.sources.any(
                or_(
                    func.lower(CarSource.source_url).like(source_term),
                    func.lower(CarSource.source_serial_number).like(source_term),
                    func.lower(CarSource.source_make).like(source_term),
                    func.lower(CarSource.source_model).like(source_term),
                    CarSource.source.has(func.lower(Source.name).like(source_term)),
                )
            )
        )
    if year_from is not None:
        car_query = car_query.filter(Car.year_built.is_not(None), Car.year_built >= year_from)
    if year_to is not None:
        car_query = car_query.filter(Car.year_built.is_not(None), Car.year_built <= year_to)
    if last_seen_before is not None:
        car_query = car_query.filter(
            DarknessScore.last_known_year.is_not(None),
            DarknessScore.last_known_year <= last_seen_before,
        )
    if score_min is not None:
        car_query = car_query.filter(DarknessScore.score.is_not(None), DarknessScore.score >= score_min)
    if score_max is not None:
        car_query = car_query.filter(DarknessScore.score.is_not(None), DarknessScore.score <= score_max)
    if dark_now is not None:
        car_query = car_query.filter(DarknessScore.is_currently_dark.is_(dark_now))
    if candidates_only:
        car_query = car_query.filter(
            or_(
                DarknessScore.qualifies_primary.is_(True),
                DarknessScore.qualifies_secondary.is_(True),
            )
        )
    if has_images is not None:
        image_predicate = Car.media_items.any()
        car_query = car_query.filter(image_predicate if has_images else ~image_predicate)

    score_expression = literal(0.0)
    if search_text:
        lowered = search_text.lower()
        like_term = f"%{lowered}%"
        starts_term = f"{lowered}%"

        direct_match = or_(
            func.lower(Car.display_serial_number).like(like_term),
            func.lower(Car.make).like(like_term),
            func.lower(Car.model).like(like_term),
            func.lower(func.coalesce(Car.variant, "")).like(like_term),
            func.lower(func.coalesce(Car.notes, "")).like(like_term),
        )
        source_match = Car.sources.any(
            or_(
                func.lower(CarSource.source_url).like(like_term),
                func.lower(CarSource.source_serial_number).like(like_term),
                func.lower(func.coalesce(CarSource.source_make, "")).like(like_term),
                func.lower(func.coalesce(CarSource.source_model, "")).like(like_term),
                func.lower(func.coalesce(CarSource.source_variant, "")).like(like_term),
                CarSource.source.has(func.lower(Source.name).like(like_term)),
            )
        )
        custody_match = Car.custody_events.any(
            or_(
                func.lower(func.coalesce(CustodyEvent.owner_name, "")).like(like_term),
                func.lower(func.coalesce(CustodyEvent.location, "")).like(like_term),
                func.lower(func.coalesce(CustodyEvent.transaction_notes, "")).like(like_term),
                func.lower(func.coalesce(CustodyEvent.source_reference, "")).like(like_term),
            )
        )
        event_match = Car.car_events.any(
            or_(
                func.lower(func.coalesce(CarEvent.event_name, "")).like(like_term),
                func.lower(func.coalesce(CarEvent.driver, "")).like(like_term),
                func.lower(func.coalesce(CarEvent.location, "")).like(like_term),
                func.lower(func.coalesce(CarEvent.result, "")).like(like_term),
                func.lower(func.coalesce(CarEvent.source_reference, "")).like(like_term),
            )
        )

        fulltext_rank = literal(0.0)
        if dialect_name == "postgresql":
            ts_query = func.websearch_to_tsquery("simple", search_text)
            search_document = func.concat_ws(
                " ",
                Car.display_serial_number,
                Car.make,
                Car.model,
                func.coalesce(Car.variant, ""),
                func.coalesce(Car.drive_side, ""),
                func.coalesce(Car.original_color, ""),
                func.coalesce(cast(Car.build_date, String), ""),
                func.coalesce(Car.notes, ""),
            )
            fulltext_rank = func.ts_rank_cd(
                func.to_tsvector("simple", search_document),
                ts_query,
            )

        car_query = car_query.filter(or_(direct_match, source_match, custody_match, event_match, fulltext_rank > 0))

        score_expression = (
            case((func.lower(Car.display_serial_number) == lowered, 120.0), else_=0.0)
            + case((func.lower(Car.display_serial_number).like(starts_term), 60.0), else_=0.0)
            + case((func.lower(Car.model).like(starts_term), 28.0), else_=0.0)
            + case((func.lower(Car.make).like(starts_term), 18.0), else_=0.0)
            + case((source_match, 14.0), else_=0.0)
            + case((custody_match, 12.0), else_=0.0)
            + case((event_match, 12.0), else_=0.0)
            + case((Car.media_items.any(), 3.0), else_=0.0)
            + func.coalesce(cast(fulltext_rank, Float), 0.0) * 20.0
            + func.coalesce(cast(DarknessScore.score, Float), 0.0) * 0.05
        )

    order_map = {
        "relevance": [
            score_expression.desc(),
            DarknessScore.score.desc().nullslast(),
            Car.display_serial_number.asc(),
        ]
        if search_text
        else [
            DarknessScore.score.desc().nullslast(),
            DarknessScore.last_known_year.asc().nullslast(),
            Car.display_serial_number.asc(),
        ],
        "darkness_score_desc": [
            DarknessScore.score.desc().nullslast(),
            DarknessScore.last_known_year.asc().nullslast(),
            Car.display_serial_number.asc(),
        ],
        "last_known_year_asc": [
            DarknessScore.last_known_year.asc().nullslast(),
            DarknessScore.score.desc().nullslast(),
            Car.display_serial_number.asc(),
        ],
        "recently_imported_desc": [
            Car.updated_at.desc(),
            Car.display_serial_number.asc(),
        ],
    }
    ordering = order_map.get(sort, order_map["relevance"])
    return (
        car_query.order_by(*ordering)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )


def _serialize_car(car: Car, request: Request | None = None) -> CarListItem:
    last_seen_location, last_seen_country_code, last_seen_country_name = _resolve_last_seen_place(car)
    timeline = sorted(
        [
            CarTimelineItem(
                kind="custody",
                event_date=(
                    datetime.combine(event.event_date, datetime.min.time())
                    if event.event_date is not None
                    else None
                ),
                event_date_label=_format_date_label(event.event_date, event.event_date_precision, event.event_year),
                event_date_precision=event.event_date_precision,
                event_year=event.event_year,
                title=_clean_text(event.owner_name) or "Ownership entry",
                subtitle=_clean_text(event.location),
                detail=_clean_text(event.transaction_notes),
                source_reference=_clean_text(event.source_reference),
            )
            for event in car.custody_events
        ]
        + [
            CarTimelineItem(
                kind="event",
                event_date=(
                    datetime.combine(event.event_date, datetime.min.time())
                    if event.event_date is not None
                    else None
                ),
                event_date_label=_format_date_label(event.event_date, event.event_date_precision, event.event_year),
                event_date_precision=event.event_date_precision,
                event_year=event.event_year,
                title=_clean_text(event.event_name) or "Car event",
                subtitle=_clean_text(event.driver),
                detail=" | ".join(
                    cleaned_part
                    for part in [event.result, event.location, event.car_number]
                    if (cleaned_part := _clean_text(part))
                )
                or None,
                source_reference=_clean_text(event.source_reference),
            )
            for event in car.car_events
        ],
        key=lambda item: (item.event_year or 0, item.event_date.isoformat() if item.event_date else ""),
        reverse=True,
    )
    return CarListItem(
        id=car.id,
        serial_number=car.display_serial_number,
        make=_clean_text(car.make) or car.make,
        model=_clean_text(car.model) or car.model,
        variant=_clean_text(car.variant),
        year_built=car.year_built,
        build_date=car.build_date,
        build_date_precision=car.build_date_precision,
        build_date_label=_format_structured_date(car.build_date, car.build_date_precision),
        body_style=_clean_text(car.body_style),
        drive_side=_clean_text(car.drive_side),
        original_color=_clean_text(car.original_color),
        notes=_clean_text(car.notes),
        source_count=car.source_count,
        darkness_score=car.darkness_score.score if car.darkness_score else None,
        last_known_year=car.darkness_score.last_known_year if car.darkness_score else None,
        gap_years=car.darkness_score.gap_years if car.darkness_score else None,
        years_since_last_seen=car.darkness_score.years_since_last_seen if car.darkness_score else None,
        last_seen_location=last_seen_location,
        last_seen_country_code=last_seen_country_code,
        last_seen_country_name=last_seen_country_name,
        is_currently_dark=car.darkness_score.is_currently_dark if car.darkness_score else False,
        qualifies_primary=car.darkness_score.qualifies_primary if car.darkness_score else False,
        qualifies_secondary=car.darkness_score.qualifies_secondary if car.darkness_score else False,
        watchlist_status=car.watchlist_entry.status if car.watchlist_entry else None,
        sources=[
            CarSourceItem(
                source_name=_clean_text(source.source.name) or source.source.name,
                source_url=source.source_url,
                source_serial_number=_clean_text(source.source_serial_number) or source.source_serial_number,
                scraped_at=source.scraped_at,
            )
            for source in sorted(car.sources, key=lambda item: item.scraped_at, reverse=True)
        ],
        media=[
            CarMediaItem(
                media_type=media.media_type,
                url=_resolve_media_url(media.url, request),
                caption=_clean_text(media.caption),
            )
            for media in sorted(
                car.media_items,
                key=lambda item: (
                    not _is_renderable_media_item(item.media_type, item.url),
                    -int(item.scraped_at.timestamp()),
                ),
            )
        ],
        timeline=timeline,
    )


def _export_row(item: CarListItem) -> dict[str, str | int | float | bool]:
    lead_image = next((media.url for media in item.media if _is_renderable_media_item(media.media_type, media.url)), "")
    source_urls = "\n".join(source.source_url for source in item.sources)
    source_names = "\n".join(sorted({source.source_name for source in item.sources}))
    return {
        "serial_number": item.serial_number,
        "make": item.make,
        "model": item.model,
        "variant": item.variant or "",
        "year_built": item.year_built or "",
        "build_date_label": item.build_date_label or "",
        "build_date_precision": item.build_date_precision or "",
        "body_style": item.body_style or "",
        "drive_side": item.drive_side or "",
        "original_color": item.original_color or "",
        "darkness_score": float(item.darkness_score) if item.darkness_score is not None else "",
        "last_known_year": item.last_known_year or "",
        "gap_years": item.gap_years or "",
        "years_since_last_seen": item.years_since_last_seen or "",
        "is_currently_dark": item.is_currently_dark,
        "qualifies_primary": item.qualifies_primary,
        "qualifies_secondary": item.qualifies_secondary,
        "watchlist_status": item.watchlist_status or "",
        "source_count": item.source_count,
        "source_names": source_names,
        "source_urls": source_urls,
        "image_count": len(item.media),
        "lead_image_url": lead_image,
        "notes": item.notes or "",
    }


def _format_structured_date(value: date | None, precision: str | None) -> str | None:
    if value is None:
        return None

    normalized_precision = precision or "day"
    if normalized_precision == "year":
        return f"{value.year}"
    if normalized_precision == "month":
        return value.strftime("%Y/%b").lower()
    return value.strftime("%Y/%b/%d").lower()


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = html.unescape(value).replace("\xa0", " ").strip()
    return cleaned or None


def _resolve_last_seen_place(car: Car) -> tuple[str | None, str | None, str | None]:
    candidates: list[tuple[int, str, str | None, str | None, str | None]] = []

    for event in car.custody_events:
        location = _clean_text(event.location)
        context = " | ".join(
            part
            for part in [
                location,
                _clean_text(event.owner_name),
                _clean_text(event.transaction_notes),
                _clean_text(event.source_reference),
            ]
            if part
        )
        country_code, country_name = _extract_country_marker(location, context)
        candidates.append(
            (
                event.event_year or (event.event_date.year if event.event_date else 0),
                event.event_date.isoformat() if event.event_date else "",
                location,
                country_code,
                country_name,
            )
        )

    for event in car.car_events:
        location = _clean_text(event.location)
        context = " | ".join(
            part
            for part in [
                location,
                _clean_text(event.event_name),
                _clean_text(event.result),
                _clean_text(event.source_reference),
            ]
            if part
        )
        country_code, country_name = _extract_country_marker(location, context)
        candidates.append(
            (
                event.event_year or (event.event_date.year if event.event_date else 0),
                event.event_date.isoformat() if event.event_date else "",
                location,
                country_code,
                country_name,
            )
        )

    for _, _, location, country_code, country_name in sorted(
        candidates,
        key=lambda item: (item[0], item[1]),
        reverse=True,
    ):
        if not location and not country_code:
            continue
        cleaned_location = _normalize_last_seen_location(location, country_code, country_name)
        if cleaned_location or country_code:
            return cleaned_location, country_code, country_name

    return None, None, None


def _extract_country_marker(location: str | None, context: str | None) -> tuple[str | None, str | None]:
    normalized_location = _normalize_country_text(location)
    normalized_context = _normalize_country_text(context)
    haystacks = [normalized_location, normalized_context]

    for haystack in haystacks:
        if not haystack:
            continue
        padded = f" {haystack} "
        for country_code, aliases in COUNTRY_ALIASES.items():
            if any(f" {alias} " in padded for alias in aliases):
                return country_code, COUNTRY_LABELS[country_code]

    if normalized_location:
        for token in normalized_location.split():
            if token in SHORT_COUNTRY_LOCATION_TOKENS:
                country_code = SHORT_COUNTRY_LOCATION_TOKENS[token]
                return country_code, COUNTRY_LABELS[country_code]

    return None, None


def _normalize_last_seen_location(
    location: str | None,
    country_code: str | None,
    country_name: str | None,
) -> str | None:
    cleaned = _clean_text(location)
    if cleaned is None:
        return country_name

    normalized = _normalize_country_text(cleaned)
    if not normalized or re.fullmatch(r"0+([.\-]+0+)*", normalized):
        return country_name

    if country_name:
        lowered = cleaned.lower()
        if lowered == country_name.lower() or lowered == (country_code or "").lower():
            return country_name
        if " asking " in lowered or "advertised" in lowered:
            return country_name
        if normalized.startswith("000") or "not sold" in normalized:
            return country_name

    return cleaned


def _normalize_country_text(value: str | None) -> str:
    if not value:
        return ""
    ascii_text = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    return re.sub(r"[^a-z0-9]+", " ", ascii_text.lower()).strip()


@app.get("/watchlist", response_model=list[WatchlistItem], dependencies=[Depends(require_admin_token)])
def get_watchlist(db: Session = Depends(get_db)) -> list[WatchlistItem]:
    entries = db.query(WatchlistEntry).join(Car).order_by(WatchlistEntry.priority.asc()).all()
    return [
        WatchlistItem(
            car_id=entry.car_id,
            serial_number=entry.car.display_serial_number,
            make=_clean_text(entry.car.make) or entry.car.make,
            model=_clean_text(entry.car.model) or entry.car.model,
            priority=entry.priority,
            status=entry.status,
            score=entry.car.darkness_score.score if entry.car.darkness_score else None,
            interest_reason=_clean_text(entry.interest_reason),
            agent_instructions=_clean_text(entry.agent_instructions),
            notes=_clean_text(entry.notes),
            updated_at=entry.updated_at,
        )
        for entry in entries
    ]


@app.put(
    "/watchlist/{car_id}",
    response_model=WatchlistItem,
    dependencies=[Depends(require_admin_token)],
)
def upsert_watchlist_item(
    car_id: str,
    payload: WatchlistUpdate,
    db: Session = Depends(get_db),
) -> WatchlistItem:
    car = db.query(Car).filter(Car.id == car_id).one()
    entry = db.query(WatchlistEntry).filter(WatchlistEntry.car_id == car.id).one_or_none()
    if entry is None:
        entry = WatchlistEntry(car_id=car.id, priority=payload.priority, status=payload.status)
        db.add(entry)

    entry.priority = payload.priority
    entry.status = payload.status
    entry.interest_reason = payload.interest_reason
    entry.agent_instructions = payload.agent_instructions
    entry.notes = payload.notes
    db.commit()
    db.refresh(entry)
    return WatchlistItem(
        car_id=entry.car_id,
        serial_number=car.display_serial_number,
        make=_clean_text(car.make) or car.make,
        model=_clean_text(car.model) or car.model,
        priority=entry.priority,
        status=entry.status,
        score=car.darkness_score.score if car.darkness_score else None,
        interest_reason=_clean_text(entry.interest_reason),
        agent_instructions=_clean_text(entry.agent_instructions),
        notes=_clean_text(entry.notes),
        updated_at=entry.updated_at,
    )


@app.get("/sources", response_model=list[SourceSummary], dependencies=[Depends(require_admin_token)])
def list_sources(db: Session = Depends(get_db)) -> list[SourceSummary]:
    sources = db.query(Source).order_by(Source.name.asc()).all()
    results: list[SourceSummary] = []
    for source in sources:
        latest_log = (
            db.query(ScrapeLog)
            .filter(ScrapeLog.source_id == source.id)
            .order_by(ScrapeLog.run_at.desc())
            .first()
        )
        results.append(
            SourceSummary(
                id=source.id,
                name=_clean_text(source.name) or source.name,
                base_url=source.base_url,
                scraper_key=source.scraper_key,
                enabled=source.enabled,
                last_scraped_at=source.last_scraped_at,
                last_status=_clean_text(latest_log.status) if latest_log else None,
            )
        )
    return results


@app.get("/settings", response_model=list[SettingItem], dependencies=[Depends(require_admin_token)])
def list_settings(db: Session = Depends(get_db)) -> list[SettingItem]:
    return [
        SettingItem(
            key=setting.key,
            value=setting.value,
            description=_clean_text(setting.description),
            updated_at=setting.updated_at,
        )
        for setting in db.query(AppSetting).order_by(AppSetting.key.asc()).all()
    ]


@app.put(
    "/settings/{key}",
    response_model=SettingItem,
    dependencies=[Depends(require_admin_token)],
)
def update_setting(
    key: str,
    payload: SettingUpdate,
    db: Session = Depends(get_db),
) -> SettingItem:
    setting = db.query(AppSetting).filter(AppSetting.key == key).one_or_none()
    if setting is None:
        setting = AppSetting(key=key, value=payload.value)
        db.add(setting)
    else:
        setting.value = payload.value

    db.commit()
    db.refresh(setting)
    return SettingItem(
        key=setting.key,
        value=setting.value,
        description=_clean_text(setting.description),
        updated_at=setting.updated_at,
    )


@app.post("/admin/jobs/score", dependencies=[Depends(require_admin_token)])
def run_scoring(db: Session = Depends(get_db)) -> dict[str, int]:
    processed = compute_scores(db)
    return {"processed": processed}


@app.post("/admin/jobs/cache-media", dependencies=[Depends(require_admin_token)])
def run_cache_media(
    limit: int = Query(default=100, ge=1, le=1000),
    scraper_key: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    result = cache_existing_media(db, limit=limit, scraper_key=scraper_key)
    return {
        "requested": result.requested,
        "updated": result.updated,
        "deduped": result.deduped,
        "skipped": result.skipped,
        "remaining_remote": result.remaining_remote,
        "scraper_key": result.scraper_key,
        "errors": result.errors or [],
    }


@app.post("/admin/jobs/reset-content", dependencies=[Depends(require_admin_token)])
def run_reset_content(
    include_watchlist: bool = Query(default=True),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    result = reset_content(db, include_watchlist=include_watchlist)
    return {
        "status": "ok",
        "deleted_car_media": result.deleted_car_media,
        "deleted_car_events": result.deleted_car_events,
        "deleted_custody_events": result.deleted_custody_events,
        "deleted_car_attributes": result.deleted_car_attributes,
        "deleted_watchlist": result.deleted_watchlist,
        "deleted_darkness_scores": result.deleted_darkness_scores,
        "deleted_car_sources": result.deleted_car_sources,
        "deleted_cars": result.deleted_cars,
        "deleted_scrape_logs": result.deleted_scrape_logs,
        "reset_sources": result.reset_sources,
        "include_watchlist": include_watchlist,
    }


@app.post("/admin/jobs/seed", dependencies=[Depends(require_admin_token)])
def run_seed_sources(db: Session = Depends(get_db)) -> dict[str, object]:
    seed_sources()
    enabled_source_count = db.query(func.count(Source.id)).filter(Source.enabled.is_(True)).scalar() or 0
    return {
        "status": "ok",
        "enabled_sources": enabled_source_count,
    }


@app.post(
    "/admin/jobs/enrich",
    response_model=EnrichmentRunResultItem,
    dependencies=[Depends(require_admin_token)],
)
def run_enrichment(
    car_id: str | None = Query(default=None),
    serial_number: str | None = Query(default=None),
    limit: int = Query(default=1, ge=1, le=100),
    max_imports_per_car: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
) -> EnrichmentRunResultItem:
    result = enrich_cars(
        db,
        car_id=car_id,
        serial_number=serial_number,
        limit=limit,
        max_imports_per_car=max_imports_per_car,
    )
    return EnrichmentRunResultItem(
        requested=result.requested,
        processed=result.processed,
        queries_attempted=result.queries_attempted,
        candidate_count=result.candidate_count,
        imported_count=result.imported_count,
        skipped_known_urls=result.skipped_known_urls,
        skipped_serial_mismatch=result.skipped_serial_mismatch,
        cars=[
            CarEnrichmentResultItem(
                car_id=car_result.car_id,
                serial_number=car_result.serial_number,
                queries_attempted=car_result.queries_attempted,
                candidate_count=car_result.candidate_count,
                imported_count=car_result.imported_count,
                skipped_known_urls=car_result.skipped_known_urls,
                skipped_serial_mismatch=car_result.skipped_serial_mismatch,
                imported=[
                    ImportUrlResultItem(
                        scraper_key=item.scraper_key,
                        source_name=item.source_name,
                        source_url=item.source_url,
                        car_id=item.car_id,
                        serial_number=item.serial_number,
                        make=item.make,
                        model=item.model,
                        source_count=item.source_count,
                        media_count=item.media_count,
                        already_known_url=item.already_known_url,
                    )
                    for item in car_result.imported
                ],
                candidates=[
                    SearchCandidateItem(
                        scraper_key=item.scraper_key,
                        query=item.query,
                        url=item.url,
                        title=item.title,
                        description=item.description,
                    )
                    for item in car_result.candidates
                ],
                errors=car_result.errors,
            )
            for car_result in result.cars
        ],
        errors=result.errors,
    )


@app.post("/admin/jobs/upsert", dependencies=[Depends(require_admin_token)])
def run_upsert(db: Session = Depends(get_db)) -> dict[str, str]:
    source_count = db.query(func.count(Source.id)).filter(Source.enabled.is_(True)).scalar() or 0
    return {
        "status": "queued",
        "message": f"Worker orchestration entrypoint ready for {source_count} enabled sources.",
    }


@app.post("/admin/jobs/fetch", dependencies=[Depends(require_admin_token)])
def run_fetch_more(
    limit: int = Query(default=5, ge=1, le=50),
    ignore_without_images: bool = Query(default=False),
    scraper_key: str = Query(...),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    result = fetch_random_cars(
        db,
        limit=limit,
        ignore_without_images=ignore_without_images,
        scraper_key=scraper_key,
    )
    return {
        "requested": result.requested,
        "discovered": result.discovered,
        "imported": result.imported,
        "skipped_existing": result.skipped_existing,
        "skipped_without_images": result.skipped_without_images,
        "source_name": result.source_name,
        "scraper_key": scraper_key,
        "mode_used": result.mode_used,
        "errors": result.errors,
    }


@app.post(
    "/admin/jobs/import-url",
    response_model=ImportUrlResultItem,
    dependencies=[Depends(require_admin_token)],
)
def run_import_url(
    payload: ImportUrlRequest,
    db: Session = Depends(get_db),
) -> ImportUrlResultItem:
    try:
        result = import_car_from_url(db, payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Import failed: {exc}") from exc

    return ImportUrlResultItem(
        scraper_key=result.scraper_key,
        source_name=result.source_name,
        source_url=result.source_url,
        car_id=result.car_id,
        serial_number=result.serial_number,
        make=result.make,
        model=result.model,
        source_count=result.source_count,
        media_count=result.media_count,
        already_known_url=result.already_known_url,
    )


@app.get(
    "/admin/barchetta/request-diagnostics",
    response_model=BarchettaRequestDiagnostics,
    dependencies=[Depends(require_admin_token)],
)
def get_barchetta_request_diagnostics(
    path: str = Query(default="/english/all.ferraris/summary/"),
    user_agent_override: str | None = Query(default=None),
    run: bool = Query(default=False),
) -> BarchettaRequestDiagnostics:
    effective_path = _normalize_barchetta_path(path)
    user_agent = (user_agent_override or settings.effective_user_agent).strip()
    target_url = urljoin(settings.barchetta_base_url, effective_path)

    with httpx.Client(
        headers={"User-Agent": user_agent},
        follow_redirects=True,
        timeout=30.0,
    ) as client:
        request = client.build_request("GET", target_url)
        request_preview = RequestPreview(
            method=request.method,
            url=str(request.url),
            headers=[RequestHeaderItem(name=name, value=value) for name, value in request.headers.items()],
            follow_redirects=client.follow_redirects,
            timeout_seconds=30.0,
        )

        response_preview = ResponsePreview(attempted=run)
        if run:
            try:
                response = client.send(request)
                content_type = response.headers.get("content-type")
                response_preview = ResponsePreview(
                    attempted=True,
                    status_code=response.status_code,
                    final_url=str(response.url),
                    headers=[
                        RequestHeaderItem(name=name, value=value)
                        for name, value in response.headers.items()
                    ],
                    elapsed_ms=round(response.elapsed.total_seconds() * 1000, 2),
                    content_type=content_type,
                    body_preview=_preview_response_body(response),
                )
            except httpx.HTTPError as exc:
                response_preview = ResponsePreview(
                    attempted=True,
                    error=str(exc),
                )

    return BarchettaRequestDiagnostics(
        path=effective_path,
        user_agent=user_agent,
        request=request_preview,
        response=response_preview,
    )


@app.post(
    "/admin/request-lab",
    response_model=RequestLabResult,
    dependencies=[Depends(require_admin_token)],
)
def run_request_lab(payload: RequestLabInput) -> RequestLabResult:
    parsed = urlparse(payload.url.strip())
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"} or not hostname:
        raise HTTPException(status_code=400, detail="Use a valid http or https URL.")
    if hostname not in settings.allowed_request_lab_hosts:
        raise HTTPException(
            status_code=400,
            detail=f"Host '{hostname}' is not allowed for the internal request lab.",
        )

    method = payload.method.upper().strip() or "GET"
    headers = {name: value for name, value in payload.headers.items() if name.strip()}

    with httpx.Client(follow_redirects=True, timeout=30.0) as client:
        request = client.build_request(
            method,
            payload.url.strip(),
            headers=headers,
            content=payload.body or None,
        )
        request_preview = RequestPreview(
            method=request.method,
            url=str(request.url),
            headers=[RequestHeaderItem(name=name, value=value) for name, value in request.headers.items()],
            follow_redirects=client.follow_redirects,
            timeout_seconds=30.0,
        )

        try:
            response = client.send(request)
            response_preview = ResponsePreview(
                attempted=True,
                status_code=response.status_code,
                final_url=str(response.url),
                headers=[
                    RequestHeaderItem(name=name, value=value)
                    for name, value in response.headers.items()
                ],
                elapsed_ms=round(response.elapsed.total_seconds() * 1000, 2),
                content_type=response.headers.get("content-type"),
                body_preview=_preview_response_body(response),
            )
        except httpx.HTTPError as exc:
            response_preview = ResponsePreview(
                attempted=True,
                error=str(exc),
            )

    return RequestLabResult(request=request_preview, response=response_preview)


@app.on_event("startup")
def ensure_default_settings() -> None:
    seed_sources()


def _format_date_label(event_date, precision: str, event_year: int | None) -> str:
    if event_date is not None:
        if precision == "day":
            return event_date.isoformat()
        if precision == "month":
            return event_date.strftime("%Y-%m")
        if precision == "year":
            return str(event_date.year)
    if precision == "decade" and event_year is not None:
        return f"{str(event_year)[:3]}0s"
    if event_year is not None:
        return str(event_year)
    return "Unknown"


def _resolve_media_url(url: str, request: Request | None = None) -> str:
    if url.startswith("file://"):
        path = unquote(url.removeprefix("file://"))
        return _build_media_route_url("get_local_media", {"path": path}, request=request)
    if url.startswith("dbfblob://"):
        key = unquote(url.removeprefix("dbfblob://"))
        return _build_media_route_url("get_blob_media", {"key": key}, request=request)
    return url


def _build_media_route_url(
    route_name: str,
    query: dict[str, str],
    *,
    request: Request | None = None,
) -> str:
    encoded_query = "&".join(f"{name}={quote(value)}" for name, value in query.items())
    if settings.public_base_url:
        return f"{settings.public_base_url.rstrip('/')}{app.url_path_for(route_name)}?{encoded_query}"
    if request is not None:
        resolved = str(request.url_for(route_name))
        if settings.app_env == "production" and resolved.startswith("http://"):
            resolved = resolved.replace("http://", "https://", 1)
        return f"{resolved}?{encoded_query}"
    return f"http://localhost:8000{app.url_path_for(route_name)}?{encoded_query}"


def _is_allowed_local_media_path(candidate: Path) -> bool:
    allowed_roots = [FIXTURE_ROOT.resolve(), LOCAL_MEDIA_ROOT.resolve()]
    for root in allowed_roots:
        try:
            candidate.relative_to(root)
            return True
        except ValueError:
            continue
    return False


def _normalize_barchetta_path(path: str) -> str:
    candidate = path.strip() or "/english/all.ferraris/summary/"
    if candidate.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Use a Barchetta path, not a full URL.")
    if not candidate.startswith("/"):
        candidate = f"/{candidate}"
    return candidate


def _preview_response_body(response: httpx.Response) -> str:
    content_type = (response.headers.get("content-type") or "").lower()
    if any(token in content_type for token in ("text", "html", "json", "xml")):
        return response.text[:4000]
    return f"<{len(response.content)} bytes of {content_type or 'binary content'}>"


def _normalize_search_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.split()).strip()
    return normalized or None

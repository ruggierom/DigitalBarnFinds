from __future__ import annotations

import csv
import html
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
from digital_barn_finds.services.fetch_more import fetch_random_cars
from digital_barn_finds.seed import seed_sources

settings = get_settings()
app = FastAPI(title="DigitalBarnFinds API", version="0.1.1")
FIXTURE_ROOT = Path(__file__).resolve().parents[2] / "fixtures"
RENDERABLE_EXTENSIONS = ("jpg", "jpeg", "png", "webp", "gif", "avif", "bmp", "jfif")
EXPORT_COLUMNS = [
    ("serial_number", "Serial Number"),
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
    if not str(candidate).startswith(str(FIXTURE_ROOT.resolve())) or not candidate.exists():
        raise HTTPException(status_code=404, detail="Media not found.")
    return FileResponse(candidate)


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


@app.get("/watchlist", response_model=list[WatchlistItem], dependencies=[Depends(require_admin_token)])
def get_watchlist(db: Session = Depends(get_db)) -> list[WatchlistItem]:
    entries = db.query(WatchlistEntry).join(Car).order_by(WatchlistEntry.priority.asc()).all()
    return [
        WatchlistItem(
            car_id=entry.car_id,
            serial_number=entry.car.display_serial_number,
            make=entry.car.make,
            model=entry.car.model,
            priority=entry.priority,
            status=entry.status,
            score=entry.car.darkness_score.score if entry.car.darkness_score else None,
            interest_reason=entry.interest_reason,
            agent_instructions=entry.agent_instructions,
            notes=entry.notes,
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
        make=car.make,
        model=car.model,
        priority=entry.priority,
        status=entry.status,
        score=car.darkness_score.score if car.darkness_score else None,
        interest_reason=entry.interest_reason,
        agent_instructions=entry.agent_instructions,
        notes=entry.notes,
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
                name=source.name,
                base_url=source.base_url,
                scraper_key=source.scraper_key,
                enabled=source.enabled,
                last_scraped_at=source.last_scraped_at,
                last_status=latest_log.status if latest_log else None,
            )
        )
    return results


@app.get("/settings", response_model=list[SettingItem], dependencies=[Depends(require_admin_token)])
def list_settings(db: Session = Depends(get_db)) -> list[SettingItem]:
    return [
        SettingItem(
            key=setting.key,
            value=setting.value,
            description=setting.description,
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
        description=setting.description,
        updated_at=setting.updated_at,
    )


@app.post("/admin/jobs/score", dependencies=[Depends(require_admin_token)])
def run_scoring(db: Session = Depends(get_db)) -> dict[str, int]:
    processed = compute_scores(db)
    return {"processed": processed}


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
    db: Session = Depends(get_db),
) -> dict[str, object]:
    result = fetch_random_cars(db, limit=limit, ignore_without_images=ignore_without_images)
    return {
        "requested": result.requested,
        "discovered": result.discovered,
        "imported": result.imported,
        "skipped_existing": result.skipped_existing,
        "skipped_without_images": result.skipped_without_images,
        "source_name": result.source_name,
        "mode_used": result.mode_used,
        "errors": result.errors,
    }


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
        if settings.public_base_url:
            return f"{settings.public_base_url.rstrip('/')}/media/local?path={quote(path)}"
        if request is not None:
            resolved = str(request.url_for("get_local_media"))
            if settings.app_env == "production" and resolved.startswith("http://"):
                resolved = resolved.replace("http://", "https://", 1)
            return resolved + f"?path={quote(path)}"
        return f"http://localhost:8000/media/local?path={quote(path)}"
    return url


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

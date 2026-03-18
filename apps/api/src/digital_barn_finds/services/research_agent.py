from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import re
from typing import Any
from urllib.parse import urlparse
import uuid

import httpx
from sqlalchemy.orm import Session

from digital_barn_finds.config import get_settings
from digital_barn_finds.database import SessionLocal
from digital_barn_finds.models import AgentRun, Car, ChassisSeed, DealerLookup, ProvenanceContact, ProvenanceReport, VehicleModel
from digital_barn_finds.services.ingest import normalize_serial
from digital_barn_finds.services.research import build_identifier_variants, build_research_links

GOOGLE_SITE_DOMAINS = (
    "barchetta.cc",
    "goodingco.com",
    "rmsothebys.com",
    "bonhams.com",
    "mecum.com",
    "bringatrailer.com",
    "classic.com",
    "hagerty.com",
    "hemmings.com",
    "ferrarichat.com",
    "ilferrarista.it",
    "passionferrari.fr",
    "carandclassic.com",
    "classic-trader.com",
    "dupontregistry.com",
)
US_STATE_PATTERN = re.compile(r"\b([A-Z]{2})\b")


@dataclass(frozen=True, slots=True)
class ResearchJobRequest:
    chassis_number: str | None
    car_id: str | None
    triggered_by: str
    triggered_by_user: str | None = None


def enqueue_research_job(request: ResearchJobRequest) -> AgentRun:
    db = SessionLocal()
    try:
        car = _resolve_car(db, request.car_id, request.chassis_number)
        seed = _resolve_seed(db, request.chassis_number, car)
        if request.chassis_number is None and seed is None:
            raise ValueError("chassis_number is required when no matching seeded car exists.")

        effective_chassis_number = request.chassis_number or (seed.chassis_number if seed else None)
        if effective_chassis_number is None:
            raise ValueError("Unable to determine chassis number for research run.")

        agent_run = AgentRun(
            chassis_seed_id=seed.id if seed else None,
            car_id=car.id if car else None,
            triggered_by=request.triggered_by,
            triggered_by_user=request.triggered_by_user,
            status="running",
            phases_completed=0,
            started_at=datetime.now(UTC),
        )
        db.add(agent_run)

        if car is not None:
            car.research_status = "running"
        if seed is not None and car is not None and seed.car_id is None:
            seed.car_id = car.id
        db.commit()
        db.refresh(agent_run)
        return agent_run
    finally:
        db.close()


def run_research_job(agent_run_id: str) -> None:
    db = SessionLocal()
    try:
        agent_run = db.query(AgentRun).filter(AgentRun.id == _parse_uuid(agent_run_id)).one()
        seed = (
            db.query(ChassisSeed)
            .filter(ChassisSeed.id == agent_run.chassis_seed_id)
            .one_or_none()
        )
        car = db.query(Car).filter(Car.id == agent_run.car_id).one_or_none() if agent_run.car_id else None
        chassis_number = seed.chassis_number if seed else (car.display_serial_number if car else None)
        if not chassis_number:
            raise ValueError("Research run has no chassis number.")

        results: list[dict[str, Any]] = []

        phase1_results = _phase1_sweep(chassis_number, car)
        results.extend(phase1_results)
        agent_run.phases_completed = 1
        db.commit()

        phase2_results = _phase2_open(chassis_number, car, phase1_results)
        results.extend(phase2_results)
        agent_run.phases_completed = 2
        db.commit()

        phase3_results = _phase3_auction(chassis_number, car)
        results.extend(phase3_results)
        agent_run.phases_completed = 3

        report_payload = _build_report_payload(chassis_number, seed, car, results)
        report = _write_provenance_report(db, agent_run, seed, car, report_payload)

        agent_run.status = "complete"
        agent_run.completed_at = datetime.now(UTC)
        agent_run.raw_results = results
        if car is not None:
            car.research_status = "complete"
            car.geo_region = report.geo_region
            car.geo_signal = report.last_known_location
            car.estimated_value_usd = report.estimated_value_usd
            if car.chassis_seed_id is None and seed is not None:
                car.chassis_seed_id = seed.id
        if seed is not None and car is not None and seed.car_id is None:
            seed.car_id = car.id
        db.commit()
    except Exception as exc:
        db.rollback()
        _mark_run_failed(db, agent_run_id, str(exc))
        raise
    finally:
        db.close()


def list_agent_runs(
    db: Session,
    *,
    chassis_seed_id: str | None = None,
) -> list[AgentRun]:
    query = db.query(AgentRun).order_by(AgentRun.started_at.desc())
    if chassis_seed_id:
        query = query.filter(AgentRun.chassis_seed_id == _parse_uuid(chassis_seed_id))
    return query.all()


def get_latest_provenance_report_for_car(db: Session, car_id: str) -> ProvenanceReport | None:
    return (
        db.query(ProvenanceReport)
        .filter(ProvenanceReport.car_id == _parse_uuid(car_id))
        .order_by(ProvenanceReport.updated_at.desc(), ProvenanceReport.created_at.desc())
        .first()
    )


def get_latest_provenance_report_for_run(db: Session, run_id: str) -> ProvenanceReport | None:
    return (
        db.query(ProvenanceReport)
        .filter(ProvenanceReport.agent_run_id == _parse_uuid(run_id))
        .order_by(ProvenanceReport.updated_at.desc(), ProvenanceReport.created_at.desc())
        .first()
    )


def create_dealer_lookup(
    db: Session,
    *,
    provenance_report_id: str,
    contact_id: str | None,
    outcome: str | None,
    notes: str | None,
) -> DealerLookup:
    lookup = DealerLookup(
        provenance_report_id=_parse_uuid(provenance_report_id),
        contact_id=_parse_uuid(contact_id),
        outcome=outcome,
        notes=notes,
        attempted_at=datetime.now(UTC),
    )
    db.add(lookup)

    if contact_id:
        contact = (
            db.query(ProvenanceContact)
            .filter(ProvenanceContact.id == _parse_uuid(contact_id))
            .one_or_none()
        )
        if contact is not None:
            contact.contact_status = outcome or "contacted"

    db.commit()
    db.refresh(lookup)
    return lookup


def update_dealer_lookup(
    db: Session,
    *,
    lookup_id: str,
    outcome: str | None,
    notes: str | None,
) -> DealerLookup:
    lookup = db.query(DealerLookup).filter(DealerLookup.id == _parse_uuid(lookup_id)).one()
    lookup.outcome = outcome
    lookup.notes = notes
    if lookup.contact_id:
        contact = db.query(ProvenanceContact).filter(ProvenanceContact.id == lookup.contact_id).one_or_none()
        if contact is not None and outcome:
            contact.contact_status = outcome
    db.commit()
    db.refresh(lookup)
    return lookup


def _resolve_car(db: Session, car_id: str | None, chassis_number: str | None) -> Car | None:
    if car_id:
        car = db.query(Car).filter(Car.id == _parse_uuid(car_id)).one_or_none()
        if car is not None:
            return car
    if chassis_number:
        return (
            db.query(Car)
            .filter(Car.normalized_serial_number == normalize_serial(chassis_number))
            .one_or_none()
        )
    return None


def _resolve_seed(db: Session, chassis_number: str | None, car: Car | None) -> ChassisSeed | None:
    if chassis_number:
        seed = db.query(ChassisSeed).filter(ChassisSeed.chassis_number == chassis_number).one_or_none()
        if seed is not None:
            return seed
    if car and car.chassis_seed_id:
        return db.query(ChassisSeed).filter(ChassisSeed.id == car.chassis_seed_id).one_or_none()
    return None


def _phase1_sweep(chassis_number: str, car: Car | None) -> list[dict[str, Any]]:
    settings = get_settings()
    links = []
    if car is not None:
        links = [link.__dict__ for link in build_research_links(car, car.sources)]
    else:
        links = [
            {
                "label": domain,
                "category": "site_sweep",
                "query": f'site:{domain} "{chassis_number}"',
                "url": f"https://www.google.com/search?q=site%3A{domain}+%22{chassis_number}%22",
            }
            for domain in GOOGLE_SITE_DOMAINS
        ]

    results: list[dict[str, Any]] = []
    if not settings.google_search_api_key or not settings.google_search_cx:
        for item in links[:10]:
            results.append(
                {
                    "phase": "phase1_sweep",
                    "type": "query",
                    "title": item["label"],
                    "url": item["url"],
                    "query": item["query"],
                    "snippet": "Search prepared; external API not configured.",
                }
            )
        return results

    with httpx.Client(timeout=settings.research_request_timeout_seconds) as client:
        for domain in GOOGLE_SITE_DOMAINS:
            query = f'site:{domain} "{chassis_number}"'
            response = client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={
                    "key": settings.google_search_api_key,
                    "cx": settings.google_search_cx,
                    "q": query,
                },
            )
            response.raise_for_status()
            payload = response.json()
            for item in payload.get("items", [])[:5]:
                results.append(
                    {
                        "phase": "phase1_sweep",
                        "type": "search_result",
                        "domain": domain,
                        "title": item.get("title"),
                        "url": item.get("link"),
                        "query": query,
                        "snippet": item.get("snippet"),
                    }
                )
    return results


def _phase2_open(
    chassis_number: str,
    car: Car | None,
    prior_results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    if car is None:
        return results

    descriptor = " ".join(part for part in [car.make, car.model, car.variant] if part)
    for variant in build_identifier_variants(chassis_number)[:3]:
        results.append(
            {
                "phase": "phase2_open",
                "type": "open_web_query",
                "title": f"Open-web search for {variant}",
                "url": f"https://www.google.com/search?q=%22{variant}%22+{descriptor.replace(' ', '+')}",
                "query": f'"{variant}" {descriptor}'.strip(),
                "snippet": "Open web search queued for manual follow-up.",
            }
        )
    if prior_results:
        results.append(
            {
                "phase": "phase2_open",
                "type": "note",
                "title": "Prior search results available",
                "url": None,
                "query": None,
                "snippet": f"{len(prior_results)} earlier search results captured.",
            }
        )
    return results


def _phase3_auction(chassis_number: str, car: Car | None) -> list[dict[str, Any]]:
    if car is None:
        return []

    results: list[dict[str, Any]] = []
    latest_sources = sorted(car.sources, key=lambda item: item.scraped_at or datetime.min, reverse=True)
    for source in latest_sources[:5]:
        results.append(
            {
                "phase": "phase3_auction",
                "type": "auction_source",
                "title": source.source.name if source.source else urlparse(source.source_url).netloc,
                "url": source.source_url,
                "query": chassis_number,
                "snippet": f"Known source listing for {source.source_serial_number}",
                "scraped_at": source.scraped_at.isoformat() if source.scraped_at else None,
            }
        )
    return results


def _build_report_payload(
    chassis_number: str,
    seed: ChassisSeed | None,
    car: Car | None,
    results: list[dict[str, Any]],
) -> dict[str, Any]:
    custody_chain = _build_custody_chain(car, seed)
    contacts = _build_contacts(chassis_number, car)
    recommended_actions = _build_recommended_actions(car, seed, contacts)
    last_known_location = (
        (seed.last_known_location if seed else None)
        or _latest_location_from_events(car)
        or (car.geo_signal if car else None)
    )
    geo_region = _infer_geo_region(last_known_location)
    estimated_value_usd = _estimate_value(seed, car)
    darkness_score = int(float(car.darkness_score.score)) if car and car.darkness_score and car.darkness_score.score is not None else None

    return {
        "summary": _build_summary(chassis_number, seed, car, last_known_location, len(results)),
        "geo_region": geo_region,
        "last_known_location": last_known_location,
        "estimated_value_usd": estimated_value_usd,
        "darkness_score": darkness_score,
        "custody_chain": custody_chain,
        "contacts": contacts,
        "recommended_actions": recommended_actions,
    }


def _write_provenance_report(
    db: Session,
    agent_run: AgentRun,
    seed: ChassisSeed | None,
    car: Car | None,
    payload: dict[str, Any],
) -> ProvenanceReport:
    report = ProvenanceReport(
        agent_run_id=agent_run.id,
        car_id=car.id if car else None,
        chassis_seed_id=seed.id if seed else None,
        summary=payload["summary"],
        geo_region=payload["geo_region"],
        last_known_location=payload["last_known_location"],
        estimated_value_usd=payload["estimated_value_usd"],
        darkness_score=payload["darkness_score"],
        custody_chain=payload["custody_chain"],
        recommended_actions=payload["recommended_actions"],
        status="complete",
    )
    db.add(report)
    db.flush()

    for existing in db.query(ProvenanceContact).filter(ProvenanceContact.agent_run_id == agent_run.id).all():
        db.delete(existing)
    db.flush()

    for contact_data in payload["contacts"]:
        db.add(
            ProvenanceContact(
                agent_run_id=agent_run.id,
                chassis_seed_id=seed.id if seed else None,
                priority=contact_data["priority"],
                name=contact_data.get("name"),
                org=contact_data.get("org"),
                city=contact_data.get("city"),
                phone=contact_data.get("phone"),
                email=contact_data.get("email"),
                rationale=contact_data.get("rationale"),
                target_chassis=contact_data.get("target_chassis"),
                contact_status=contact_data.get("contact_status") or "not_contacted",
                notes=contact_data.get("notes"),
                created_at=datetime.now(UTC),
            )
        )
    db.flush()
    return report


def _build_custody_chain(car: Car | None, seed: ChassisSeed | None) -> list[dict[str, Any]]:
    chain: list[dict[str, Any]] = []
    if seed is not None:
        initial_notes = ", ".join(
            part
            for part in [
                seed.dealer,
                seed.destination_country,
                seed.destination_region,
            ]
            if part
        )
        if initial_notes:
            chain.append(
                {
                    "period": seed.delivery_date.isoformat() if seed.delivery_date else str(seed.seed_date.year),
                    "custodian": seed.last_known_owner or seed.dealer or "Seed record",
                    "confidence": seed.confidence,
                    "source": seed.seed_source or "seed",
                    "location": seed.last_known_location or seed.destination_country,
                    "notes": initial_notes,
                }
            )

    if car is None:
        return chain

    events: list[tuple[datetime | None, dict[str, Any]]] = []
    for event in car.custody_events:
        period = event.event_date.isoformat() if event.event_date else (str(event.event_year) if event.event_year else "unknown")
        events.append(
            (
                _event_sort_key(event.event_date, event.event_year),
                {
                    "period": period,
                    "custodian": event.owner_name or "Unknown owner",
                    "confidence": "confirmed",
                    "source": event.source_reference or "custody_event",
                    "location": event.location,
                    "notes": event.transaction_notes or "",
                },
            )
        )
    events.sort(key=lambda item: item[0])
    chain.extend(item[1] for item in events)
    return chain


def _build_contacts(chassis_number: str, car: Car | None) -> list[dict[str, Any]]:
    if car is None:
        return []

    contacts: list[dict[str, Any]] = []
    latest_sources = sorted(car.sources, key=lambda item: item.scraped_at or datetime.min, reverse=True)
    for index, source in enumerate(latest_sources[:3], start=1):
        org = source.source.name if source.source else urlparse(source.source_url).netloc
        city = _infer_city_from_url(source.source_url)
        contacts.append(
            {
                "priority": index,
                "name": None,
                "org": org,
                "city": city,
                "phone": None,
                "email": None,
                "rationale": f"Recent known source or registry reference for chassis {chassis_number}.",
                "target_chassis": chassis_number,
                "contact_status": "not_contacted",
                "notes": source.source_url,
            }
        )
    return contacts


def _build_recommended_actions(
    car: Car | None,
    seed: ChassisSeed | None,
    contacts: list[dict[str, Any]],
) -> list[str]:
    actions: list[str] = []
    if seed is not None and seed.last_known_location:
        actions.append(f"Verify whether the car remains in {seed.last_known_location}.")
    if car is not None and car.sources:
        actions.append("Review the latest source listing and compare against the seed record.")
    if contacts:
        actions.append("Work the contact queue from top priority down and log every outcome.")
    else:
        actions.append("No direct contact leads found; run manual forum and registry outreach.")
    if car is not None and car.darkness_score and car.darkness_score.is_currently_dark:
        actions.append("Treat the car as an active darkness candidate until a fresh sighting is confirmed.")
    return actions


def _build_summary(
    chassis_number: str,
    seed: ChassisSeed | None,
    car: Car | None,
    last_known_location: str | None,
    result_count: int,
) -> str:
    descriptor = " ".join(
        part for part in [
            car.make if car else None,
            car.model if car else (seed.vehicle_model.model if seed and seed.vehicle_model else None),
            car.variant if car else (seed.vehicle_model.variant if seed and seed.vehicle_model else None),
        ] if part
    ).strip()
    location_text = last_known_location or "no current location signal"
    if descriptor:
        return f"{descriptor} {chassis_number}: {result_count} research signals reviewed, last known location {location_text}."
    return f"Chassis {chassis_number}: {result_count} research signals reviewed, last known location {location_text}."


def _latest_location_from_events(car: Car | None) -> str | None:
    if car is None:
        return None
    latest: tuple[tuple[int, int, int], str | None] | None = None
    for event in list(car.custody_events) + list(car.car_events):
        event_key = _event_sort_key(event.event_date, event.event_year)
        location = getattr(event, "location", None)
        if latest is None or event_key > latest[0]:
            latest = (event_key, location)
    return latest[1] if latest else None


def _estimate_value(seed: ChassisSeed | None, car: Car | None) -> int | None:
    vehicle_model: VehicleModel | None = seed.vehicle_model if seed else None
    if vehicle_model and vehicle_model.est_value_high:
        return vehicle_model.est_value_high
    if vehicle_model and vehicle_model.est_value_low:
        return vehicle_model.est_value_low
    if car and car.estimated_value_usd:
        return car.estimated_value_usd
    return None


def _infer_geo_region(location: str | None) -> str | None:
    if not location:
        return None
    match = US_STATE_PATTERN.search(location.upper())
    if match:
        return match.group(1)
    return None


def _infer_city_from_url(url: str) -> str | None:
    host = (urlparse(url).hostname or "").lower()
    if host.endswith(".co.uk"):
        return "United Kingdom"
    if host.endswith(".fr"):
        return "France"
    if host.endswith(".it"):
        return "Italy"
    if host.endswith(".com"):
        return "Unknown"
    return None


def _mark_run_failed(db: Session, agent_run_id: str, error: str) -> None:
    agent_run = db.query(AgentRun).filter(AgentRun.id == _parse_uuid(agent_run_id)).one_or_none()
    if agent_run is None:
        return
    agent_run.status = "failed"
    agent_run.error = error
    agent_run.completed_at = datetime.now(UTC)
    if agent_run.car_id:
        car = db.query(Car).filter(Car.id == agent_run.car_id).one_or_none()
        if car is not None:
            car.research_status = "failed"
    db.commit()


def _event_sort_key(event_date, event_year: int | None) -> tuple[int, int, int]:
    if event_date is not None:
        return (event_date.year, event_date.month, event_date.day)
    if event_year is not None:
        return (event_year, 0, 0)
    return (0, 0, 0)


def _parse_uuid(value: str | None) -> uuid.UUID | None:
    if value is None:
        return None
    return uuid.UUID(str(value))

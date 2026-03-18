from __future__ import annotations

import os
import sys
from datetime import UTC, date, datetime
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "research-agent-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.database import Base, get_db  # noqa: E402
from digital_barn_finds.main import app  # noqa: E402
from digital_barn_finds.models import (  # noqa: E402
    AgentRun,
    Car,
    CarSource,
    ChassisSeed,
    CustodyEvent,
    DarknessScore,
    ProvenanceContact,
    ProvenanceReport,
    Source,
    VehicleModel,
)
from digital_barn_finds.services.research_agent import (  # noqa: E402
    ResearchJobRequest,
    enqueue_research_job,
    run_research_job,
)


def _make_session_factory():
    engine = create_engine(
        "sqlite+pysqlite://",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def test_research_agent_service_completes_run_and_writes_report(monkeypatch) -> None:
    Session = _make_session_factory()
    monkeypatch.setattr("digital_barn_finds.services.research_agent.SessionLocal", Session)

    db = Session()
    try:
        source = Source(
            name="goodingco.com",
            base_url="https://www.goodingco.com",
            scraper_key="gooding",
        )
        vehicle_model = VehicleModel(
            make="Ferrari",
            model="275 GTB",
            tier="A",
            in_scope=True,
            est_value_high=4_000_000,
        )
        car = Car(
            normalized_serial_number="5010",
            display_serial_number="5010",
            make="Ferrari",
            model="275 GTB",
            source_count=1,
        )
        db.add_all([source, vehicle_model, car])
        db.flush()

        seed = ChassisSeed(
            vehicle_model_id=vehicle_model.id,
            chassis_number="5010",
            last_known_location="Scottsdale AZ",
            seed_source="seed-file",
            confidence="confirmed",
            car_id=car.id,
        )
        db.add(seed)
        db.flush()
        car.chassis_seed_id = seed.id

        car_source = CarSource(
            car_id=car.id,
            source_id=source.id,
            source_url="https://www.goodingco.com/lot/1967-ferrari-275-gtb-4/",
            source_serial_number="5010",
            source_make="Ferrari",
            source_model="275 GTB",
            scraped_at=datetime.now(UTC),
        )
        db.add(car_source)
        db.flush()
        db.add(
            CustodyEvent(
                car_id=car.id,
                car_source_id=car_source.id,
                event_date=date(1972, 1, 1),
                event_date_precision="year",
                event_year=1972,
                owner_name="Alberto Pedretti",
                location="New York",
                transaction_notes="Factory delivery note",
                source_reference="factory_record",
            )
        )
        db.add(
            DarknessScore(
                car_id=car.id,
                last_known_year=1972,
                first_reappear_year=None,
                gap_start_year=1972,
                gap_end_year=2026,
                gap_years=54,
                total_sightings=1,
                years_since_last_seen=54,
                score=92,
                is_currently_dark=True,
                qualifies_primary=True,
                qualifies_secondary=False,
                last_computed=datetime.now(UTC),
            )
        )
        db.commit()

        agent_run = enqueue_research_job(
            ResearchJobRequest(
                chassis_number="5010",
                car_id=str(car.id),
                triggered_by="manual",
            )
        )
        run_research_job(str(agent_run.id))

        db.expire_all()
        refreshed_run = db.query(AgentRun).filter(AgentRun.id == agent_run.id).one()
        report = db.query(ProvenanceReport).filter(ProvenanceReport.agent_run_id == agent_run.id).one()
        contacts = (
            db.query(ProvenanceContact)
            .filter(ProvenanceContact.agent_run_id == agent_run.id)
            .all()
        )
        refreshed_car = db.query(Car).filter(Car.id == car.id).one()

        assert refreshed_run.status == "complete"
        assert refreshed_run.phases_completed == 3
        assert report.last_known_location == "Scottsdale AZ"
        assert report.estimated_value_usd == 4_000_000
        assert report.custody_chain
        assert report.recommended_actions
        assert len(contacts) >= 1
        assert refreshed_car.research_status == "complete"
    finally:
        db.close()


def test_research_and_provenance_endpoints(monkeypatch) -> None:
    Session = _make_session_factory()
    monkeypatch.setattr("digital_barn_finds.main.seed_sources", lambda: None)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = Session()
    try:
        vehicle_model = VehicleModel(make="Ferrari", model="275 GTB", tier="A", in_scope=True)
        car = Car(
            normalized_serial_number="5010",
            display_serial_number="5010",
            make="Ferrari",
            model="275 GTB",
            research_status="complete",
            source_count=1,
        )
        db.add_all([vehicle_model, car])
        db.flush()

        seed = ChassisSeed(
            vehicle_model_id=vehicle_model.id,
            chassis_number="5010",
            confidence="confirmed",
            status="active",
            car_id=car.id,
        )
        db.add(seed)
        db.flush()

        run = AgentRun(
            chassis_seed_id=seed.id,
            car_id=car.id,
            triggered_by="manual",
            status="complete",
            phases_completed=3,
            started_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(run)
        db.flush()

        contact = ProvenanceContact(
            agent_run_id=run.id,
            chassis_seed_id=seed.id,
            priority=1,
            org="Gooding & Company",
            rationale="Latest known auction source.",
            target_chassis="5010",
            contact_status="not_contacted",
            created_at=datetime.now(UTC),
        )
        report = ProvenanceReport(
            agent_run_id=run.id,
            car_id=car.id,
            chassis_seed_id=seed.id,
            summary="Seeded provenance report.",
            geo_region="AZ",
            last_known_location="Scottsdale AZ",
            estimated_value_usd=4_000_000,
            darkness_score=92,
            custody_chain=[{"period": "1972", "custodian": "Alberto Pedretti"}],
            recommended_actions=["Call Gooding & Company."],
            status="complete",
        )
        db.add_all([contact, report])
        db.commit()

        with TestClient(app) as client:
            headers = {"x-admin-token": os.environ["DBF_ADMIN_TOKEN"]}

            runs_response = client.get("/admin/agent-runs", headers=headers)
            provenance_response = client.get(f"/cars/{car.id}/provenance", headers=headers)
            lookup_response = client.post(
                "/admin/dealer-lookups",
                headers=headers,
                json={
                    "provenance_report_id": str(report.id),
                    "contact_id": str(contact.id),
                    "outcome": "warm",
                    "notes": "Interested in follow-up.",
                },
            )

            assert runs_response.status_code == 200
            assert len(runs_response.json()) == 1
            assert provenance_response.status_code == 200
            assert provenance_response.json()["summary"] == "Seeded provenance report."
            assert lookup_response.status_code == 200

            lookup_id = lookup_response.json()["id"]
            update_response = client.put(
                f"/admin/dealer-lookups/{lookup_id}",
                headers=headers,
                json={"outcome": "reached", "notes": "Reached the org and left details."},
            )
            assert update_response.status_code == 200
            assert update_response.json()["outcome"] == "reached"
    finally:
        app.dependency_overrides.clear()
        db.close()

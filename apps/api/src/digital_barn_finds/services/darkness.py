from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from digital_barn_finds.models import AppSetting, Car, CarEvent, CustodyEvent, DarknessScore


DEFAULTS = {
    "darkness_weights": {
        "gap_year_weight": 2.0,
        "years_since_last_seen_weight": 1.5,
        "total_sightings_penalty": 0.5,
        "current_dark_years": 15,
        "primary_gap_years": 20,
        "primary_last_seen_years": 10,
        "secondary_last_seen_years": 25,
    }
}


def compute_scores(db: Session) -> int:
    setting = db.query(AppSetting).filter(AppSetting.key == "darkness_weights").one_or_none()
    weights = setting.value if setting else DEFAULTS["darkness_weights"]
    current_year = datetime.now(UTC).year
    cars = db.query(Car).all()

    for car in cars:
        years = sorted(
            {
                event.event_year
                for event in [*car.custody_events, *car.car_events]
                if event.event_year is not None and event.event_date_precision != "unknown"
            }
        )
        total_sightings = len(car.custody_events) + len(car.car_events)
        gap_start = None
        gap_end = None
        gap_years = 0
        first_reappear_year = None

        for current, nxt in zip(years, years[1:]):
            gap = nxt - current
            if gap > gap_years:
                gap_years = gap
                gap_start = current
                gap_end = nxt
                first_reappear_year = nxt

        last_known_year = years[-1] if years else None
        years_since_last_seen = (
            current_year - last_known_year if last_known_year is not None else None
        )

        score_value = Decimal("0")
        if gap_years:
            score_value += Decimal(str(gap_years * weights["gap_year_weight"]))
        if years_since_last_seen:
            score_value += Decimal(
                str(years_since_last_seen * weights["years_since_last_seen_weight"])
            )
        score_value -= Decimal(str(total_sightings * weights["total_sightings_penalty"]))
        if score_value < 0:
            score_value = Decimal("0")
        if score_value > 100:
            score_value = Decimal("100")

        is_currently_dark = bool(
            years_since_last_seen is not None
            and years_since_last_seen >= weights["current_dark_years"]
        )
        qualifies_primary = bool(
            gap_years >= weights["primary_gap_years"]
            and years_since_last_seen is not None
            and years_since_last_seen >= weights["primary_last_seen_years"]
        )
        qualifies_secondary = bool(
            years_since_last_seen is not None
            and years_since_last_seen >= weights["secondary_last_seen_years"]
        )

        record = (
            db.query(DarknessScore).filter(DarknessScore.car_id == car.id).one_or_none()
        )
        if record is None:
            record = DarknessScore(car_id=car.id, last_computed=datetime.now(UTC))
            db.add(record)

        record.last_known_year = last_known_year
        record.first_reappear_year = first_reappear_year
        record.gap_start_year = gap_start
        record.gap_end_year = gap_end
        record.gap_years = gap_years or None
        record.total_sightings = total_sightings
        record.years_since_last_seen = years_since_last_seen
        record.score = score_value
        record.is_currently_dark = is_currently_dark
        record.qualifies_primary = qualifies_primary
        record.qualifies_secondary = qualifies_secondary
        record.last_computed = datetime.now(UTC)

    db.commit()
    return len(cars)


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
        compute_score_for_car(db, car, weights=weights, current_year=current_year, commit=False)

    db.commit()
    return len(cars)


def compute_score_for_car(
    db: Session,
    car: Car,
    *,
    weights: dict[str, float] | None = None,
    current_year: int | None = None,
    commit: bool = True,
) -> DarknessScore:
    effective_weights = weights or _get_weights(db)
    effective_current_year = current_year or datetime.now(UTC).year
    custody_events = db.query(CustodyEvent).filter(CustodyEvent.car_id == car.id).all()
    car_events = db.query(CarEvent).filter(CarEvent.car_id == car.id).all()
    values = _calculate_darkness_values(
        custody_events=custody_events,
        car_events=car_events,
        weights=effective_weights,
        current_year=effective_current_year,
    )

    record = db.query(DarknessScore).filter(DarknessScore.car_id == car.id).one_or_none()
    if record is None:
        record = DarknessScore(car_id=car.id, last_computed=datetime.now(UTC))
        db.add(record)

    record.last_known_year = values["last_known_year"]
    record.first_reappear_year = values["first_reappear_year"]
    record.gap_start_year = values["gap_start_year"]
    record.gap_end_year = values["gap_end_year"]
    record.gap_years = values["gap_years"]
    record.total_sightings = values["total_sightings"]
    record.years_since_last_seen = values["years_since_last_seen"]
    record.score = values["score"]
    record.is_currently_dark = values["is_currently_dark"]
    record.qualifies_primary = values["qualifies_primary"]
    record.qualifies_secondary = values["qualifies_secondary"]
    record.last_computed = datetime.now(UTC)

    if commit:
        db.commit()
    else:
        db.flush()
    return record


def _get_weights(db: Session) -> dict[str, float]:
    setting = db.query(AppSetting).filter(AppSetting.key == "darkness_weights").one_or_none()
    return setting.value if setting else DEFAULTS["darkness_weights"]


def _calculate_darkness_values(
    *,
    custody_events: list[CustodyEvent],
    car_events: list[CarEvent],
    weights: dict[str, float],
    current_year: int,
) -> dict[str, Decimal | int | bool | None]:
    years = sorted(
        {
            event.event_year
            for event in [*custody_events, *car_events]
            if event.event_year is not None and event.event_date_precision != "unknown"
        }
    )
    total_sightings = len(custody_events) + len(car_events)
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
    years_since_last_seen = current_year - last_known_year if last_known_year is not None else None

    score_value = Decimal("0")
    if gap_years:
        score_value += Decimal(str(gap_years * weights["gap_year_weight"]))
    if years_since_last_seen:
        score_value += Decimal(str(years_since_last_seen * weights["years_since_last_seen_weight"]))
    score_value -= Decimal(str(total_sightings * weights["total_sightings_penalty"]))
    if score_value < 0:
        score_value = Decimal("0")
    if score_value > 100:
        score_value = Decimal("100")

    return {
        "last_known_year": last_known_year,
        "first_reappear_year": first_reappear_year,
        "gap_start_year": gap_start,
        "gap_end_year": gap_end,
        "gap_years": gap_years or None,
        "total_sightings": total_sightings,
        "years_since_last_seen": years_since_last_seen,
        "score": score_value,
        "is_currently_dark": bool(
            years_since_last_seen is not None and years_since_last_seen >= weights["current_dark_years"]
        ),
        "qualifies_primary": bool(
            gap_years >= weights["primary_gap_years"]
            and years_since_last_seen is not None
            and years_since_last_seen >= weights["primary_last_seen_years"]
        ),
        "qualifies_secondary": bool(
            years_since_last_seen is not None
            and years_since_last_seen >= weights["secondary_last_seen_years"]
        ),
    }

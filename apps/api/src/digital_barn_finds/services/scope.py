from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata

from sqlalchemy.orm import Session

from digital_barn_finds.models import ScopeRejection, VehicleModel
from digital_barn_finds.services.scrapers.base import NormalizedCar


@dataclass(frozen=True, slots=True)
class ScopeDecision:
    is_in_scope: bool
    reason: str | None = None
    vehicle_model: VehicleModel | None = None


def evaluate_scope(db: Session, car: NormalizedCar) -> ScopeDecision:
    scoped_models = (
        db.query(VehicleModel)
        .filter(VehicleModel.in_scope.is_(True))
        .order_by(VehicleModel.make.asc(), VehicleModel.model.asc(), VehicleModel.variant.asc())
        .all()
    )
    if not scoped_models:
        return ScopeDecision(is_in_scope=True, reason="no_scope_models_configured")

    normalized_make = _normalize(car.make)
    normalized_model = _normalize(car.model)
    normalized_variant = _normalize(car.variant)
    candidate_text = " ".join(part for part in [normalized_model, normalized_variant] if part).strip()
    if not normalized_make or not candidate_text:
        return ScopeDecision(is_in_scope=False, reason="missing_make_or_model")

    ranked_matches: list[tuple[int, VehicleModel]] = []
    for vehicle_model in scoped_models:
        if _normalize(vehicle_model.make) != normalized_make:
            continue

        model_score = _match_score(_normalize(vehicle_model.model), candidate_text)
        if model_score <= 0:
            continue

        score = model_score
        normalized_scope_variant = _normalize(vehicle_model.variant)
        if normalized_scope_variant:
            variant_score = _match_score(normalized_scope_variant, candidate_text)
            if variant_score <= 0:
                continue
            score += variant_score
        elif normalized_variant:
            score += 5

        ranked_matches.append((score, vehicle_model))

    if not ranked_matches:
        return ScopeDecision(
            is_in_scope=False,
            reason=f"out_of_scope:{car.make} {car.model}".strip(),
        )

    ranked_matches.sort(
        key=lambda item: (
            item[0],
            bool(item[1].variant),
            len(_normalize(item[1].model)),
            len(_normalize(item[1].variant)),
        ),
        reverse=True,
    )
    return ScopeDecision(is_in_scope=True, vehicle_model=ranked_matches[0][1])


def log_scope_rejection(
    db: Session,
    *,
    source_url: str,
    car: NormalizedCar,
    reason: str | None,
) -> None:
    db.add(
        ScopeRejection(
            source_url=source_url,
            make=car.make,
            model=" ".join(part for part in [car.model, car.variant] if part).strip() or car.model,
            reason=reason or "out_of_scope",
        )
    )
    db.flush()


def _match_score(scope_text: str, candidate_text: str) -> int:
    if not scope_text or not candidate_text:
        return 0
    if scope_text == candidate_text:
        return 100
    if _contains_phrase(candidate_text, scope_text):
        return 80
    scope_tokens = set(scope_text.split())
    candidate_tokens = set(candidate_text.split())
    if scope_tokens and scope_tokens.issubset(candidate_tokens):
        return 65
    if candidate_tokens and candidate_tokens.issubset(scope_tokens):
        return 40
    return 0


def _contains_phrase(haystack: str, needle: str) -> bool:
    return re.search(rf"(^|\s){re.escape(needle)}($|\s)", haystack) is not None


def _normalize(value: str | None) -> str:
    if not value:
        return ""
    ascii_text = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    return re.sub(r"[^a-z0-9]+", " ", ascii_text.lower()).strip()

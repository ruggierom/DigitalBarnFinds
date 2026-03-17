from __future__ import annotations

from dataclasses import dataclass
import re
from typing import TYPE_CHECKING
from urllib.parse import quote_plus, urlparse

if TYPE_CHECKING:
    from digital_barn_finds.models import Car, CarSource

RESEARCH_SITE_GROUPS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "auction",
        (
            "bringatrailer.com",
            "carsandbids.com",
            "rmsothebys.com",
            "goodingco.com",
            "mecum.com",
            "artcurial.com",
            "aguttes.com",
            "osenat.com",
            "historics.co.uk",
            "iconicauctioneers.com",
        ),
    ),
    (
        "community",
        (
            "ferrarichat.com",
            "barchetta.cc",
            "forza288.com",
        ),
    ),
    (
        "market",
        (
            "classic.com",
            "hemmings.com",
            "carandclassic.com",
            "collectingcars.com",
        ),
    ),
)


@dataclass(frozen=True)
class ResearchLink:
    label: str
    category: str
    query: str
    url: str


def build_research_links(car: Car, source_records: list[CarSource] | None = None) -> list[ResearchLink]:
    identifier_variants = build_identifier_variants(car.display_serial_number)
    if not identifier_variants:
        return []

    descriptor_terms = build_descriptor_terms(car)
    primary_identifier = identifier_variants[0]
    secondary_identifier = next(
        (variant for variant in identifier_variants[1:] if variant != primary_identifier),
        None,
    )
    source_domains = {
        domain
        for domain in (_extract_domain(record.source_url) for record in (source_records or []))
        if domain
    }

    links: list[ResearchLink] = []
    links.append(_google_link("Google exact", "general", _compose_query(primary_identifier, descriptor_terms)))
    links.append(_google_link("Google images", "images", _compose_query(primary_identifier, descriptor_terms), images=True))

    if secondary_identifier:
        links.append(
            _google_link(
                "Google normalized VIN/chassis",
                "general",
                _compose_query(secondary_identifier, descriptor_terms),
            )
        )

    for category, domains in RESEARCH_SITE_GROUPS:
        for domain in domains:
            label = _site_label(domain)
            if domain in source_domains:
                label = f"{label} (known source)"
            links.append(
                _google_link(
                    label,
                    category,
                    _compose_site_query(primary_identifier, descriptor_terms, domain),
                )
            )

    return _dedupe_links(links)


def _build_descriptor_terms(car: Car) -> list[str]:
    return build_descriptor_terms(car)


def build_descriptor_terms(car: Car) -> list[str]:
    terms: list[str] = []
    year_built = getattr(car, "year_built", None)
    make = getattr(car, "make", None)
    model = getattr(car, "model", None)
    variant = getattr(car, "variant", None)

    if year_built:
        terms.append(str(year_built))
    if make:
        terms.append(make)
    if model:
        terms.append(model)
    if variant:
        terms.append(variant)
    return [term.strip() for term in terms if term and term.strip()]


def _build_identifier_variants(serial_number: str | None) -> list[str]:
    return build_identifier_variants(serial_number)


def build_identifier_variants(serial_number: str | None) -> list[str]:
    raw = (serial_number or "").strip()
    if not raw:
        return []

    variants: list[str] = [raw]
    normalized = re.sub(r"[^A-Za-z0-9]", "", raw).upper()
    if normalized and normalized != raw.upper():
        variants.append(normalized)

    spaced = re.sub(r"[^A-Za-z0-9]+", " ", raw).strip()
    if spaced and spaced.lower() != raw.lower():
        variants.append(spaced)

    gt_style_match = re.fullmatch(r"(?P<prefix>\d{3,5})(?P<suffix>[A-Za-z]{1,4})", normalized)
    if gt_style_match:
        variants.append(f"{gt_style_match.group('prefix')} {gt_style_match.group('suffix').upper()}")

    return _dedupe_strings(variants)


def _compose_query(identifier: str, descriptor_terms: list[str]) -> str:
    quoted_identifier = f'"{identifier}"'
    if not descriptor_terms:
        return quoted_identifier
    return f"{quoted_identifier} {' '.join(descriptor_terms)}"


def _compose_site_query(identifier: str, descriptor_terms: list[str], domain: str) -> str:
    query = f'site:{domain} "{identifier}"'
    if descriptor_terms:
        query = f"{query} {' '.join(descriptor_terms[:3])}"
    return query


def _google_link(label: str, category: str, query: str, *, images: bool = False) -> ResearchLink:
    parameters = f"tbm=isch&q={quote_plus(query)}" if images else f"q={quote_plus(query)}"
    return ResearchLink(
        label=label,
        category=category,
        query=query,
        url=f"https://www.google.com/search?{parameters}",
    )


def _dedupe_links(links: list[ResearchLink]) -> list[ResearchLink]:
    seen: set[str] = set()
    ordered: list[ResearchLink] = []
    for link in links:
        if link.url in seen:
            continue
        seen.add(link.url)
        ordered.append(link)
    return ordered


def _dedupe_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        key = value.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        ordered.append(value.strip())
    return ordered


def _extract_domain(url: str | None) -> str | None:
    if not url:
        return None
    host = urlparse(url).hostname or ""
    return host.removeprefix("www.").lower() or None


def _site_label(domain: str) -> str:
    return domain.removeprefix("www.")

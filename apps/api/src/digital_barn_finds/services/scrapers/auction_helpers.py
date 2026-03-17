from __future__ import annotations

from datetime import date
import re
import unicodedata
from urllib.parse import urljoin

from bs4 import BeautifulSoup


MULTI_WORD_MAKES = (
    "Alfa Romeo",
    "Aston Martin",
    "De Tomaso",
    "Ferrari",
    "Land Rover",
    "Mercedes-Benz",
    "Rolls-Royce",
)

FIELD_LABEL_ALIASES = {
    "sale_title": ("Auction", "Sale", "Event", "Vente"),
    "sale_date": ("Auction Date", "Sale Date", "Date de vente", "Vente le", "Date"),
    "sale_location": ("Location", "Lieu"),
    "sold_price": ("Sold For", "Sold", "Result", "Résultat"),
    "estimate": ("Estimate", "Estimation"),
    "registration": ("Registration", "Registration Number", "Immatriculation"),
    "transmission": ("Transmission", "Gearbox", "Boite", "Boîte"),
    "interior_color": ("Interior Color", "Interior", "Couleur intérieure"),
    "exterior_color": ("Exterior Color", "Color", "Couleur extérieure", "Couleur"),
    "odometer": ("Odometer", "Odometer reads", "Mileage", "Kilometers", "Kilometres"),
}

BODY_STYLE_LABELS = (
    ("berlinetta", "Berlinetta"),
    ("cabriolet", "Cabriolet"),
    ("camper", "Camper"),
    ("convertible", "Convertible"),
    ("coupe", "Coupe"),
    ("coupé", "Coupe"),
    ("estate", "Estate"),
    ("pickup", "Pickup"),
    ("roadster", "Roadster"),
    ("saloon", "Saloon"),
    ("sedan", "Sedan"),
    ("spider", "Spider"),
    ("spyder", "Spyder"),
    ("suv", "SUV"),
    ("targa", "Targa"),
    ("tourer", "Tourer"),
    ("wagon", "Wagon"),
)

MONTH_MAP = {
    "january": 1,
    "janvier": 1,
    "february": 2,
    "fevrier": 2,
    "march": 3,
    "mars": 3,
    "april": 4,
    "avril": 4,
    "may": 5,
    "mai": 5,
    "june": 6,
    "juin": 6,
    "july": 7,
    "juillet": 7,
    "august": 8,
    "aout": 8,
    "september": 9,
    "septembre": 9,
    "october": 10,
    "octobre": 10,
    "november": 11,
    "novembre": 11,
    "december": 12,
    "decembre": 12,
}


def normalize_space(value: str) -> str:
    return " ".join((value or "").replace("\xa0", " ").split())


def normalize_token(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return "".join(character for character in normalized if not unicodedata.combining(character)).lower()


def dedupe_preserving_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def extract_first_match(pattern: re.Pattern[str], text: str) -> str | None:
    match = pattern.search(text)
    if not match:
        return None
    return normalize_space(match.group("value"))


def normalize_money_text(value: str) -> str:
    cleaned = normalize_space(value)
    return re.sub(r"(?<=\d)(EUR|USD|GBP)\b", r" \1", cleaned)


def extract_labeled_value(text: str, labels: tuple[str, ...]) -> str | None:
    segments: list[str] = []
    for line in (text or "").splitlines():
        for segment in line.split("|"):
            normalized_segment = normalize_space(segment)
            if normalized_segment:
                segments.append(normalized_segment)

    for label in labels:
        pattern = re.compile(rf"^{re.escape(label)}\s*:?\s*(?P<value>.+)$", re.IGNORECASE)
        for segment in segments:
            match = pattern.match(segment)
            if match:
                return normalize_space(match.group("value"))
    return None


def extract_semantic_value(
    text: str,
    field_key: str,
    *,
    extra_labels: tuple[str, ...] = (),
) -> str | None:
    labels = FIELD_LABEL_ALIASES.get(field_key)
    if labels is None:
        raise KeyError(f"Unknown semantic field key: {field_key}")
    return extract_labeled_value(text, labels + extra_labels)


def choose_serial(candidate: str | None, fallback: str) -> str:
    cleaned = normalize_space(candidate or "")
    normalized = "".join(character for character in cleaned if character.isalnum())
    if len(normalized) >= 4:
        return cleaned
    return fallback


def infer_body_style(*values: str | None) -> str | None:
    haystack = normalize_token(" ".join(value for value in values if value))
    if not haystack:
        return None
    for token, label in BODY_STYLE_LABELS:
        if normalize_token(token) in haystack:
            return label
    return None


def extract_drive_side(text: str) -> str | None:
    if re.search(r"\b(?:LHD|left[- ]hand drive)\b", text, re.IGNORECASE):
        return "LHD"
    if re.search(r"\b(?:RHD|right[- ]hand drive)\b", text, re.IGNORECASE):
        return "RHD"
    return None


def build_attribute_map(
    base: dict[str, object] | None = None,
    **values: object,
) -> dict[str, str]:
    attributes: dict[str, str] = {}
    if base:
        for key, value in base.items():
            normalized = normalize_attribute_value(value)
            if normalized:
                attributes[key] = normalized
    for key, value in values.items():
        normalized = normalize_attribute_value(value)
        if normalized:
            attributes[key] = normalized
    return attributes


def normalize_attribute_value(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, (list, tuple, set)):
        parts = [normalize_attribute_value(part) for part in value]
        cleaned_parts = [part for part in parts if part]
        return " | ".join(cleaned_parts) if cleaned_parts else None
    return normalize_space(str(value)) or None


def split_title(
    title: str,
    *,
    multi_word_makes: tuple[str, ...] = MULTI_WORD_MAKES,
) -> tuple[int | None, str, str]:
    year_built = None
    remaining = normalize_space(title)
    match = re.match(r"^(?P<year>\d{4})\s+(?P<rest>.+)$", remaining)
    if match:
        year_built = int(match.group("year"))
        remaining = match.group("rest")

    for candidate in multi_word_makes:
        if remaining.lower().startswith(candidate.lower() + " "):
            return year_built, candidate, remaining[len(candidate) + 1 :].strip()

    if " " in remaining:
        make, model = remaining.split(" ", 1)
        return year_built, make.strip(), model.strip()

    if remaining:
        return year_built, remaining, "Unknown model"
    return year_built, "Unknown make", "Unknown model"


def parse_day_month_year(raw_value: str | None) -> tuple[date | None, str, int | None]:
    if not raw_value:
        return None, "unknown", None

    text = normalize_space(raw_value)
    patterns = (
        re.compile(r"(?P<day>\d{1,2})(?:st|nd|rd|th)?\s+(?P<month>[A-Za-zÀ-ÿ]+),?\s+(?P<year>\d{4})"),
        re.compile(r"(?P<month>[A-Za-zÀ-ÿ]+)\s+(?P<day>\d{1,2})(?:st|nd|rd|th)?,?\s+(?P<year>\d{4})"),
    )

    for pattern in patterns:
        match = pattern.search(text)
        if not match:
            continue
        month = MONTH_MAP.get(normalize_token(match.group("month")))
        year = int(match.group("year"))
        if month is None:
            return None, "year", year
        parsed = date(year, month, int(match.group("day")))
        return parsed, "day", parsed.year

    year_match = re.search(r"\b(19|20)\d{2}\b", text)
    if year_match:
        return None, "year", int(year_match.group(0))
    return None, "unknown", None


def extract_year(raw_value: str | None) -> int | None:
    if not raw_value:
        return None
    match = re.search(r"\b(19|20)\d{2}\b", raw_value)
    return int(match.group(0)) if match else None


def collect_image_media(
    soup: BeautifulSoup,
    *,
    base_url: str,
    allow_substrings: tuple[str, ...] = (),
    deny_substrings: tuple[str, ...] = (),
    strip_query: bool = True,
) -> list[dict[str, str | None]]:
    media: list[dict[str, str | None]] = []
    seen: set[str] = set()

    for image in soup.find_all("img"):
        source = (
            image.get("src")
            or image.get("data-src")
            or image.get("data-original")
            or image.get("data-lazy")
            or ""
        ).strip()
        if not source:
            continue
        cleaned = source.split("?", 1)[0].strip() if strip_query else source.strip()
        if not cleaned:
            continue
        if allow_substrings and not any(token in cleaned for token in allow_substrings):
            continue
        if any(token in cleaned for token in deny_substrings):
            continue
        absolute = urljoin(f"{base_url}/", cleaned)
        if absolute in seen:
            continue
        seen.add(absolute)
        media.append({"url": absolute, "media_type": "image/jpeg", "caption": None})

    return media

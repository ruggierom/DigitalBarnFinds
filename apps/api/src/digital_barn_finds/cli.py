from __future__ import annotations

import argparse
from pprint import pprint

from digital_barn_finds.database import SessionLocal
from digital_barn_finds.models import Car, Source
from digital_barn_finds.seed import seed_sources
from digital_barn_finds.services.darkness import compute_scores
from digital_barn_finds.services.enrichment import enrich_cars
from digital_barn_finds.services.fetch_more import fetch_random_cars
from digital_barn_finds.services.ingest import upsert_scraped_car
from digital_barn_finds.services.media_backfill import cache_existing_media
from digital_barn_finds.services.research import build_research_links
from digital_barn_finds.services.scrapers.fixtures import (
    get_source_fixture_dir,
    load_source_fixture_definitions,
)
from digital_barn_finds.services.scrapers.registry import get_scraper


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="digital-barn-finds")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("seed")
    subparsers.add_parser("score")
    cache_media_parser = subparsers.add_parser("cache-media")
    cache_media_parser.add_argument("--limit", type=int, default=100)
    cache_media_parser.add_argument("--scraper-key")
    enrich_parser = subparsers.add_parser("enrich")
    enrich_parser.add_argument("--car-id")
    enrich_parser.add_argument("--serial-number")
    enrich_parser.add_argument("--limit", type=int, default=1)
    enrich_parser.add_argument("--max-imports-per-car", type=int, default=5)
    research_links_parser = subparsers.add_parser("research-links")
    research_links_parser.add_argument("--serial-number", required=True)
    fetch_parser = subparsers.add_parser("fetch-random")
    fetch_parser.add_argument("--limit", type=int, default=25)
    fetch_parser.add_argument(
        "--scraper-key",
        required=True,
        help="Registered scraper key to run, for example 'barchetta'.",
    )
    fetch_parser.add_argument(
        "--ignore-without-images",
        action="store_true",
        help="Skip imported cars that do not have any scraped media.",
    )

    scrape_parser = subparsers.add_parser("test-scrape")
    scrape_parser.add_argument("--limit", type=int, default=3)
    scrape_parser.add_argument(
        "--scraper-key",
        default="barchetta",
        help="Registered scraper key to run, for example 'barchetta'.",
    )
    scrape_parser.add_argument(
        "--commit",
        action="store_true",
        help="Persist scraped cars into the local database.",
    )
    scrape_parser.add_argument(
        "--from-files",
        action="store_true",
        help="Read saved adapter fixtures from apps/api/fixtures/<source_key> instead of fetching live.",
    )

    return parser.parse_args()


def run_seed() -> None:
    seed_sources()
    print("Seeded sources and default settings.")


def run_score() -> None:
    db = SessionLocal()
    try:
        processed = compute_scores(db)
        print(f"Computed darkness scores for {processed} cars.")
    finally:
        db.close()


def run_cache_media(limit: int, scraper_key: str | None) -> None:
    db = SessionLocal()
    try:
        result = cache_existing_media(db, limit=limit, scraper_key=scraper_key)
        print(
            f"Requested {result.requested}, cached {result.updated}, deduped {result.deduped}, skipped {result.skipped}, "
            f"remaining remote {result.remaining_remote}."
        )
        if result.errors:
            print("Errors:")
            for error in result.errors:
                print(f"- {error}")
    finally:
        db.close()


def run_research_links(serial_number: str) -> None:
    db = SessionLocal()
    try:
        normalized_serial = "".join(character for character in serial_number.lower() if character.isalnum())
        car = db.query(Car).filter(Car.normalized_serial_number == normalized_serial).one_or_none()
        if car is None:
            raise SystemExit(
                f"No car found for serial_number={serial_number!r}. Use an imported VIN/chassis/serial number."
            )

        links = build_research_links(car, car.sources)
        print(f"Research links for {car.display_serial_number} ({car.make} {car.model})")
        for link in links:
            print(f"- [{link.category}] {link.label}")
            print(f"  query: {link.query}")
            print(f"  url: {link.url}")
    finally:
        db.close()


def run_enrich(
    *,
    car_id: str | None,
    serial_number: str | None,
    limit: int,
    max_imports_per_car: int,
) -> None:
    db = SessionLocal()
    try:
        result = enrich_cars(
            db,
            car_id=car_id,
            serial_number=serial_number,
            limit=limit,
            max_imports_per_car=max_imports_per_car,
        )
        print(
            f"Processed {result.processed} cars, attempted {result.queries_attempted} searches, "
            f"discovered {result.candidate_count} candidates, imported {result.imported_count} sources."
        )
        for car_result in result.cars:
            print(
                f"- {car_result.serial_number}: queries={car_result.queries_attempted}, "
                f"candidates={car_result.candidate_count}, imported={car_result.imported_count}, "
                f"known_url_skips={car_result.skipped_known_urls}, mismatches={car_result.skipped_serial_mismatch}"
            )
            for imported in car_result.imported:
                print(
                    f"  imported [{imported.scraper_key}] {imported.source_url} -> "
                    f"{imported.serial_number} ({imported.make} {imported.model})"
                )
            for error in car_result.errors:
                print(f"  error: {error}")
        for error in result.errors:
            print(f"Run error: {error}")
    finally:
        db.close()


def run_test_scrape(limit: int, commit: bool, from_files: bool, scraper_key: str) -> None:
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.scraper_key == scraper_key).one_or_none()
        if source is None:
            raise SystemExit(f"No seeded source found for scraper_key={scraper_key!r}. Run `seed` first.")

        scraper = get_scraper(scraper_key)
        if from_files:
            fixture_definitions = [
                definition
                for definition in load_source_fixture_definitions(scraper_key)
                if definition.fixture.fixture_type in scraper.manifest.supported_detail_fixture_types
            ]
            selected_fixtures = fixture_definitions[:limit]
            print(
                f"Found {len(selected_fixtures)} saved adapter fixtures in "
                f"{get_source_fixture_dir(scraper_key)}."
            )
            records = [scraper.parse_record_fixture(definition.fixture) for definition in selected_fixtures]
        else:
            urls = scraper.crawl(full=True)[:limit]
            print(f"Discovered {len(urls)} detail pages for scraper {scraper_key}.")
            records = [scraper.parse_detail_page(url) for url in urls]

        total = len(records)
        for index, record in enumerate(records, start=1):
            print(f"\n[{index}/{total}] {record.car.make} {record.car.model}")
            print(f"Serial: {record.car.serial_number}")
            print(f"URL: {record.source_url}")
            print(
                f"Parsed {len(record.custody_events)} custody events and "
                f"{len(record.car_events)} car events."
            )
            if record.car.attributes:
                pprint(record.car.attributes)
            if commit:
                car = upsert_scraped_car(db, source, record)
                print(f"Upserted canonical car {car.display_serial_number}.")
    finally:
        db.close()


def run_fetch_random(limit: int, scraper_key: str, ignore_without_images: bool) -> None:
    db = SessionLocal()
    try:
        result = fetch_random_cars(
            db,
            limit=limit,
            scraper_key=scraper_key,
            ignore_without_images=ignore_without_images,
        )
        print(
            f"Random fetch requested {result.requested}, discovered {result.discovered}, "
            f"imported {result.imported}, skipped {result.skipped_existing} existing, "
            f"skipped {result.skipped_without_images} without images."
        )
        print(f"Mode used: {result.mode_used}. Source: {result.source_name}.")
        if result.errors:
            print("Errors:")
            for error in result.errors:
                print(f"- {error}")
    finally:
        db.close()


def main() -> None:
    args = parse_args()
    if args.command == "seed":
        run_seed()
    elif args.command == "score":
        run_score()
    elif args.command == "cache-media":
        run_cache_media(limit=args.limit, scraper_key=args.scraper_key)
    elif args.command == "enrich":
        run_enrich(
            car_id=args.car_id,
            serial_number=args.serial_number,
            limit=args.limit,
            max_imports_per_car=args.max_imports_per_car,
        )
    elif args.command == "research-links":
        run_research_links(serial_number=args.serial_number)
    elif args.command == "fetch-random":
        run_fetch_random(
            limit=args.limit,
            scraper_key=args.scraper_key,
            ignore_without_images=args.ignore_without_images,
        )
    elif args.command == "test-scrape":
        run_test_scrape(
            limit=args.limit,
            commit=args.commit,
            from_files=args.from_files,
            scraper_key=args.scraper_key,
        )


if __name__ == "__main__":
    main()

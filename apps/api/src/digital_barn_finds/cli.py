from __future__ import annotations

import argparse
from pprint import pprint
from pathlib import Path

from digital_barn_finds.database import SessionLocal
from digital_barn_finds.models import Source
from digital_barn_finds.seed import seed_sources
from digital_barn_finds.services.darkness import compute_scores
from digital_barn_finds.services.fetch_more import fetch_random_cars
from digital_barn_finds.services.fixture_pool import discover_barchetta_fixture_pages
from digital_barn_finds.services.ingest import upsert_scraped_car
from digital_barn_finds.services.scrapers.barchetta import BarchettaScraper


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="digital-barn-finds")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("seed")
    subparsers.add_parser("score")
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
        "--commit",
        action="store_true",
        help="Persist scraped cars into the local database.",
    )
    scrape_parser.add_argument(
        "--from-files",
        action="store_true",
        help="Read saved detail pages from apps/api/fixtures/barchetta instead of fetching live.",
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


def run_test_scrape(limit: int, commit: bool, from_files: bool) -> None:
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.scraper_key == "barchetta").one()
        scraper = BarchettaScraper()
        if from_files:
            fixture_dir = discover_barchetta_fixture_pages()
            files = fixture_dir[:limit]
            print(
                f"Found {len(files)} local fixture pages in "
                f"{Path(__file__).resolve().parents[2] / 'fixtures' / 'barchetta'}."
            )
            records = [scraper.parse_detail_file(path) for path in files]
        else:
            urls = scraper.crawl(full=True)[:limit]
            print(f"Discovered {len(urls)} detail pages for test scrape.")
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
    elif args.command == "fetch-random":
        run_fetch_random(
            limit=args.limit,
            scraper_key=args.scraper_key,
            ignore_without_images=args.ignore_without_images,
        )
    elif args.command == "test-scrape":
        run_test_scrape(limit=args.limit, commit=args.commit, from_files=args.from_files)


if __name__ == "__main__":
    main()

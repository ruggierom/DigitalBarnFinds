from __future__ import annotations

import argparse
from pathlib import Path

from digital_barn_finds.database import SessionLocal
from digital_barn_finds.services.chassis_seed_import import import_chassis_seed_rows, parse_csv_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import chassis seed CSV rows into the database.")
    parser.add_argument("csv_path", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    raw_text = args.csv_path.read_text(encoding="utf-8-sig")
    rows = parse_csv_rows(raw_text)

    db = SessionLocal()
    try:
        result = import_chassis_seed_rows(db, rows)
    finally:
        db.close()

    print(
        f"Requested {result.requested}, imported {result.imported}, "
        f"skipped duplicates {result.skipped_duplicates}."
    )
    if result.errors:
        print("Errors:")
        for error in result.errors:
            print(f"- {error}")


if __name__ == "__main__":
    main()

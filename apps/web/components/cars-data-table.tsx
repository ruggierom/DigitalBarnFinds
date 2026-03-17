"use client";

import Link from "next/link";
import { useState } from "react";

import type { CarRow } from "@/lib/api";

type CarsDataTableProps = {
  rows: CarRow[];
};

type SortKey =
  | "serial_number"
  | "make"
  | "model"
  | "variant"
  | "year_built"
  | "build_date_label"
  | "drive_side"
  | "original_color"
  | "darkness_score"
  | "last_known_year"
  | "gap_years"
  | "is_currently_dark"
  | "candidate"
  | "watchlist_status"
  | "source_count"
  | "image_count"
  | "notes";

type SortDirection = "asc" | "desc";

type ColumnDefinition = {
  key: SortKey;
  label: string;
  render: (row: CarRow) => React.ReactNode;
  value: (row: CarRow) => string | number | boolean;
  filterValue: (row: CarRow) => string;
  className?: string;
};

const columns: ColumnDefinition[] = [
  {
    key: "serial_number",
    label: "Vehicle ID",
    render: (row) => (
      <Link
        className="data-table__link"
        href={`/cars?q=${encodeURIComponent(row.serial_number)}&search=true`}
        rel="noreferrer"
        target="_blank"
      >
        {row.serial_number}
      </Link>
    ),
    value: (row) => row.serial_number,
    filterValue: (row) => row.serial_number,
    className: "data-table__mono",
  },
  {
    key: "make",
    label: "Make",
    render: (row) => row.make,
    value: (row) => row.make,
    filterValue: (row) => row.make,
  },
  {
    key: "model",
    label: "Model",
    render: (row) => row.model,
    value: (row) => row.model,
    filterValue: (row) => row.model,
  },
  {
    key: "variant",
    label: "Variant",
    render: (row) => row.variant ?? "",
    value: (row) => row.variant ?? "",
    filterValue: (row) => row.variant ?? "",
  },
  {
    key: "year_built",
    label: "Year",
    render: (row) => row.year_built ?? "",
    value: (row) => row.year_built ?? 0,
    filterValue: (row) => String(row.year_built ?? ""),
    className: "data-table__numeric",
  },
  {
    key: "build_date_label",
    label: "Build Date",
    render: (row) => row.build_date_label ?? "",
    value: (row) => row.build_date_label ?? "",
    filterValue: (row) => row.build_date_label ?? "",
  },
  {
    key: "drive_side",
    label: "Drive",
    render: (row) => row.drive_side ?? "",
    value: (row) => row.drive_side ?? "",
    filterValue: (row) => row.drive_side ?? "",
  },
  {
    key: "original_color",
    label: "Color",
    render: (row) => row.original_color ?? "",
    value: (row) => row.original_color ?? "",
    filterValue: (row) => row.original_color ?? "",
  },
  {
    key: "darkness_score",
    label: "Darkness",
    render: (row) => row.darkness_score ?? "",
    value: (row) => row.darkness_score ?? 0,
    filterValue: (row) => String(row.darkness_score ?? ""),
    className: "data-table__numeric",
  },
  {
    key: "last_known_year",
    label: "Last Seen",
    render: (row) => row.last_known_year ?? "",
    value: (row) => row.last_known_year ?? 0,
    filterValue: (row) => String(row.last_known_year ?? ""),
    className: "data-table__numeric",
  },
  {
    key: "gap_years",
    label: "Gap",
    render: (row) => row.gap_years ?? "",
    value: (row) => row.gap_years ?? 0,
    filterValue: (row) => String(row.gap_years ?? ""),
    className: "data-table__numeric",
  },
  {
    key: "is_currently_dark",
    label: "Dark Now",
    render: (row) => (row.is_currently_dark ? "Yes" : ""),
    value: (row) => row.is_currently_dark,
    filterValue: (row) => (row.is_currently_dark ? "yes" : "no"),
  },
  {
    key: "candidate",
    label: "Candidate",
    render: (row) => (row.qualifies_primary || row.qualifies_secondary ? "Yes" : ""),
    value: (row) => row.qualifies_primary || row.qualifies_secondary,
    filterValue: (row) => (row.qualifies_primary || row.qualifies_secondary ? "yes" : "no"),
  },
  {
    key: "watchlist_status",
    label: "Watchlist",
    render: (row) => row.watchlist_status ?? "",
    value: (row) => row.watchlist_status ?? "",
    filterValue: (row) => row.watchlist_status ?? "",
  },
  {
    key: "source_count",
    label: "Sources",
    render: (row) => row.source_count,
    value: (row) => row.source_count,
    filterValue: (row) => String(row.source_count),
    className: "data-table__numeric",
  },
  {
    key: "image_count",
    label: "Images",
    render: (row) => row.media.length,
    value: (row) => row.media.length,
    filterValue: (row) => String(row.media.length),
    className: "data-table__numeric",
  },
  {
    key: "notes",
    label: "Notes",
    render: (row) => {
      const notes = row.notes ?? "";
      if (notes.length <= 255) {
        return notes;
      }
      return `${notes.slice(0, 255).trimEnd()}...`;
    },
    value: (row) => row.notes ?? "",
    filterValue: (row) => row.notes ?? "",
    className: "data-table__notes",
  },
];

export function CarsDataTable({ rows }: CarsDataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("serial_number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filteredRows = rows.filter((row) =>
    columns.every((column) => {
      const filter = filters[column.key]?.trim().toLowerCase();
      if (!filter) {
        return true;
      }
      return column.filterValue(row).toLowerCase().includes(filter);
    }),
  );

  const sortedRows = [...filteredRows].sort((left, right) => {
    const column = columns.find((item) => item.key === sortKey);
    if (!column) {
      return 0;
    }

    const leftValue = column.value(left);
    const rightValue = column.value(right);
    const direction = sortDirection === "asc" ? 1 : -1;

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    if (typeof leftValue === "boolean" && typeof rightValue === "boolean") {
      return (Number(leftValue) - Number(rightValue)) * direction;
    }

    return String(leftValue).localeCompare(String(rightValue), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * direction;
  });

  return (
    <div className="data-table-shell">
      <div className="data-table-shell__meta">
        <span>{sortedRows.length} visible rows</span>
        <button
          className="button button--secondary data-table-shell__reset"
          onClick={() => setFilters({})}
          type="button"
        >
          Clear column filters
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sortKey === column.key;
              const indicator = active ? (sortDirection === "asc" ? "↑" : "↓") : "";
              return (
                <th className={column.className} key={column.key}>
                  <button
                    className={`data-table__sort${active ? " data-table__sort--active" : ""}`}
                    onClick={() => {
                      if (active) {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                        return;
                      }
                      setSortKey(column.key);
                      setSortDirection("asc");
                    }}
                    type="button"
                  >
                    <span>{column.label}</span>
                    <span>{indicator}</span>
                  </button>
                </th>
              );
            })}
            <th>Source Page</th>
            <th>Lead Image</th>
          </tr>
          <tr className="data-table__filters">
            {columns.map((column) => (
              <th className={column.className} key={`${column.key}-filter`}>
                <input
                  className="data-table__filter"
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      [column.key]: event.target.value,
                    }))
                  }
                  placeholder="Filter..."
                  type="text"
                  value={filters[column.key] ?? ""}
                />
              </th>
            ))}
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const leadImage = row.media.find((item) => item.url)?.url ?? null;
            const sourceUrl = row.sources[0]?.source_url ?? null;
            return (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td className={column.className} key={`${row.id}-${column.key}`}>
                    {column.render(row)}
                  </td>
                ))}
                <td>
                  {sourceUrl ? (
                    <a className="data-table__link" href={sourceUrl} rel="noreferrer" target="_blank">
                      Open source
                    </a>
                  ) : (
                    ""
                  )}
                </td>
                <td>
                  {leadImage ? (
                    <a className="data-table__link" href={leadImage} rel="noreferrer" target="_blank">
                      Open
                    </a>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

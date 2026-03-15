import Link from "next/link";

import { CarsDossierGrid } from "@/components/cars-dossier-grid";
import { getCars } from "@/lib/api";
import type { CarSearchParams } from "@/lib/api";

export default async function CarsPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = Math.max(1, numberParam(searchParams?.page) ?? 1);
  const pageSize = 24;
  const searchIntent = booleanParam(searchParams?.search);
  const params: CarSearchParams = {
    q: firstParam(searchParams?.q ?? searchParams?.query),
    candidates_only: booleanParam(searchParams?.candidates_only),
    make: firstParam(searchParams?.make),
    model: firstParam(searchParams?.model),
    drive_side: firstParam(searchParams?.drive_side),
    original_color: firstParam(searchParams?.original_color),
    source: firstParam(searchParams?.source),
    serial_number: firstParam(searchParams?.serial_number),
    build_date: firstParam(searchParams?.build_date),
    last_seen_before: numberParam(searchParams?.last_seen_before),
    score_min: numberParam(searchParams?.score_min),
    dark_now: booleanParam(searchParams?.dark_now),
    has_images: booleanParam(searchParams?.has_images),
    sort: normalizeSort(firstParam(searchParams?.sort)),
    page,
    page_size: pageSize + 1
  };

  const rows = await getCars(params);
  const visibleRows = rows.slice(0, pageSize);
  const hasNextPage = rows.length > pageSize;
  const browseHref = buildCarsHref({ sort: "recently_imported_desc" });
  const hasFilters = Object.entries(params).some(
    ([key, value]) =>
      !["sort", "page", "page_size"].includes(key) &&
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "relevance"
  );
  const isSearchMode = searchIntent || hasFilters || Boolean(params.q);
  const activeFilters = [
    params.make ? `Make: ${params.make}` : null,
    params.model ? `Model: ${params.model}` : null,
    params.drive_side ? `Drive: ${params.drive_side}` : null,
    params.original_color ? `Color: ${params.original_color}` : null,
    params.source ? `Source: ${params.source}` : null,
    params.serial_number ? `Serial: ${params.serial_number}` : null,
    params.build_date ? `Build date: ${params.build_date}` : null,
    params.score_min !== undefined ? `Score >= ${params.score_min}` : null,
    params.last_seen_before !== undefined ? `Last seen <= ${params.last_seen_before}` : null
  ].filter(Boolean) as string[];

  const presetKey = getPresetKey(params);

  return (
    <>
      <section className="hero">
        <div className="hero__eyebrow">Canonical registry</div>
        <h1 className="hero__title">Read every chassis like a case file.</h1>
        <p className="hero__copy">
          Every car now surfaces its darkness stats, every source page we
          scraped, and the merged provenance timeline that drives the watchlist.
        </p>
      </section>
      <section className="car-search">
        <div className="car-search__heading">
          <div>
            <div className="hero__eyebrow">{isSearchMode ? "Search" : "Browse"}</div>
            <h2 className="section-title">
              {isSearchMode ? "Query chassis, owners, events, and source pages." : "Browse the full registry cleanly."}
            </h2>
          </div>
          <div className="car-search__meta">
            Page {page} · {visibleRows.length} result{visibleRows.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="car-search__presets">
          <Link className={`filter-pill${presetKey === "all" ? " filter-pill--active" : ""}`} href={browseHref as any}>
            All
          </Link>
          <Link className={`filter-pill${presetKey === "dark" ? " filter-pill--active" : ""}`} href={buildCarsHref({ dark_now: true, sort: "darkness_score_desc" }) as any}>
            Dark
          </Link>
          <Link
            className={`filter-pill${presetKey === "candidate" ? " filter-pill--active" : ""}`}
            href={buildCarsHref({ candidates_only: true, sort: "darkness_score_desc" }) as any}
          >
            Candidates
          </Link>
          <Link
            className={`filter-pill${presetKey === "images" ? " filter-pill--active" : ""}`}
            href={buildCarsHref({ has_images: true, sort: "recently_imported_desc" }) as any}
          >
            With images
          </Link>
        </div>
        <form className="car-search__form" method="GET">
          <input name="search" type="hidden" value="true" />
          <input name="page" type="hidden" value="1" />
          <input
            className="field car-search__query"
            defaultValue={params.q ?? ""}
            name="q"
            placeholder="Search serial, model, owner, event, source reference..."
            type="search"
          />
          <select className="field car-search__sort" defaultValue={params.sort} name="sort">
            <option value="relevance">Relevance</option>
            <option value="darkness_score_desc">Darkness score</option>
            <option value="last_known_year_asc">Oldest last seen</option>
            <option value="recently_imported_desc">Recently imported</option>
          </select>
          <div className="car-search__actions">
            <button className="button" type="submit">
              Apply
            </button>
            {hasFilters ? (
              <Link className="button button--secondary" href="/cars">
                Clear
              </Link>
            ) : null}
          </div>
          <details className="car-search__advanced" open={hasFilters}>
            <summary>Advanced filters</summary>
            <div className="car-search__advanced-grid">
              <input className="field" defaultValue={params.make ?? ""} name="make" placeholder="Make" type="text" />
              <input className="field" defaultValue={params.model ?? ""} name="model" placeholder="Model" type="text" />
              <input
                className="field"
                defaultValue={params.drive_side ?? ""}
                name="drive_side"
                placeholder="Drive side"
                type="text"
              />
              <input
                className="field"
                defaultValue={params.original_color ?? ""}
                name="original_color"
                placeholder="Original color"
                type="text"
              />
              <input
                className="field"
                defaultValue={params.source ?? ""}
                name="source"
                placeholder="Source or URL"
                type="text"
              />
              <input
                className="field"
                defaultValue={params.serial_number ?? ""}
                name="serial_number"
                placeholder="Serial number"
                type="text"
              />
              <input
                className="field"
                defaultValue={params.build_date ?? ""}
                name="build_date"
                placeholder="Build date"
                type="date"
              />
              <input
                className="field"
                defaultValue={params.score_min ?? ""}
                min="0"
                max="100"
                name="score_min"
                placeholder="Min darkness score"
                type="number"
              />
              <input
                className="field"
                defaultValue={params.last_seen_before ?? ""}
                min="1800"
                max="2100"
                name="last_seen_before"
                placeholder="Last seen before year"
                type="number"
              />
              <label className="toggle-chip">
                <input defaultChecked={params.dark_now === true} name="dark_now" type="checkbox" value="true" />
                <span>Currently dark only</span>
              </label>
              <label className="toggle-chip">
                <input defaultChecked={params.has_images === true} name="has_images" type="checkbox" value="true" />
                <span>Only cars with images</span>
              </label>
            </div>
          </details>
        </form>
        {activeFilters.length > 0 ? (
          <div className="car-search__active">
            {activeFilters.map((filter) => (
              <span className="active-filter" key={filter}>
                {filter}
              </span>
            ))}
          </div>
        ) : null}
      </section>
      <div className="results-toolbar">
        <div className="results-toolbar__count">
          Showing {visibleRows.length} cars on page {page}
        </div>
        <div className="results-toolbar__pager">
          {page > 1 ? (
            <Link className="pager-link" href={buildCarsHref({ ...params, page: page - 1, page_size: undefined }) as any}>
              Previous
            </Link>
          ) : null}
          {hasNextPage ? (
            <Link className="pager-link" href={buildCarsHref({ ...params, page: page + 1, page_size: undefined }) as any}>
              Next
            </Link>
          ) : null}
        </div>
      </div>
      <CarsDossierGrid rows={visibleRows} />
      {hasNextPage ? (
        <div className="results-loadmore">
          <Link className="button" href={buildCarsHref({ ...params, search: searchIntent || undefined, page: page + 1, page_size: undefined }) as any}>
            Load more results
          </Link>
        </div>
      ) : null}
    </>
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value?: string | string[]) {
  const first = firstParam(value);
  if (!first) {
    return undefined;
  }
  const parsed = Number(first);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanParam(value?: string | string[]) {
  const first = firstParam(value);
  return first === "true" ? true : undefined;
}

function normalizeSort(value?: string) {
  if (
    value === "darkness_score_desc" ||
    value === "last_known_year_asc" ||
    value === "recently_imported_desc"
  ) {
    return value;
  }
  return "relevance";
}

function getPresetKey(params: CarSearchParams) {
  if (params.dark_now) {
    return "dark";
  }
  if (params.candidates_only) {
    return "candidate";
  }
  if (params.has_images) {
    return "images";
  }
  return "all";
}

function buildCarsHref(params: Partial<CarSearchParams> & { search?: boolean }) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) {
      return;
    }
    search.set(key, String(value));
  });
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return `/cars${suffix}`;
}

# DigitalBarnFinds Context

## Overview
- Frontend: Next.js 14 App Router in `apps/web/app`
- Backend: FastAPI in `apps/api/src/digital_barn_finds/main.py`
- Database: Postgres via SQLAlchemy models in `apps/api/src/digital_barn_finds/models.py`
- API response schemas: `apps/api/src/digital_barn_finds/schemas.py`
- Auth: Google NextAuth allowlist, with bypass if `AUTH_DISABLED=true` or `DEV_AUTH_BYPASS=true`

This app is a classic car registry focused on canonical chassis records, provenance timelines, darkness scoring, watchlisting, and source-driven media ingestion.

## Core Domain Model
- `Car` is the canonical merged car record.
- `CarSource` is a per-source scraped record mapped onto a canonical `Car`.
- `CustodyEvent` stores ownership/provenance entries.
- `CarEvent` stores race/show/appearance entries.
- `CarMedia` stores media rows associated with a source record.
- `DarknessScore` stores computed “darkness” and candidate metrics.
- `WatchlistEntry` stores human curation and notes.
- `Source` stores source registry definitions and scrape config.
- `ScrapeLog` stores scrape run history.
- `AppSetting` stores editable admin settings.

## Web Routes

### Root / Auth
- `/`
  - Redirects to `/dashboard`
  - File: `apps/web/app/page.tsx`
- `/signin`
  - Sign-in / entry page
  - If auth bypass is enabled, shows a “Continue to dashboard” button
  - Otherwise uses Google sign-in
  - File: `apps/web/app/signin/page.tsx`
- `/api/auth/[...nextauth]`
  - NextAuth GET/POST route
  - File: `apps/web/app/api/auth/[...nextauth]/route.ts`

### Authenticated App
All authenticated pages are wrapped by:
- `apps/web/app/(authenticated)/layout.tsx`

Pages:
- `/dashboard`
  - Dashboard metrics + watchlist snapshot
  - File: `apps/web/app/(authenticated)/dashboard/page.tsx`
- `/cars`
  - Main registry/search/results UI
  - Supports card “Web view” and tabular “Data view”
  - File: `apps/web/app/(authenticated)/cars/page.tsx`
- `/watchlist`
  - Editable watchlist UI
  - File: `apps/web/app/(authenticated)/watchlist/page.tsx`
- `/sources`
  - Source/scrape status view
  - File: `apps/web/app/(authenticated)/sources/page.tsx`
- `/settings`
  - App settings, diagnostics, optional fetch-more UI
  - File: `apps/web/app/(authenticated)/settings/page.tsx`
- `/request-lab`
  - Internal request testing/debugging page
  - File: `apps/web/app/(authenticated)/request-lab/page.tsx`

### Internal Web Utility Route
- `/cars/export`
  - Next.js route that proxies export requests to the backend API using `API_BASE_URL` and `API_ADMIN_TOKEN`
  - File: `apps/web/app/(authenticated)/cars/export/route.ts`

## `/cars` Query Params
The cars page is both the registry and the search/results UI. It is query-param driven, not a separate search route.

Supported params:
- `q`
- `query`
- `candidates_only`
- `make`
- `model`
- `drive_side`
- `original_color`
- `source`
- `serial_number`
- `build_date`
- `year_from`
- `year_to`
- `last_seen_before`
- `score_min`
- `score_max`
- `dark_now`
- `has_images`
- `sort`
  - `relevance`
  - `darkness_score_desc`
  - `last_known_year_asc`
  - `recently_imported_desc`
- `page`
- `page_size`
- `view`
  - `cards`
  - `data`

## API Endpoints
Defined in `apps/api/src/digital_barn_finds/main.py`.

### Public
- `GET /healthz`
- `GET /stats`
- `GET /media/local?path=...`
- `GET|POST|PUT|PATCH|DELETE|HEAD /debug/echo`

### Admin Token Required
These require `x-admin-token`.

- `GET /dashboard`
- `GET /cars`
- `GET /cars/export`
- `GET /watchlist`
- `PUT /watchlist/{car_id}`
- `GET /sources`
- `GET /settings`
- `PUT /settings/{key}`
- `POST /admin/jobs/score`
- `POST /admin/jobs/upsert`
- `POST /admin/jobs/fetch`
  - accepts:
    - `limit`
    - `ignore_without_images`
- `GET /admin/barchetta/request-diagnostics`
- `POST /admin/request-lab`

## API Response Shapes
Defined in `apps/api/src/digital_barn_finds/schemas.py`.

### `DashboardSnapshot`
- `candidate_count`
- `watchlist_count`
- `source_count`
- `dark_now_count`

### `RegistryStats`
- `total_cars`
- `cars_with_media`
- `media_rows`
- `enabled_sources`
- `watchlist_count`
- `dark_now_count`
- `primary_candidate_count`
- `secondary_candidate_count`

### `CarListItem`
- `id`
- `serial_number`
- `make`
- `model`
- `variant`
- `year_built`
- `build_date`
- `build_date_precision`
- `build_date_label`
- `body_style`
- `drive_side`
- `original_color`
- `notes`
- `source_count`
- `darkness_score`
- `last_known_year`
- `gap_years`
- `years_since_last_seen`
- `is_currently_dark`
- `qualifies_primary`
- `qualifies_secondary`
- `watchlist_status`
- `sources: CarSourceItem[]`
- `media: CarMediaItem[]`
- `timeline: CarTimelineItem[]`

### `CarSourceItem`
- `source_name`
- `source_url`
- `source_serial_number`
- `scraped_at`

### `CarTimelineItem`
- `kind`
- `event_date`
- `event_date_label`
- `event_date_precision`
- `event_year`
- `title`
- `subtitle`
- `detail`
- `source_reference`

### `CarMediaItem`
- `media_type`
- `url`
- `caption`

### `WatchlistItem`
- `car_id`
- `serial_number`
- `make`
- `model`
- `priority`
- `status`
- `score`
- `interest_reason`
- `agent_instructions`
- `notes`
- `updated_at`

### `SourceSummary`
- `id`
- `name`
- `base_url`
- `scraper_key`
- `enabled`
- `last_scraped_at`
- `last_status`

### `SettingItem`
- `key`
- `value`
- `description`
- `updated_at`

## Database Schema
Defined in `apps/api/src/digital_barn_finds/models.py`.

### `sources`
- `id`
- `name`
- `base_url`
- `scraper_key`
- `enabled`
- `last_scraped_at`
- `notes`

### `cars`
- `id`
- `normalized_serial_number`
- `display_serial_number`
- `make`
- `model`
- `variant`
- `year_built`
- `build_date`
- `build_date_precision`
- `body_style`
- `drive_side`
- `original_color`
- `notes`
- `source_count`

### `car_sources`
- `id`
- `car_id`
- `source_id`
- `source_url`
- `source_serial_number`
- `source_make`
- `source_model`
- `source_variant`
- `source_payload`
- `scraped_at`

Unique constraints:
- `(car_id, source_id)`
- `(source_id, source_url)`

### `car_attributes`
- `id`
- `car_source_id`
- `attr_key`
- `attr_value`

### `custody_events`
- `id`
- `car_id`
- `car_source_id`
- `event_date`
- `event_date_precision`
- `event_year`
- `owner_name`
- `location`
- `price_paid`
- `price_currency`
- `transaction_notes`
- `source_reference`

### `car_events`
- `id`
- `car_id`
- `car_source_id`
- `event_date`
- `event_date_precision`
- `event_year`
- `event_name`
- `event_type`
- `driver`
- `car_number`
- `result`
- `location`
- `source_reference`

### `car_media`
- `id`
- `car_id`
- `car_source_id`
- `media_type`
- `url`
- `caption`
- `scraped_at`

Unique constraint:
- `(car_source_id, url)`

### `darkness_scores`
- `id`
- `car_id`
- `last_known_year`
- `first_reappear_year`
- `gap_start_year`
- `gap_end_year`
- `gap_years`
- `total_sightings`
- `years_since_last_seen`
- `score`
- `is_currently_dark`
- `qualifies_primary`
- `qualifies_secondary`
- `last_computed`

One-to-one:
- `car_id` is unique

### `watchlist`
- `id`
- `car_id`
- `priority`
- `status`
- `interest_reason`
- `agent_instructions`
- `notes`

One-to-one:
- `car_id` is unique

### `scrape_log`
- `id`
- `source_id`
- `run_at`
- `status`
- `mode`
- `cars_found`
- `cars_updated`
- `errors`
- `duration_seconds`

### `app_settings`
- `id`
- `key`
- `value`
- `description`

## Relationships
- `Car` has many `CarSource`
- `Car` has many `CustodyEvent`
- `Car` has many `CarEvent`
- `Car` has many `CarMedia`
- `Car` has one `DarknessScore`
- `Car` has one `WatchlistEntry`
- `Source` has many `CarSource`
- `Source` has many `ScrapeLog`

## Auth and Environment Notes
- Frontend authenticated layout redirects unauthenticated users to `/signin`
- If auth bypass is enabled, the app uses a fake local admin session
- NextAuth Google allowlist lives in `apps/web/lib/auth.ts`
- Server-side web API calls use:
  - `API_BASE_URL`
  - `API_ADMIN_TOKEN`
- API admin protection uses `DBF_ADMIN_TOKEN`

## Useful Mental Model
This is a Next.js admin UI over a FastAPI/Postgres backend for a classic car registry. The main object is a canonical `Car`, merged from one or more `CarSource` records. Provenance is stored in `custody_events`, race/show history in `car_events`, media in `car_media`, computed candidate/darkness metrics in `darkness_scores`, and human notes in `watchlist`. The main working UI is `/cars`, which doubles as search/results and supports both card and table views.

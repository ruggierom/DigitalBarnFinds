# DigitalBarnFinds Context

## Overview
- Frontend: Next.js 14 App Router in `apps/web/app`
- Backend: FastAPI in `apps/api/src/digital_barn_finds/main.py`
- Database: Postgres via SQLAlchemy models in `apps/api/src/digital_barn_finds/models.py`
- API response schemas: `apps/api/src/digital_barn_finds/schemas.py`
- Auth: Google NextAuth allowlist, with bypass if `AUTH_DISABLED=true` or `DEV_AUTH_BYPASS=true`

This app is a classic car registry focused on canonical chassis records, provenance timelines, darkness scoring, watchlisting, and source-driven media ingestion. The platform's core mission is detecting "dark" chassis — significant collector cars that have disappeared from public record — and building intelligence toward locating and contacting current owners.

---

## Core Domain Model
- `Car` is the canonical merged car record.
- `CarSource` is a per-source scraped record mapped onto a canonical `Car`.
- `CustodyEvent` stores ownership/provenance entries.
- `CarEvent` stores race/show/appearance entries.
- `CarMedia` stores media rows associated with a source record.
- `DarknessScore` stores computed "darkness" and candidate metrics.
- `WatchlistEntry` stores human curation and notes.
- `Source` stores source registry definitions and scrape config.
- `ScrapeLog` stores scrape run history.
- `AppSetting` stores editable admin settings.
- `VehicleModel` stores the in-scope model list (48 models). Agent only researches cars on this list.
- `ChassisSeed` stores known chassis for in-scope models — the ground truth of what exists and where it might be.
- `AgentRun` stores research agent execution records.
- `ProvenanceReport` stores structured agent output per chassis.
- `ProvenanceContact` stores actionable contact leads per chassis.
- `DealerLookup` stores logged human outreach attempts.
- `ScopeRejection` logs cars that were rejected at ingest because they are not in scope.

---

## Vehicle Scope — 48 Models

The agent only researches cars whose make/model matches this list. Tiers are display-only labels derived from `estimated_value_usd` and `units_built` — they are NOT stored as a DB field.

### Tier A — Trophy (rarest, highest value)
- Ferrari 250 GTO
- Ferrari 250 GT California Spider (LWB + SWB)
- Ferrari 166 MM Barchetta
- Alfa Romeo 33 Stradale
- Jaguar XKSS
- Ferrari 250 GT SWB Berlinetta
- McLaren F1

### Tier B — Grail
- Ferrari 288 GTO
- Ferrari F40
- Ferrari Enzo
- Ferrari F50
- Porsche 959
- Porsche Carrera GT
- Pagani Zonda C12
- Bugatti EB110 SS

### Tier C — Dark Horse (highest research priority)
- Lamborghini Miura SV ⭐ priority #1
- Lamborghini Countach LP400
- Lamborghini Miura P400 / P400 S
- Ferrari 275 GTB/4
- Ferrari 365 GTB/4 Daytona Spider
- Ferrari 250 GT Lusso
- Aston Martin DB4 GT Zagato
- Aston Martin DB4 GT
- Alfa Romeo Giulia TZ / TZ2
- Alfa Romeo GTA Stradale
- Lamborghini Diablo GT
- Mercedes-Benz 300SL Gullwing
- Porsche 356 Speedster
- Ferrari Testarossa Monospecchio (single mirror, pre-1987)
- Mercedes-Benz W100 600 Landaulet

### Tier D — Deep Cut
- Porsche 911 Carrera RS 2.7
- Lamborghini Countach LP500S
- Lamborghini Espada
- BMW M1
- Ferrari 246 Dino GT
- Ferrari 308 GTB (fiberglass)
- Ferrari 512 BB
- Ferrari 330 GTC
- Aston Martin DB5
- Aston Martin V8 Vantage
- Maserati Bora
- Maserati Merak SS
- Alfa Romeo Montreal
- Lotus Esprit S1
- Porsche 930 Turbo (first year, 1975–76)
- Mercedes-Benz W100 600 SWB
- Ferrari Testarossa (standard)

---

## Darkness Score Formula

```
base = (gap_years × 2.0) + (years_since_last_seen × 1.5) − (total_sightings × 0.5)
geo_bonus = +15 if last_known_location is SW USA (AZ, NM, NV, UT)
score = base + geo_bonus
```

Thresholds:
- ≥ 40 → candidate
- ≥ 60 → auto-trigger research agent
- ≥ 80 → urgent notification

---

## Chassis Seed — Priority Research Leads

The `chassis_seed` table is the ground truth of known chassis for in-scope models. 27 rows seeded across 5 models. CSV at `apps/api/scripts/data/chassis_seed_v1.csv`.

### 🔴 Priority #1 — Lamborghini Miura SV chassis 5010
- **Color:** Nero Cangiante (also listed as Nero)
- **Engine:** 30703
- **Production number:** 705
- **Delivery date:** 24 February 1972
- **Dealer:** Modena Car, New York City
- **lp112.com note:** "one owner last 30 years — 18,000 original miles — Monaco — car presently in Southwest USA"
- **Darkness score estimate:** 87–91 (includes SW USA geo bonus)
- **Probable show car:** 1972 Chicago Auto Show (twin to NY show car #5024)
- **DuPont Registry / Curated (Jan 2021):** Chicago show twin "last seen decades ago in Arizona"

**Important:** The NY show car is chassis **#5024** — Lemans Blue, pig-skin interior, currently owned by Temerian family, Florida. This is a confirmed separate car. Do not conflate with 5010.

### Contact Queue (in priority order)
1. **John Temerian Jr.** — Curated Miami, 1-561-801-0092. Has been searching for the Chicago show twin (#5010) since 2021. Best lead.
2. **Gary Bobileff** — Bobileff Motorcar Company, San Diego. Restored multiple US-delivery SVs. Deep community knowledge.
3. **lp112.com operator** — Listed "presently in Southwest USA." Has a direct source for this claim.
4. **Alberto Pedretti** — Modena Racing. Processed every US SV delivery. Has delivery records.
5. **Peter Kumar** — Gullwing Motor Cars, (718) 545-0500. Ferrari Daytona leads.

---

## Research Agent — Architecture

### Agent Mandate
Agent mandate comes from human designation at the model level, not self-discovery. Three entry modes:
1. **Human chassis-first** — user enters a chassis number manually to trigger research
2. **Seed knowledge** — model designated in scope → all seeded chassis are automatically watched
3. **Emergent discovery** — scraper finds a listing that matches the seed table

### Research Phases
**Phase 1 — Web sweep** (`services/phase1_sweep.py`)
- 15-domain site-restricted Google searches
- Target domains: bringatrailer.com, rmsothebys.com, goodingco.com, bonhams.com, ferrarimarket.com, lambopower.com, ferrarichat.com, lp112.com, autoclassics.com, supercars.net, classicdriver.com, pcarmarket.com, cavallino.com, concursoditaliano.com, pbconcours.org
- Each search: `site:{domain} "{chassis_number}" OR "{model}" "{color}"`

**Phase 2 — Extraction** (`services/extractor.py`)
- Claude API (claude-sonnet-4-20250514) reads sweep results
- Outputs structured custody chain JSON:
  ```json
  {
    "chassis_number": "5010",
    "custody_events": [...],
    "last_known_location": "Southwest USA",
    "last_known_owner": null,
    "confidence": "probable",
    "contacts": [...],
    "source_urls": [...]
  }
  ```

**Phase 3 — Image analysis** (`services/image_analyzer.py`) *(spec pending — not yet built)*
- **License plate reading:** Claude vision reads plate number + identifies state from plate design/format. Cross-references against auction databases, social media, forum image search, concours records. Hard rule: NO DMV lookups (DPPA protected). Value is in public-record cross-referencing only.
- **Chassis plate reading:** Reads factory data plate from firewall/door jamb photos → direct chassis number identification. Bypasses the need for plate-to-owner chain entirely.
- Findings written back as custody events with `source: image_analysis`, `confidence: probable`

### Scope Filter
Every ingest path calls `is_in_scope(make, model)` before `upsert_car()`. Rejections logged to `scope_rejections` table. File: `services/scope.py`.

### Data Quality Rule
Every data point needs: `source`, `confidence`, `discovered_at`. No orphan facts.

---

## Web Routes

### Root / Auth
- `/` → redirects to `/dashboard` — `apps/web/app/page.tsx`
- `/signin` — Google sign-in or bypass button — `apps/web/app/signin/page.tsx`
- `/api/auth/[...nextauth]` — NextAuth route — `apps/web/app/api/auth/[...nextauth]/route.ts`

### Authenticated App
All authenticated pages wrapped by `apps/web/app/(authenticated)/layout.tsx`.

- `/dashboard` — metrics + watchlist snapshot — `apps/web/app/(authenticated)/dashboard/page.tsx`
- `/cars` — registry/search UI, card + table views — `apps/web/app/(authenticated)/cars/page.tsx`
- `/watchlist` — editable watchlist — `apps/web/app/(authenticated)/watchlist/page.tsx`
- `/sources` — source/scrape status — `apps/web/app/(authenticated)/sources/page.tsx`
- `/settings` — app settings + diagnostics — `apps/web/app/(authenticated)/settings/page.tsx`
- `/request-lab` — internal debug page — `apps/web/app/(authenticated)/request-lab/page.tsx`
- `/admin/scope` — vehicle scope curation (drag/drop, tier cycling, confirm) — `apps/web/app/(authenticated)/admin/scope/page.tsx`
- `/admin/chassis-seed` — chassis seed browser and editor — `apps/web/app/(authenticated)/admin/chassis-seed/page.tsx`
- `/research` — research agent trigger + polling — `apps/web/app/(authenticated)/research/page.tsx`
- `/cars/[id]/provenance` — custody timeline + contact queue + action checklist — `apps/web/app/(authenticated)/cars/[id]/provenance/page.tsx`

### Internal Utility Route
- `/cars/export` — proxies export to backend — `apps/web/app/(authenticated)/cars/export/route.ts`

---

## `/cars` Query Params
- `q`, `query`, `candidates_only`, `make`, `model`, `drive_side`, `original_color`, `source`, `serial_number`, `build_date`, `year_from`, `year_to`, `last_seen_before`, `score_min`, `score_max`, `dark_now`, `has_images`
- `sort`: `relevance` | `darkness_score_desc` | `last_known_year_asc` | `recently_imported_desc`
- `page`, `page_size`
- `view`: `cards` | `data`

---

## API Endpoints

### Public
- `GET /healthz`
- `GET /stats`
- `GET /media/local?path=...`
- `GET|POST|PUT|PATCH|DELETE|HEAD /debug/echo`

### Admin Token Required (`x-admin-token`)
**Existing:**
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
- `POST /admin/jobs/fetch` (params: `limit`, `ignore_without_images`)
- `GET /admin/barchetta/request-diagnostics`
- `POST /admin/request-lab`

**New — Vehicle Scope:**
- `GET /admin/vehicle-models` — list all in-scope models
- `POST /admin/vehicle-models` — add model
- `PUT /admin/vehicle-models/{id}` — update (units_built, estimated_value_usd, notes)
- `DELETE /admin/vehicle-models/{id}` — remove from scope

**New — Chassis Seed:**
- `GET /admin/chassis-seed` — list seed rows (`?vehicle_model_id=X&status=active`)
- `POST /admin/chassis-seed` — add chassis
- `PUT /admin/chassis-seed/{id}` — update editable fields
- `POST /admin/chassis-seed/import` — CSV bulk import

**New — Research Agent:**
- `POST /admin/research` — trigger agent run (`chassis_number` or `car_id` required)
- `GET /admin/agent-runs` — list runs (`?chassis_seed_id=X&status=running`)
- `GET /admin/agent-runs/{id}` — get run + results

**New — Provenance:**
- `GET /cars/{id}/provenance` — full provenance report for a car
- `POST /admin/dealer-lookups` — log a human outreach attempt

---

## `/admin/chassis-seed` Page Spec

Model selector dropdown → loads chassis rows for that model.

**Stats bar:** total / dark / accounted / unresearched

**Editable fields (inline, PUT on blur):**
- `last_known_location`, `last_known_owner`, `status` (active | located | sold | destroyed), `dark_pct_est`, `notes`

**Read-only fields (from import):**
- `chassis_number`, `engine_number`, `production_number`, `color_ext`, `color_int`, `delivery_date`, `dealer`, `destination_country`, `us_spec`, `split_sump`, `ac_factory`, `seed_source`, `seed_date`, `confidence`

**Add row:** Empty row at bottom, `chassis_number` required, validates uniqueness before POST.

**CSV import:** File picker → `POST /admin/chassis-seed/import`

**Row links:**
- If `car_id` matched → `/cars/{car_id}/provenance`
- If no match → `/research?chassis={chassis_number}`

**Keyboard shortcuts:** Enter = save + next row, Escape = cancel, Cmd+N = new chassis

---

## Implementation Build Order (13 Steps)

| Step | Task | Key file(s) |
|------|------|-------------|
| 1 | DB migrations — 6 new tables + new columns | `migrations/` |
| 2 | Backend API — vehicle scope endpoints | `main.py` |
| 3 | Backend API — chassis seed endpoints | `main.py` |
| 4 | Scope filter (`is_in_scope()`) + patch `fetch_more.py` | `services/scope.py` |
| 5 | Backend API — research agent + provenance endpoints | `main.py` |
| 6 | Seed import script | `scripts/import_chassis_seed.py` |
| 7 | Research agent orchestrator | `services/research_agent.py` |
| 8 | Phase 1 sweep | `services/phase1_sweep.py` |
| 9 | Extractor (Claude API → structured JSON) | `services/extractor.py` |
| 10 | Chassis seed browser UI | `admin/chassis-seed/page.tsx` |
| 11 | /research page | `research/page.tsx` |
| 12 | Provenance page | `cars/[id]/provenance/page.tsx` |
| 13 | Dealer lookup logging | `main.py` + provenance page |

**End-to-end test case:** Chassis 5010 (Miura SV, Nero Cangiante, SW USA). Run agent → expect Southwest USA location, lp112.com as source, Temerian contact in queue.

---

## New DB Tables (to be migrated)

### `vehicle_models`
- `id`, `make`, `model`, `variant`, `body_style`
- `units_built` (int)
- `estimated_value_usd` (int) — used to derive tier display label
- `production_years` (str, e.g. "1966–1972")
- `notes`
- `is_active` (bool)
- `created_at`

### `chassis_seed`
- `id`, `vehicle_model_id` (FK)
- `chassis_number` (unique), `engine_number`, `production_number`
- `color_ext`, `color_int`
- `delivery_date`, `dealer`, `destination_country`
- `us_spec` (bool), `split_sump` (bool), `ac_factory` (bool)
- `last_known_location`, `last_known_owner`
- `status` (active | located | sold | destroyed)
- `dark_pct_est` (int 0–100)
- `notes`
- `seed_source`, `seed_date`, `confidence`
- `car_id` (FK nullable — set when matched to registry)
- `created_at`, `updated_at`

### `agent_runs`
- `id`, `car_id` (FK nullable), `chassis_seed_id` (FK nullable)
- `triggered_by` (human | auto | scraper)
- `status` (queued | running | complete | failed)
- `phases_completed` (array)
- `started_at`, `completed_at`
- `error_message`

### `provenance_reports`
- `id`, `car_id` (FK), `agent_run_id` (FK)
- `chassis_number`
- `last_known_location`, `last_known_owner`
- `confidence` (confirmed | probable | speculative)
- `custody_chain` (JSONB)
- `source_urls` (array)
- `raw_sweep_results` (JSONB)
- `created_at`

### `provenance_contacts`
- `id`, `car_id` (FK), `provenance_report_id` (FK)
- `name`, `organization`, `phone`, `email`, `url`
- `contact_type` (dealer | collector | auction | registry | forum)
- `relevance_note`
- `priority` (int)
- `created_at`

### `dealer_lookups`
- `id`, `car_id` (FK), `provenance_contact_id` (FK nullable)
- `contacted_by`, `contact_method` (phone | email | in_person)
- `contacted_at`
- `outcome` (no_answer | left_message | spoke | has_lead | dead_end)
- `notes`
- `created_at`

### `scope_rejections`
- `id`, `make`, `model`, `source_url`
- `rejected_at`
- `reason`

---

## New Columns on Existing Tables

### `cars` (add)
- `chassis_seed_id` (FK nullable) — links canonical car to seed record when matched
- `in_scope` (bool, default false) — set by scope filter at ingest

### `darkness_scores` (add)
- `geo_bonus` (int) — bonus applied (e.g. +15 for SW USA)
- `geo_region` (str) — region that triggered bonus

---

## API Response Shapes (existing — unchanged)

### `DashboardSnapshot`
`candidate_count`, `watchlist_count`, `source_count`, `dark_now_count`

### `RegistryStats`
`total_cars`, `cars_with_media`, `media_rows`, `enabled_sources`, `watchlist_count`, `dark_now_count`, `primary_candidate_count`, `secondary_candidate_count`

### `CarListItem`
`id`, `serial_number`, `make`, `model`, `variant`, `year_built`, `build_date`, `build_date_precision`, `build_date_label`, `body_style`, `drive_side`, `original_color`, `notes`, `source_count`, `darkness_score`, `last_known_year`, `gap_years`, `years_since_last_seen`, `is_currently_dark`, `qualifies_primary`, `qualifies_secondary`, `watchlist_status`, `sources: CarSourceItem[]`, `media: CarMediaItem[]`, `timeline: CarTimelineItem[]`

### `CarSourceItem`
`source_name`, `source_url`, `source_serial_number`, `scraped_at`

### `CarTimelineItem`
`kind`, `event_date`, `event_date_label`, `event_date_precision`, `event_year`, `title`, `subtitle`, `detail`, `source_reference`

### `CarMediaItem`
`media_type`, `url`, `caption`

### `WatchlistItem`
`car_id`, `serial_number`, `make`, `model`, `priority`, `status`, `score`, `interest_reason`, `agent_instructions`, `notes`, `updated_at`

### `SourceSummary`
`id`, `name`, `base_url`, `scraper_key`, `enabled`, `last_scraped_at`, `last_status`

### `SettingItem`
`key`, `value`, `description`, `updated_at`

---

## Auth and Environment Notes
- Frontend authenticated layout redirects unauthenticated users to `/signin`
- If auth bypass is enabled, the app uses a fake local admin session
- NextAuth Google allowlist lives in `apps/web/lib/auth.ts`
- Server-side web API calls use `API_BASE_URL` and `API_ADMIN_TOKEN`
- API admin protection uses `DBF_ADMIN_TOKEN`

**New env vars required:**
- `GOOGLE_SEARCH_API_KEY` — for Phase 1 sweep
- `GOOGLE_SEARCH_CX` — custom search engine ID
- `ANTHROPIC_API_KEY` — for Phase 2 extractor + Phase 3 image analysis

---

## Useful Mental Model

This is a Next.js admin UI over a FastAPI/Postgres backend for a classic car registry. The main object is a canonical `Car`, merged from one or more `CarSource` records. Provenance is stored in `custody_events`, race/show history in `car_events`, media in `car_media`, computed candidate/darkness metrics in `darkness_scores`, and human notes in `watchlist`.

The **research layer** sits on top of the registry. A `VehicleModel` scope list (48 models) defines what the agent cares about. `ChassisSeed` records represent known chassis for those models. The agent runs sweeps, extracts structured custody chains, and surfaces `ProvenanceContact` leads for human follow-up. The chassis seed browser (`/admin/chassis-seed`) is the primary day-to-day tool for managing research targets.

The **priority lead** is Lamborghini Miura SV chassis **5010** — Nero Cangiante, last known Southwest USA, darkness score ~87–91. John Temerian Jr. at Curated Miami (1-561-801-0092) has been searching for this car since 2021 and is the first call.

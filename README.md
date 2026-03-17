# DigitalBarnFinds

DigitalBarnFinds is an authenticated research platform for finding and tracking "digital barn finds": historically significant cars that disappear from public records for long stretches of time and may be worth renewed investigation.

## Architecture

- `apps/web`: Next.js admin UI with Google authentication and watchlist/search workflows.
- `apps/api`: FastAPI service for canonical car records, source ingestion, watchlist management, scoring, and admin jobs.
- `apps/worker`: Azure Function timer that triggers scheduled upsert and scoring jobs through the API.
- `infra`: Azure Bicep templates for App Services, Function App, PostgreSQL, storage, and application settings.

## Product scope in this scaffold

- Auth-required UI only
- Google OAuth admin allowlist
- Canonical car records with source-by-source provenance
- Editable watchlist
- Editable darkness scoring settings
- Seeded source registry for operational visibility
- Separate scheduled upsert/scoring worker

## Local setup

### 1. Start PostgreSQL

From the repo root:

```bash
docker compose up -d
```

This starts a local PostgreSQL 16 instance on `localhost:5432`.

### 2. Start the API

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env
alembic upgrade head
PYTHONPATH=src python -m digital_barn_finds.cli seed
PYTHONPATH=src uvicorn digital_barn_finds.main:app --reload
```

The API will be available at `http://localhost:8000`.

### 3. Start the web app

In a second terminal:

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

The web app will be available at `http://localhost:3000`.

If OAuth gets in the way during local development, set `DEV_AUTH_BYPASS=true`
in `apps/web/.env.local` to bypass sign-in temporarily.

### 4. Optional: start the worker

```bash
cd apps/worker
cp local.settings.json.example local.settings.json
func start
```

### 5. Test scrape a small batch

In the API terminal with the virtualenv active:

```bash
cd apps/api
source .venv/bin/activate
PYTHONPATH=src python -m digital_barn_finds.cli test-scrape --limit 3
```

That performs a non-persisted test scrape and prints the discovered cars.

If you want to save them locally:

```bash
PYTHONPATH=src python -m digital_barn_finds.cli test-scrape --limit 3 --commit
PYTHONPATH=src python -m digital_barn_finds.cli score
```

After that, refresh the app and you should see seeded source data plus any cars you committed.

### 6. If the live source blocks requests, use saved HTML fixtures

Save a few Barchetta detail pages into:

`apps/api/fixtures/barchetta`

You can organize them in nested folders if that is easier. The fixture importer
now scans recursively and ignores the browser-created `_files` asset folders.

Then run:

```bash
cd apps/api
source .venv/bin/activate
PYTHONPATH=src python -m digital_barn_finds.cli test-scrape --from-files --limit 3
```

To persist those local fixture parses:

```bash
PYTHONPATH=src python -m digital_barn_finds.cli test-scrape --from-files --limit 3 --commit
PYTHONPATH=src python -m digital_barn_finds.cli score
```

## Adapter runner

The adapter contract runner lives in `apps/api/tests/adapter_runner.py`.
It validates adapter conformance without the API server, database, or network
unless you opt into `--live`.

GitHub Actions runs this contract suite automatically on pushes and pull
requests that touch `apps/api`.

```bash
cd apps/api
source .venv/bin/activate
python tests/adapter_runner.py --adapter barchetta
python tests/adapter_runner.py --all --output json
```

Source fixtures live in `apps/api/fixtures/<source_key>/` and are tracked by
`_manifest.json`.

To build a new JSON fixture from saved HTML:

```bash
python tests/adapter_runner.py --build-fixture \
  --adapter barchetta \
  --html fixtures/barchetta/250\ GTO\ s_n\ 3909GT.html \
  --url http://www.barchetta.cc/english/all.ferraris/Detail/3909GT.250GTO.htm \
  --description "Ferrari 250 GTO 3909GT" \
  --output fixtures/barchetta/3909GT.json
```

## Environment variables

The key settings are documented in:

- `apps/web/.env.example`
- `apps/api/.env.example`
- `apps/worker/local.settings.json.example`

Barchetta live discovery now starts from the comma-separated
`DBF_BARCHETTA_DISCOVERY_PATHS` list in `apps/api/.env`. The scaffold seeds a
curated first-pass Ferrari list, and you can extend it with additional
model-summary pages as you confirm working paths.

## Azure deployment notes

The included Bicep and GitHub Actions workflows assume:

- one Azure resource group
- GitHub authentication to Azure via either OIDC or `AZURE_CREDENTIALS`
- separate deploys for infra, web, API, and worker

### Required GitHub secrets

- Either `AZURE_CREDENTIALS` or the OIDC trio:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_WEB_APP_NAME`
- `AZURE_API_APP_NAME`
- `AZURE_FUNCTION_APP_NAME`
- `API_ADMIN_TOKEN`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `POSTGRES_ADMIN_PASSWORD`

### Runtime shape

- `apps/web` is the authenticated admin surface.
- `apps/api` owns persistence, scoring, source visibility, and job endpoints.
- `apps/worker` triggers scheduled upsert and scoring jobs against the API.

## Notes on scraping

The scraping layer is designed for respectful crawling: truthful user agent, robots/terms checks, configurable delays, caching support, retries with backoff, and clear provenance for every ingested record. It does not attempt to disguise automation.

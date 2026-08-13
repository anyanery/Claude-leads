# Claude-leads

Lead generation utilities powered by [Apify](https://apify.com) actors.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set your Apify API token:

```
APIFY_API_TOKEN=your_apify_token_here
```

Get your token from the [Apify Console](https://console.apify.com/account/integrations). Never commit `.env` or the token itself to the repository — `.env` is already git-ignored.

## Usage

`src/apifyClient.js` exports a configured `ApifyClient` instance (from the official [`apify-client`](https://docs.apify.com/api/client/js/) package) built from `APIFY_API_TOKEN`.

Verify the connection:

```bash
npm run test:connection
```

This calls the Apify API and prints the authenticated username, confirming the token works.

### Search LinkedIn leads

Two scripts, backed by different Apify actors — pick based on budget/data needs.

#### Option A: `harvestapi/linkedin-profile-search` (full profile scrape)

Fuzzy keyword search directly against LinkedIn. Richer data (current title, company, full location, work history) but pricier (~$0.1/search page + $0.004/profile) and the free trial caps out at 10 total runs — after that HarvestAPI requires a paid plan/rental to keep running.

```bash
npm run leads:linkedin -- --query "Marketing Manager" --query "Head of Marketing" --location "Brazil" --max 20
```

Options:
- `--query` (required, repeatable) — one job title / fuzzy search text per flag; each is run as a separate search against the actor
- `--location` — repeatable, e.g. `--location "Brazil" --location "Portugal"`
- `--max` — max profiles to scrape per query (default 20)
- `--delay` — seconds to wait between queries (default 25), to avoid getting rate-limited by LinkedIn mid-batch — a batch run with no delay showed later queries silently returning 0 results (no error thrown) after the first few succeeded.

Each query gets its own raw `output/raw-<timestamp>-<query>.json`. All queries are merged into `output/leads-<timestamp>.csv`, de-duplicated by profile URL (matches recorded in `matchedQueries`).

CSV columns: `name`, `currentTitle`, `currentCompany`, `location`, `matchedQueries`, `headline`, `profileUrl`, `email`. Note LinkedIn rarely exposes email publicly, so that column is usually empty.

#### Option B: `spectre_scrape/linkedin-profile-search-scraper` (Google-search based, cheap)

Finds LinkedIn profile URLs via a Google `site:linkedin.com/in "title" "location"` search, then scrapes each profile through a residential proxy. Pay-per-event pricing (~$0.005/result, no free-run cap), and exact-phrase Google matching is much more precise than HarvestAPI's fuzzy search — but the output has fewer structured fields (no separate company/location/email columns, just a text snippet).

```bash
npm run leads:linkedin:google -- --query "Gerente Hospitalar" --query "Gestor Hospitalar" --location "Brazil" --pages 3
```

Options:
- `--query` (required, repeatable) — exact job title phrase per flag
- `--location` — repeatable; combined with OR if more than one
- `--pages` — Google result pages per query, ~10 results/page (default 3)
- `--country` — Google country code (default `BR`)
- `--delay` — seconds between queries (default 10)

Same merge/de-dupe behavior as Option A, writing `output/raw-google-<timestamp>-<query>.json` and `output/leads-google-<timestamp>.csv`.

CSV columns: `name`, `jobTitle`, `matchedQueries`, `snippet`, `profileUrl`. `jobTitle` and `snippet` come straight from Google's result text, so quality varies — cross-check against `snippet` when `jobTitle` looks off.

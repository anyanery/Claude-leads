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

Runs the [`harvestapi/linkedin-profile-search`](https://console.apify.com/actors) actor and saves results to `output/` (git-ignored — these are real people's data and must never be committed, especially in a public repo).

```bash
npm run leads:linkedin -- --query "Marketing Manager" --query "Head of Marketing" --location "Brazil" --max 20
```

Options:
- `--query` (required, repeatable) — one job title / fuzzy search text per flag; each is run as a separate search against the actor
- `--location` — repeatable, e.g. `--location "Brazil" --location "Portugal"`
- `--max` — max profiles to scrape per query (default 20)

Each query gets its own raw `output/raw-<timestamp>-<query>.json` (full actor output, useful if the CSV mapping ever needs fixing). All queries are then merged into a single `output/leads-<timestamp>.csv`, de-duplicated by LinkedIn profile URL — a person matched by two different queries appears once, with both listed in the `matchedQueries` column.

CSV columns: `name`, `currentTitle`, `currentCompany`, `location`, `matchedQueries`, `headline`, `profileUrl`, `email`. Note LinkedIn rarely exposes email publicly, so that column is usually empty.

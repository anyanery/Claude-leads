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
npm run leads:linkedin -- --query "Marketing Manager" --location "Brazil" --max 20
```

Options:
- `--query` (required) — job title / fuzzy search text
- `--location` — repeatable, e.g. `--location "Brazil" --location "Portugal"`
- `--max` — max profiles to scrape (default 20)

Each run writes a timestamped `.json` (raw actor output) and `.csv` (flattened: name, headline, location, current company, profile URL, email) into `output/`. The CSV column mapping is a best guess at the actor's field names — check the raw JSON if columns come out empty and let us know so the mapping can be fixed.

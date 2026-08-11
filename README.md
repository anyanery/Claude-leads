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

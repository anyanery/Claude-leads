import { writeFile, mkdir } from 'node:fs/promises';
import { apifyClient } from './apifyClient.js';

const ACTOR_ID = 'spectre_scrape/linkedin-profile-search-scraper';

function parseArgs(argv) {
  const args = { queries: [], locations: [], maxPages: 3, countryCode: 'BR', delaySeconds: 10 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--query' || arg === '-q') args.queries.push(argv[++i]);
    else if (arg === '--location' || arg === '-l') args.locations.push(argv[++i]);
    else if (arg === '--pages') args.maxPages = Number(argv[++i]);
    else if (arg === '--country') args.countryCode = argv[++i];
    else if (arg === '--delay') args.delaySeconds = Number(argv[++i]);
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clean(str) {
  return (str ?? '').replace(/\s+/g, ' ').trim();
}

function csvEscape(value) {
  const str = value ?? '';
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Builds a Google dork restricted to LinkedIn profile pages, e.g.
// site:linkedin.com/in "Gerente Hospitalar" ("Brazil" OR "Sao Paulo")
function buildQuery(title, locations) {
  let query = `site:linkedin.com/in "${title}"`;
  if (locations.length === 1) {
    query += ` "${locations[0]}"`;
  } else if (locations.length > 1) {
    query += ` (${locations.map((loc) => `"${loc}"`).join(' OR ')})`;
  }
  return query;
}

const { queries, locations, maxPages, countryCode, delaySeconds } = parseArgs(process.argv.slice(2));

if (queries.length === 0) {
  console.error(
    'Usage: node src/searchLinkedinLeadsGoogle.js --query "Title A" --query "Title B" --location "Brazil" [--pages 3] [--country BR] [--delay 10]'
  );
  process.exit(1);
}

const outDir = new URL('../output/', import.meta.url);
await mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

// Keyed by profile URL so the same person matched by two different
// job titles only appears once, with both titles recorded.
const seen = new Map();

for (let i = 0; i < queries.length; i++) {
  const title = queries[i];

  if (i > 0) {
    console.log(`\nWaiting ${delaySeconds}s before next search...`);
    await sleep(delaySeconds * 1000);
  }

  const searchQuery = buildQuery(title, locations);
  const input = {
    countryCode,
    maxPages,
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['GOOGLE_SERP'] },
    query: searchQuery,
  };

  console.log(`Running: ${searchQuery}`);
  const run = await apifyClient.actor(ACTOR_ID).call(input);
  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
  console.log(`  -> ${items.length} results`);
  if (items.length === 0) {
    console.warn(`  WARNING: 0 results for "${title}"`);
  }

  const safeName = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const rawPath = new URL(`raw-google-${stamp}-${safeName}.json`, outDir);
  await writeFile(rawPath, JSON.stringify(items, null, 2));

  for (const item of items) {
    const key = item.profileUrl;
    if (!key) continue;

    if (seen.has(key)) {
      const existing = seen.get(key);
      if (!existing.matchedQueries.includes(title)) existing.matchedQueries.push(title);
      continue;
    }

    seen.set(key, {
      name: clean(item.name),
      jobTitle: clean(item.jobTitle),
      snippet: clean(item.description),
      profileUrl: item.profileUrl ?? '',
      matchedQueries: [title],
    });
  }
}

const rows = [...seen.values()].map((r) => ({ ...r, matchedQueries: r.matchedQueries.join(', ') }));
const header = ['name', 'jobTitle', 'matchedQueries', 'snippet', 'profileUrl'];
const csv = [header.join(','), ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(','))].join('\n');

const csvPath = new URL(`leads-google-${stamp}.csv`, outDir);
await writeFile(csvPath, csv);

console.log(`\nRan ${queries.length} searches, ${rows.length} unique leads total.`);
console.log(`Saved combined CSV to ${csvPath.pathname}`);

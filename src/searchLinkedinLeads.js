import { writeFile, mkdir } from 'node:fs/promises';
import { apifyClient } from './apifyClient.js';

const ACTOR_ID = 'harvestapi/linkedin-profile-search';

function parseArgs(argv) {
  const args = { queries: [], locations: [], maxItems: 20 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--query' || arg === '-q') args.queries.push(argv[++i]);
    else if (arg === '--location' || arg === '-l') args.locations.push(argv[++i]);
    else if (arg === '--max') args.maxItems = Number(argv[++i]);
  }
  return args;
}

const { queries, locations, maxItems } = parseArgs(process.argv.slice(2));

if (queries.length === 0) {
  console.error(
    'Usage: node src/searchLinkedinLeads.js --query "Title A" --query "Title B" --location "Brazil" [--max 20]'
  );
  process.exit(1);
}

function clean(str) {
  return (str ?? '').replace(/\s+/g, ' ').trim();
}

function csvEscape(value) {
  const str = value ?? '';
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const outDir = new URL('../output/', import.meta.url);
await mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

// Keyed by profile URL so the same person matched by two different
// job titles only appears once, with both titles recorded.
const seen = new Map();

for (const searchQuery of queries) {
  const input = {
    searchQuery,
    locations,
    maxItems,
    profileScraperMode: 'Full',
    autoQuerySegmentation: false,
    recentlyChangedJobs: false,
    recentlyPostedOnLinkedIn: false,
  };

  console.log(`\nRunning "${searchQuery}"...`);
  const run = await apifyClient.actor(ACTOR_ID).call(input);
  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
  console.log(`  -> ${items.length} profiles`);

  const safeName = searchQuery.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const rawPath = new URL(`raw-${stamp}-${safeName}.json`, outDir);
  await writeFile(rawPath, JSON.stringify(items, null, 2));

  for (const item of items) {
    const key = item.linkedinUrl ?? item.publicIdentifier ?? item.id;
    if (!key) continue;

    if (seen.has(key)) {
      const existing = seen.get(key);
      if (!existing.matchedQueries.includes(searchQuery)) existing.matchedQueries.push(searchQuery);
      continue;
    }

    seen.set(key, {
      name: clean([item.firstName, item.lastName].filter(Boolean).join(' ')),
      currentTitle: clean(item.currentPosition?.[0]?.position),
      currentCompany: clean(item.currentPosition?.[0]?.companyName),
      location: clean(item.location?.linkedinText ?? item.location?.parsed?.text),
      headline: clean(item.headline),
      profileUrl: item.linkedinUrl ?? '',
      email: item.emails?.[0] ?? '',
      matchedQueries: [searchQuery],
    });
  }
}

const rows = [...seen.values()].map((r) => ({ ...r, matchedQueries: r.matchedQueries.join(', ') }));
const header = ['name', 'currentTitle', 'currentCompany', 'location', 'matchedQueries', 'headline', 'profileUrl', 'email'];
const csv = [header.join(','), ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(','))].join('\n');

const csvPath = new URL(`leads-${stamp}.csv`, outDir);
await writeFile(csvPath, csv);

console.log(`\nRan ${queries.length} searches, ${rows.length} unique leads total.`);
console.log(`Saved combined CSV to ${csvPath.pathname}`);

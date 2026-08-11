import { writeFile, mkdir } from 'node:fs/promises';
import { apifyClient } from './apifyClient.js';

const ACTOR_ID = 'harvestapi/linkedin-profile-search';

function parseArgs(argv) {
  const args = { locations: [], maxItems: 20 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--query' || arg === '-q') args.searchQuery = argv[++i];
    else if (arg === '--location' || arg === '-l') args.locations.push(argv[++i]);
    else if (arg === '--max') args.maxItems = Number(argv[++i]);
  }
  return args;
}

const { searchQuery, locations, maxItems } = parseArgs(process.argv.slice(2));

if (!searchQuery) {
  console.error(
    'Usage: node src/searchLinkedinLeads.js --query "Marketing Manager" --location "Brazil" [--location "Portugal"] [--max 20]'
  );
  process.exit(1);
}

const input = {
  searchQuery,
  locations,
  maxItems,
  profileScraperMode: 'Full',
  autoQuerySegmentation: false,
  recentlyChangedJobs: false,
  recentlyPostedOnLinkedIn: false,
};

console.log(`Running ${ACTOR_ID} with input:`, input);

const run = await apifyClient.actor(ACTOR_ID).call(input);
const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

console.log(`Fetched ${items.length} profiles.`);

const outDir = new URL('../output/', import.meta.url);
await mkdir(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = new URL(`linkedin-leads-${stamp}.json`, outDir);
await writeFile(jsonPath, JSON.stringify(items, null, 2));
console.log(`Saved raw results to ${jsonPath.pathname}`);

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const rows = items.map((item) => ({
  name: item.name ?? item.fullName ?? '',
  headline: item.headline ?? item.currentPosition?.title ?? '',
  location: item.location ?? item.locationName ?? '',
  currentCompany: item.currentPosition?.companyName ?? item.currentCompany ?? '',
  profileUrl: item.linkedinUrl ?? item.profileUrl ?? item.url ?? '',
  email: item.email ?? '',
}));

const header = Object.keys(rows[0] ?? { name: '', headline: '', location: '', currentCompany: '', profileUrl: '', email: '' });
const csv = [header.join(','), ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(','))].join('\n');

const csvPath = new URL(`linkedin-leads-${stamp}.csv`, outDir);
await writeFile(csvPath, csv);
console.log(`Saved CSV to ${csvPath.pathname}`);

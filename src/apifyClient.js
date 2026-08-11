import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.APIFY_API_TOKEN;

if (!token) {
  throw new Error(
    'Missing APIFY_API_TOKEN. Copy .env.example to .env and set your Apify API token.'
  );
}

export const apifyClient = new ApifyClient({ token });

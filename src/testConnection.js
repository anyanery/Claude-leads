import { apifyClient } from './apifyClient.js';

const user = await apifyClient.user().get();
console.log(`Connected to Apify as "${user.username}" (id: ${user.id}).`);

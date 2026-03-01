import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, '$1');
}

const { Client } = require('pg');
const GRAPH = 'https://graph.facebook.com/v19.0';

const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(`SELECT access_token FROM "Account" WHERE provider = 'facebook' LIMIT 1`);
await client.end();
const token = rows[0].access_token;

// IDs conocidos
const ACADEMIA_ACP_PAGE_ID = '316033991604108';
const BUSINESS_ID = '871400749920650';

console.log('=== TEST 1: Acceso directo a Academia ACP por Page ID ===');
const directRes = await fetch(`${GRAPH}/${ACADEMIA_ACP_PAGE_ID}?fields=id,name,instagram_business_account,access_token&access_token=${token}`);
const directData = await directRes.json();
console.log('Resultado:', JSON.stringify(directData, null, 2));

console.log('\n=== TEST 2: Business Manager - owned_pages ===');
const bmRes = await fetch(`${GRAPH}/${BUSINESS_ID}/owned_pages?fields=id,name,instagram_business_account,access_token&access_token=${token}`);
const bmData = await bmRes.json();
console.log('Resultado:', JSON.stringify(bmData, null, 2));

console.log('\n=== TEST 3: Business Manager - client_pages ===');
const clientRes = await fetch(`${GRAPH}/${BUSINESS_ID}/client_pages?fields=id,name,instagram_business_account&access_token=${token}`);
const clientData = await clientRes.json();
console.log('Resultado:', JSON.stringify(clientData, null, 2));

console.log('\n=== TEST 4: Acceso directo al IG ID de Servis Tecnology ===');
const igId = '17841449692142644';
const igRes = await fetch(`${GRAPH}/${igId}?fields=id,username,account_type&access_token=${token}`);
const igData = await igRes.json();
console.log('Resultado:', JSON.stringify(igData, null, 2));

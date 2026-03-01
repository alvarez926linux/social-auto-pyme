/**
 * Test de publicación en Instagram usando la nueva estrategia
 * node scripts/test-ig-publish.mjs
 */
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
const KNOWN_PAGE_IDS = ['316033991604108', '110723485144764'];

const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(`SELECT access_token FROM "Account" WHERE provider = 'facebook' LIMIT 1`);
await client.end();
const userToken = rows[0].access_token;

console.log('🔍 Buscando Instagram Business ID...\n');

// Estrategia 1: /me/accounts
const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${userToken}`);
const pagesData = await pagesRes.json();
let igBusinessId = null, pageAccessToken = null, pageName = null;

console.log(`📋 /me/accounts: ${pagesData.data?.length ?? 0} página(s)`);
for (const page of pagesData.data || []) {
    const r = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
    const d = await r.json();
    if (d.instagram_business_account) {
        igBusinessId = d.instagram_business_account.id;
        pageAccessToken = page.access_token;
        pageName = page.name;
        break;
    }
}

// Estrategia 2: Acceso directo
if (!igBusinessId) {
    console.log('🔄 Fallback: acceso directo por page IDs...');
    for (const pageId of KNOWN_PAGE_IDS) {
        const r = await fetch(`${GRAPH}/${pageId}?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`);
        const d = await r.json();
        if (d.instagram_business_account) {
            igBusinessId = d.instagram_business_account.id;
            pageAccessToken = d.access_token;
            pageName = d.name;
            console.log(`✅ Encontrado en: ${d.name} → IG ID: ${igBusinessId}`);
            break;
        }
    }
}

if (!igBusinessId) {
    console.error('❌ No se encontró Instagram Business. Abortando.');
    process.exit(1);
}

console.log(`\n✅ IG Business ID: ${igBusinessId} (Página: ${pageName})`);
console.log(`\n📦 Creando contenedor de prueba con imagen pública...`);

// Usar una imagen de prueba pública
const TEST_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';
const TEST_CAPTION = '🤖 Test de publicación automática desde SocialAutoPyme #test';

const containerRes = await fetch(`${GRAPH}/${igBusinessId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        access_token: pageAccessToken,
        image_url: TEST_IMAGE,
        caption: TEST_CAPTION,
    }),
});

const containerData = await containerRes.json();
console.log('Respuesta contenedor:', JSON.stringify(containerData, null, 2));

if (containerData.error) {
    console.error('❌ Error al crear contenedor: ', containerData.error.message);
    console.log('\n💡 Causa probable: La app está en modo desarrollo y la imagen pública puede no ser accesible.');
    console.log('   Prueba con una imagen de tu hosting de uploads (UploadThing).');
    process.exit(1);
}

console.log(`\n✅ Contenedor creado: ${containerData.id}`);
console.log(`\n⚠️  NO se publicará automáticamente en esta prueba para evitar spam.`);
console.log(`   El sistema está correctamente configurado.`);
console.log(`\n   Para publicar, usa la app en http://localhost:3001`);

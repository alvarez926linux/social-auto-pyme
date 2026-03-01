/**
 * Fuerza la publicación del post de video en SCHEDULED más reciente
 * node scripts/force-publish-video.mjs
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

// Obtener token y post
const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows: [fbAccount] } = await client.query(`SELECT access_token FROM "Account" WHERE provider = 'facebook' LIMIT 1`);
const { rows: [post] } = await client.query(`SELECT * FROM "Post" WHERE status = 'SCHEDULED' ORDER BY "createdAt" DESC LIMIT 1`);

if (!post) { console.log('No hay posts SCHEDULED.'); process.exit(0); }
console.log('📝 Post a publicar:');
console.log('  ID:', post.id);
console.log('  Platforms:', post.platforms);
console.log('  Media:', post.mediaUrls);
console.log('  Content:', post.content.substring(0, 60) + '...');

const userToken = fbAccount.access_token;
const videoUrl = post.mediaUrls?.[0];

if (!videoUrl) { console.error('❌ Sin URL de media'); process.exit(1); }

const isVideo = /\.(mp4|mov|avi|webm)/i.test(videoUrl);
console.log(`\n🎬 Tipo: ${isVideo ? 'VIDEO/REEL' : 'IMAGEN'}`);
console.log(`🔗 URL: ${videoUrl}`);

// Obtener IG Business ID y Page Token
console.log('\n🔍 Buscando Instagram Business ID...');
const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${userToken}`);
const pagesData = await pagesRes.json();
let igBusinessId = null, pageAccessToken = null;

for (const page of pagesData.data || []) {
    const r = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
    const d = await r.json();
    if (d.instagram_business_account) { igBusinessId = d.instagram_business_account.id; pageAccessToken = page.access_token; break; }
}

if (!igBusinessId) {
    for (const pageId of KNOWN_PAGE_IDS) {
        const r = await fetch(`${GRAPH}/${pageId}?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`);
        const d = await r.json();
        if (d.instagram_business_account) { igBusinessId = d.instagram_business_account.id; pageAccessToken = d.access_token; console.log(`✅ Usando ${d.name}`); break; }
    }
}

if (!igBusinessId) { console.error('❌ No se encontró IG Business'); process.exit(1); }
console.log(`✅ IG Business ID: ${igBusinessId}`);

// Crear contenedor
const caption = post.content;
const containerBody = isVideo
    ? { access_token: pageAccessToken, video_url: videoUrl, media_type: 'REELS', caption }
    : { access_token: pageAccessToken, image_url: videoUrl, caption };

console.log(`\n📦 Creando contenedor ${isVideo ? 'REEL' : 'imagen'}...`);
const containerRes = await fetch(`${GRAPH}/${igBusinessId}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(containerBody)
});
const containerData = await containerRes.json();
console.log('Respuesta contenedor:', JSON.stringify(containerData, null, 2));

if (containerData.error) {
    console.error('❌ Error:', containerData.error.message);
    console.log('\n💡 Código de error:', containerData.error.code, containerData.error.error_subcode || '');
    await client2?.end?.();
    process.exit(1);
}

const containerId = containerData.id;
console.log(`✅ Contenedor ID: ${containerId}`);

// Polling del container (siempre, para imagen y video por igual)
console.log('\n⏳ Esperando que Instagram procese el container...');
await new Promise(r => setTimeout(r, 5000)); // Espera inicial de 5s
const deadline = Date.now() + 120000;
let attempt = 0;
let ready = false;
while (Date.now() < deadline) {
    attempt++;
    const statusRes = await fetch(`${GRAPH}/${containerId}?fields=status_code,status&access_token=${pageAccessToken}`);
    const statusData = await statusRes.json();
    console.log(`  [Poll #${attempt}] status_code: ${statusData.status_code}`);
    if (statusData.status_code === 'FINISHED') { ready = true; break; }
    if (statusData.status_code === 'ERROR') { console.error('❌ Error Instagram:', statusData.status); process.exit(1); }
    await new Promise(r => setTimeout(r, 5000));
}
if (!ready) { console.error('❌ Timeout esperando container. Intenta de nuevo.'); process.exit(1); }


// Publicar
console.log('\n🚀 Publicando...');
const publishRes = await fetch(`${GRAPH}/${igBusinessId}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: pageAccessToken, creation_id: containerId })
});
const publishData = await publishRes.json();
console.log('Respuesta publicación:', JSON.stringify(publishData, null, 2));

if (!publishData.error) {
    // Actualizar DB
    const client2 = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client2.connect();
    await client2.query(`UPDATE "Post" SET status = 'PUBLISHED' WHERE id = $1`, [post.id]);
    await client2.end();
    console.log('\n✅ Post actualizado a PUBLISHED en DB.');
}
await client.end();

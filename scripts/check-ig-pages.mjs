/**
 * Verificación de páginas y cuentas de Instagram Business
 * node scripts/check-ig-pages.mjs
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

const client = new Client({ connectionString: env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(`SELECT access_token FROM "Account" WHERE provider = 'facebook' LIMIT 1`);
await client.end();

if (!rows.length) { console.error('❌ No hay token de Facebook en DB'); process.exit(1); }

const token = rows[0].access_token;

console.log('📄 Obteniendo páginas con sus tokens...\n');
const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`);
const pagesData = await pagesRes.json();

if (pagesData.error) {
    console.error('❌ Error:', pagesData.error.message);
    process.exit(1);
}

const pages = pagesData.data || [];
console.log(`Páginas encontradas: ${pages.length}\n`);

for (const page of pages) {
    console.log(`━━━ Página: "${page.name}" (ID: ${page.id}) ━━━`);
    const pageToken = page.access_token;

    // Verificar Instagram con Page Token
    const igRes = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account,connected_instagram_account,name&access_token=${pageToken}`);
    const igData = await igRes.json();

    if (igData.instagram_business_account) {
        const igId = igData.instagram_business_account.id;
        console.log(`  ✅ Instagram Business ID: ${igId}`);

        // Obtener detalles
        const detRes = await fetch(`${GRAPH}/${igId}?fields=id,username,name,account_type,followers_count&access_token=${pageToken}`);
        const det = await detRes.json();
        console.log(`  📱 Usuario: @${det.username || 'N/A'} | Tipo: ${det.account_type || 'N/A'} | Seguidores: ${det.followers_count || 'N/A'}`);

        // Verificar permisos de publicación
        console.log(`\n  🧪 Probando capacidad de publicación...`);
        const testRes = await fetch(`${GRAPH}/${igId}/content_publishing_limit?fields=config,quota_usage&access_token=${pageToken}`);
        const testData = await testRes.json();
        if (testData.error) {
            console.log(`  ❌ Error de permisos: ${testData.error.message} (código: ${testData.error.code})`);
        } else {
            const limit = testData.data?.[0];
            console.log(`  ✅ Publicación habilitada | Quota usada: ${limit?.quota_usage ?? 'N/A'} | Límite: ${limit?.config?.quota_total ?? 'N/A'}`);
        }
    } else if (igData.connected_instagram_account) {
        console.log(`  ⚠️  Tiene Instagram PERSONAL (no Business): ${igData.connected_instagram_account.id}`);
        console.log(`  → Debes convertirla a cuenta de Empresa/Creador en Instagram`);
    } else {
        console.log(`  ❌ Sin Instagram vinculado`);
        if (igData.error) console.log(`     Error: ${igData.error.message}`);
    }
    console.log('');
}

// Verificar Business Account específica del URL del usuario
const BUSINESS_PAGE_ID = '101392878284403';
console.log(`━━━ Verificando página específica: ${BUSINESS_PAGE_ID} ━━━`);
const specificRes = await fetch(`${GRAPH}/${BUSINESS_PAGE_ID}?fields=id,name,instagram_business_account,connected_instagram_account&access_token=${token}`);
const specificData = await specificRes.json();
if (specificData.error) {
    console.log(`  ❌ Error (posiblemente no tienes acceso con este token): ${specificData.error.message}`);
} else {
    console.log(`  Nombre: ${specificData.name || 'N/A'}`);
    console.log(`  Instagram Business: ${specificData.instagram_business_account?.id || '❌ No vinculado'}`);
    console.log(`  Instagram Conectado: ${specificData.connected_instagram_account?.id || 'Ninguno'}`);
}

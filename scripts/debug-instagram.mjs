/**
 * Script de diagnóstico para Instagram
 * Ejecutar: node scripts/debug-instagram.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Leer .env manualmente
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');

// Parsear .env
const env = {};
for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1');
    }
}

const DB_URL = env.DATABASE_URL;
const GRAPH_URL = 'https://graph.facebook.com/v19.0';

// Importar pg
let pg;
try {
    pg = require('pg');
} catch (e) {
    console.error('❌ Necesitas instalar pg: npm install pg');
    process.exit(1);
}

const { Client } = pg;

async function main() {
    console.log('🔍 === DIAGNÓSTICO DE INSTAGRAM ===\n');

    // 1. Conectar a DB y obtener el token de Facebook
    const client = new Client({ connectionString: DB_URL });
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Mostrar todas las cuentas
    const accountsResult = await client.query(
        'SELECT id, "userId", provider, "providerAccountId", LEFT(access_token, 40) as token_preview, expires_at, scope FROM "Account" ORDER BY provider'
    );

    console.log(`📋 Cuentas encontradas (${accountsResult.rows.length}):`);
    for (const acc of accountsResult.rows) {
        const expiresDate = acc.expires_at ? new Date(acc.expires_at * 1000).toISOString() : 'N/A';
        const isExpired = acc.expires_at ? (acc.expires_at * 1000 < Date.now()) : false;
        console.log(`  - Provider: ${acc.provider}`);
        console.log(`    Token (primeros 40 chars): ${acc.token_preview}...`);
        console.log(`    Expira: ${expiresDate} ${isExpired ? '⚠️ EXPIRADO' : '✅ Vigente'}`);
        console.log(`    Scopes: ${acc.scope}`);
        console.log('');
    }

    // 2. Buscar cuenta de Facebook
    const fbResult = await client.query(
        'SELECT access_token, expires_at, scope FROM "Account" WHERE provider = \'facebook\' LIMIT 1'
    );

    if (fbResult.rows.length === 0) {
        console.error('❌ No hay cuenta de Facebook en la base de datos.');
        console.log('   → El usuario necesita hacer login con Facebook/Instagram primero.');
        await client.end();
        return;
    }

    const fbAccount = fbResult.rows[0];
    const fbToken = fbAccount.access_token;

    console.log('🔑 Token de Facebook encontrado. Verificando con Graph API...\n');

    // 3. Verificar token con /me
    try {
        const meRes = await fetch(`${GRAPH_URL}/me?access_token=${fbToken}&fields=id,name`);
        const meData = await meRes.json();

        if (meData.error) {
            console.error('❌ Token INVÁLIDO:', meData.error.message);
            console.log('   Código de error:', meData.error.code);
            console.log('   → El usuario necesita reconectar su cuenta de Facebook.\n');
        } else {
            console.log(`✅ Token VÁLIDO para usuario: ${meData.name} (ID: ${meData.id})\n`);
        }
    } catch (e) {
        console.error('❌ Error al verificar token:', e.message);
    }

    // 4. Obtener páginas de Facebook
    console.log('📄 Buscando páginas de Facebook vinculadas...');
    try {
        const pagesRes = await fetch(`${GRAPH_URL}/me/accounts?access_token=${fbToken}&fields=id,name,instagram_business_account,access_token`);
        const pagesData = await pagesRes.json();

        if (pagesData.error) {
            console.error('❌ Error al obtener páginas:', pagesData.error.message);
            await client.end();
            return;
        }

        if (!pagesData.data || pagesData.data.length === 0) {
            console.log('⚠️ No se encontraron páginas de Facebook.');
            console.log('   → Asegúrate de tener al menos una página de Facebook.');
            await client.end();
            return;
        }

        console.log(`✅ ${pagesData.data.length} página(s) encontrada(s):\n`);

        for (const page of pagesData.data) {
            console.log(`  📄 Página: "${page.name}" (ID: ${page.id})`);
            console.log(`     Page Access Token: ${page.access_token ? page.access_token.substring(0, 30) + '...' : 'NO DISPONIBLE'}`);

            // Verificar Instagram vinculado
            const igRes = await fetch(`${GRAPH_URL}/${page.id}?fields=instagram_business_account,name&access_token=${page.access_token || fbToken}`);
            const igData = await igRes.json();

            if (igData.instagram_business_account) {
                const igId = igData.instagram_business_account.id;
                console.log(`     ✅ Instagram Business ID: ${igId}`);

                // Verificar detalles del IG Account
                const igDetailsRes = await fetch(`${GRAPH_URL}/${igId}?fields=id,username,account_type&access_token=${page.access_token || fbToken}`);
                const igDetails = await igDetailsRes.json();
                console.log(`     📱 Instagram Username: @${igDetails.username || 'N/A'}`);
                console.log(`     📊 Account Type: ${igDetails.account_type || 'N/A'}`);
                console.log('');

                // 5. Intentar crear un contenedor de prueba con una imagen de test
                console.log('🧪 Intentando crear contenedor de media de prueba...');
                const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';

                const containerRes = await fetch(`${GRAPH_URL}/${igId}/media`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: page.access_token || fbToken,
                        image_url: testImageUrl,
                        caption: 'Test de diagnóstico - puedes ignorar esto',
                    }),
                });
                const containerData = await containerRes.json();

                if (containerData.error) {
                    console.error('❌ Error al crear contenedor:', containerData.error.message);
                    console.log('   Código:', containerData.error.code);
                    console.log('   Tipo:', containerData.error.type);

                    // Diagnóstico del error
                    if (containerData.error.code === 10) {
                        console.log('\n   🔍 DIAGNÓSTICO: La app NO TIENE PERMISOS suficientes.');
                        console.log('   → Verifica en Meta Business Suite que la app tiene:');
                        console.log('     - instagram_content_publish');
                        console.log('     - pages_read_engagement');
                    } else if (containerData.error.code === 190) {
                        console.log('\n   🔍 DIAGNÓSTICO: Token de acceso INVÁLIDO o EXPIRADO.');
                        console.log('   → El usuario necesita desconectar y reconectar Instagram.');
                    } else if (containerData.error.code === 100) {
                        console.log('\n   🔍 DIAGNÓSTICO: La URL de la imagen no es accesible por Instagram.');
                        console.log('   → Instagram necesita URLs públicas y accesibles.');
                    }
                } else {
                    console.log(`✅ Contenedor creado exitosamente! ID: ${containerData.id}`);
                    console.log('   → El flujo de publicación de Instagram FUNCIONA.');
                    console.log('   → El problema puede estar en la selección de plataformas al crear el post.\n');

                    // Limpiar: no publicar el contenedor de prueba
                    console.log('   (Contenedor de prueba creado pero NO publicado)');
                }
            } else {
                console.log('     ⚠️ No tiene Instagram Business vinculado');
                if (igData.error) {
                    console.log('     Error:', igData.error.message);
                }
                console.log('');
            }
        }
    } catch (e) {
        console.error('❌ Error inesperado:', e.message);
    }

    // 6. Verificar posts pendientes/fallidos en DB
    console.log('\n📊 Posts recientes en la base de datos:');
    const postsResult = await client.query(
        'SELECT id, status, platforms, LEFT(content, 50) as preview, "createdAt" FROM "Post" ORDER BY "createdAt" DESC LIMIT 5'
    );

    for (const post of postsResult.rows) {
        console.log(`  - ID: ${post.id}`);
        console.log(`    Status: ${post.status}`);
        console.log(`    Platforms: ${JSON.stringify(post.platforms)}`);
        console.log(`    Contenido: "${post.preview}..."`);
        console.log(`    Creado: ${post.createdAt}`);
        console.log('');
    }

    await client.end();
    console.log('✅ Diagnóstico completado.');
}

main().catch(console.error);

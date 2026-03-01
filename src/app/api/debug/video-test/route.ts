import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/debug/video-test?platform=linkedin|instagram&videoUrl=...
 *
 * Endpoint de diagnóstico para probar el flujo completo de video upload
 * sin necesitar pasar por la UI ni por Inngest.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") || "linkedin";
    const videoUrl = searchParams.get("videoUrl");
    const userId = searchParams.get("userId"); // ID del usuario en la DB

    const log: string[] = [];
    const addLog = (msg: string) => {
        console.log(msg);
        log.push(msg);
    };

    addLog(`\n====== DIAGNÓSTICO VIDEO TEST ======`);
    addLog(`📅 Fecha: ${new Date().toISOString()}`);
    addLog(`🎯 Plataforma: ${platform}`);
    addLog(`🔗 Video URL: ${videoUrl || "(no proporcionada)"}`);

    if (!videoUrl) {
        return NextResponse.json({
            error: "Falta el parámetro videoUrl",
            usage: "/api/debug/video-test?platform=linkedin&videoUrl=URL_DEL_VIDEO&userId=ID_USUARIO"
        }, { status: 400 });
    }

    // ─── PASO 1: Verificar que la URL es accesible y detectar tipo de contenido ───
    addLog(`\n[PASO 1] Verificando accesibilidad y Content-Type de la URL...`);
    let contentType = "";
    let isVideo = false;

    try {
        const headRes = await fetch(videoUrl, { method: "HEAD" });
        contentType = headRes.headers.get("content-type") || "";
        addLog(`  ✅ HEAD request OK (${headRes.status})`);
        addLog(`  📋 Content-Type: "${contentType}"`);
        addLog(`  📋 Content-Length: "${headRes.headers.get("content-length") || "desconocido"}"`);
        isVideo = contentType.startsWith("video/");
        addLog(`  → Detectado como: ${isVideo ? "🎬 VIDEO" : "🖼️ IMAGEN"}`);
    } catch (e: any) {
        addLog(`  ❌ HEAD request FALLÓ: ${e.message}`);
        addLog(`  🔄 Intentando detección por extensión...`);
        const ext = videoUrl.split(".").pop()?.toLowerCase();
        isVideo = ["mp4", "mov", "avi", "webm", "mkv"].includes(ext || "");
        contentType = isVideo ? "video/mp4" : "image/jpeg";
        addLog(`  → Extensión "${ext}" → ${isVideo ? "VIDEO" : "IMAGEN"}`);
    }

    // ─── PASO 2: Verificar que el archivo se puede descargar ───
    addLog(`\n[PASO 2] Verificando que el archivo se puede descargar (GET)...`);
    let fileSize = 0;
    try {
        const getRes = await fetch(videoUrl);
        addLog(`  ✅ GET request OK (${getRes.status})`);
        const buffer = await getRes.arrayBuffer();
        fileSize = buffer.byteLength;
        addLog(`  📦 Tamaño del archivo: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
        if (fileSize === 0) {
            addLog(`  ⚠️ ADVERTENCIA: El archivo tiene tamaño 0. URL inválida o archivo vacío.`);
        }
    } catch (e: any) {
        addLog(`  ❌ GET request FALLÓ: ${e.message}`);
        return NextResponse.json({ log }, { status: 500 });
    }

    // ─── PASO 3: Verificar credenciales de la plataforma ───
    addLog(`\n[PASO 3] Verificando credenciales en la DB...`);

    if (!userId) {
        // Obtener el primer usuario disponible
        const firstUser = await prisma.user.findFirst({ include: { accounts: true } });
        if (firstUser) {
            addLog(`  ℹ️ No se proporcionó userId. Usando primer usuario: ${firstUser.id} (${firstUser.email})`);
            addLog(`  ℹ️ Plataformas vinculadas: ${firstUser.accounts.map(a => a.provider).join(", ")}`);
        }
    }

    const providerName = (platform === "instagram" || platform === "facebook") ? "facebook" : "linkedin";
    const account = await prisma.account.findFirst({
        where: { provider: providerName, ...(userId ? { userId } : {}) },
    });

    if (!account) {
        addLog(`  ❌ No se encontró cuenta de "${providerName}" en la DB`);
        return NextResponse.json({ log }, { status: 500 });
    }

    addLog(`  ✅ Cuenta encontrada. Provider: ${account.provider}, UserId: ${account.userId}`);
    addLog(`  🔑 Token presente: ${!!account.access_token}`);
    if (account.expires_at) {
        const expiresAt = new Date(account.expires_at * 1000);
        const isExpired = expiresAt < new Date();
        addLog(`  ⏰ Token expira: ${expiresAt.toISOString()} → ${isExpired ? "❌ EXPIRADO" : "✅ Válido"}`);
    }

    // ─── PASO 4: Prueba de plataforma específica ───
    addLog(`\n[PASO 4] Iniciando prueba de ${platform.toUpperCase()}...`);

    try {
        if (platform === "linkedin") {
            await testLinkedIn(account.access_token!, videoUrl, isVideo, contentType, addLog);
        } else if (platform === "instagram") {
            await testInstagram(account.access_token!, videoUrl, isVideo, account.userId, addLog);
        } else if (platform === "facebook") {
            await testFacebook(account.access_token!, videoUrl, isVideo, addLog);
        }
        addLog(`\n🎉 DIAGNÓSTICO COMPLETADO CON ÉXITO`);
    } catch (e: any) {
        addLog(`\n❌ ERROR EN PRUEBA: ${e.message}`);
        if (e.stack) addLog(`Stack: ${e.stack.split("\n").slice(0, 5).join("\n")}`);
    }

    return NextResponse.json({ log, isVideo, contentType, fileSize }, { status: 200 });
}

async function testLinkedIn(
    accessToken: string,
    mediaUrl: string,
    isVideo: boolean,
    contentType: string,
    addLog: (msg: string) => void
) {
    const API_URL = "https://api.linkedin.com/v2";

    // Obtener userUrn
    addLog(`  🔍 Obteniendo LinkedIn URN del usuario...`);
    const profileRes = await fetch(`${API_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
        const err = await profileRes.text();
        throw new Error(`No se pudo obtener perfil de LinkedIn: ${profileRes.status} - ${err}`);
    }
    const profile = await profileRes.json();
    const userUrn = `urn:li:person:${profile.sub}`;
    addLog(`  ✅ LinkedIn URN: ${userUrn}`);

    // Register Upload
    addLog(`  📋 Registrando subida (registerUpload)...`);
    const recipe = isVideo
        ? "urn:li:digitalmediaRecipe:feedshare-video"
        : "urn:li:digitalmediaRecipe:feedshare-image";

    const registerRes = await fetch(`${API_URL}/assets?action=registerUpload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            registerUploadRequest: {
                recipes: [recipe],
                owner: userUrn,
                serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
            },
        }),
    });

    if (!registerRes.ok) {
        const err = await registerRes.json();
        throw new Error(`registerUpload falló (${registerRes.status}): ${JSON.stringify(err)}`);
    }

    const registerData = await registerRes.json();
    const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const assetUrn = registerData.value?.asset;

    addLog(`  ✅ Upload registrado. Asset URN: ${assetUrn}`);
    addLog(`  🔗 Upload URL: ${uploadUrl?.substring(0, 80)}...`);

    if (!uploadUrl) {
        throw new Error("No se obtuvo uploadUrl en la respuesta de registerUpload");
    }

    // Upload binario
    addLog(`  ⬆️ Descargando archivo y subiendo a LinkedIn...`);
    const fileRes = await fetch(mediaUrl);
    const fileBuffer = await fileRes.arrayBuffer();
    addLog(`  📦 Archivo descargado: ${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": contentType || (isVideo ? "video/mp4" : "image/jpeg"),
        },
        body: Buffer.from(fileBuffer),
    });

    addLog(`  📤 Respuesta de subida binaria: ${uploadRes.status} ${uploadRes.statusText}`);
    if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Subida binaria falló (${uploadRes.status}): ${errText.substring(0, 300)}`);
    }

    addLog(`  ✅ Archivo subido exitosamente a LinkedIn!`);

    if (isVideo) {
        addLog(`  ⏳ Verificando estado del asset (poll x1 para diagnóstico)...`);
        const encodedUrn = encodeURIComponent(assetUrn);
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await fetch(`${API_URL}/assets?ids=${encodedUrn}`, {
            headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0" },
        });
        const pollData = await pollRes.json();
        addLog(`  📊 Estado del asset después de 5s: ${JSON.stringify(pollData).substring(0, 400)}`);
    }
}

async function testInstagram(
    userAccessToken: string,
    mediaUrl: string,
    isVideo: boolean,
    userId: string,
    addLog: (msg: string) => void
) {
    const GRAPH_URL = "https://graph.facebook.com/v19.0";

    // Obtener páginas
    addLog(`  🔍 Obteniendo páginas de Facebook (/me/accounts)...`);
    const pagesRes = await fetch(`${GRAPH_URL}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`);
    const pagesData = await pagesRes.json();
    addLog(`  📋 Respuesta: ${JSON.stringify(pagesData).substring(0, 500)}`);

    const pages = pagesData.data || [];
    addLog(`  📋 Páginas encontradas: ${pages.length}`);

    let igBusinessId = "";
    let pageAccessToken = userAccessToken;

    for (const page of pages) {
        if (page.instagram_business_account) {
            igBusinessId = page.instagram_business_account.id;
            pageAccessToken = page.access_token || userAccessToken;
            addLog(`  ✅ IG Business ID encontrado: ${igBusinessId} (Página: ${page.name})`);
            break;
        }
    }

    if (!igBusinessId) {
        // Intentar con IDs conocidos
        const KNOWN_PAGE_IDS = ["316033991604108", "110723485144764"];
        addLog(`  🔄 Intentando con page IDs conocidos...`);
        for (const pageId of KNOWN_PAGE_IDS) {
            const r = await fetch(`${GRAPH_URL}/${pageId}?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`);
            const d = await r.json();
            addLog(`  📋 Page ${pageId}: ${JSON.stringify(d).substring(0, 300)}`);
            if (d.instagram_business_account) {
                igBusinessId = d.instagram_business_account.id;
                pageAccessToken = d.access_token || userAccessToken;
                addLog(`  ✅ IG Business ID: ${igBusinessId}`);
                break;
            }
        }
    }

    if (!igBusinessId) {
        throw new Error("No se encontró IG Business ID en ninguna estrategia");
    }

    // Crear contenedor
    addLog(`  📦 Creando contenedor de media en Instagram...`);
    const params: any = { access_token: pageAccessToken, caption: "[TEST DIAGNÓSTICO]" };
    if (isVideo) {
        params.video_url = mediaUrl;
        params.media_type = "REELS";
    } else {
        params.image_url = mediaUrl;
    }

    const containerRes = await fetch(`${GRAPH_URL}/${igBusinessId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });

    const containerData = await containerRes.json();
    addLog(`  📋 Respuesta contenedor: ${JSON.stringify(containerData).substring(0, 500)}`);

    if (!containerRes.ok || containerData.error) {
        throw new Error(`Error creando contenedor (${containerRes.status}): ${containerData.error?.message || containerRes.statusText}`);
    }

    const containerId = containerData.id;
    addLog(`  ✅ Contenedor creado: ${containerId}`);

    if (isVideo) {
        addLog(`  ⏳ Esperando 10s y verificando estado del contenedor...`);
        await new Promise(r => setTimeout(r, 10000));
        const statusRes = await fetch(`${GRAPH_URL}/${containerId}?fields=status_code,status&access_token=${pageAccessToken}`);
        const statusData = await statusRes.json();
        addLog(`  📊 Estado del contenedor: ${JSON.stringify(statusData)}`);
    }

    addLog(`  ✅ Diagnóstico de Instagram completado!`);
}
async function testFacebook(
    userAccessToken: string,
    mediaUrl: string,
    isVideo: boolean,
    addLog: (msg: string) => void
) {
    const GRAPH_URL = "https://graph.facebook.com/v19.0";
    const KNOWN_PAGE_IDS = ["316033991604108", "110723485144764"];

    // Obtener páginas
    addLog(`  🔍 Obteniendo páginas de Facebook (/me/accounts)...`);
    const pagesRes = await fetch(`${GRAPH_URL}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`);
    const pagesData = await pagesRes.json();
    addLog(`  📋 /me/accounts respuesta: ${JSON.stringify(pagesData).substring(0, 600)}`);

    const pages = pagesData.data || [];
    let pageId = "";
    let pageAccessToken = userAccessToken;
    let pageName = "";

    if (pages.length > 0) {
        pageId = pages[0].id;
        pageAccessToken = pages[0].access_token || userAccessToken;
        pageName = pages[0].name;
        addLog(`  ✅ Página encontrada: "${pageName}" (ID: ${pageId})`);
    } else {
        addLog(`  🔄 /me/accounts vacío. Intentando con page IDs conocidos...`);
        for (const pid of KNOWN_PAGE_IDS) {
            const r = await fetch(`${GRAPH_URL}/${pid}?fields=id,name,access_token&access_token=${userAccessToken}`);
            const d = await r.json();
            addLog(`  📋 Page ${pid}: ${JSON.stringify(d).substring(0, 400)}`);
            if (d.id && !d.error) {
                pageId = d.id;
                pageAccessToken = d.access_token || userAccessToken;
                pageName = d.name || pid;
                addLog(`  ✅ Página encontrada por ID directo: "${pageName}"`);
                break;
            }
        }
    }

    if (!pageId) {
        throw new Error("No se encontró ninguna Página de Facebook administrada");
    }

    // Intentar publicar un post de texto simple primero
    addLog(`  📝 Intentando publicar post de TEXTO en la página "${pageName}"...`);
    const feedRes = await fetch(`${GRAPH_URL}/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: "[TEST DIAGNÓSTICO - SocialAutoPyme] Este es un post de prueba automático.",
            access_token: pageAccessToken,
        }),
    });
    const feedData = await feedRes.json();
    addLog(`  📋 Respuesta /feed: ${JSON.stringify(feedData)}`);

    if (feedData.error) {
        addLog(`  ❌ Error en /feed: ${feedData.error.message} (código: ${feedData.error.code}, subcode: ${feedData.error.error_subcode})`);
        addLog(`  💡 Tipo de error: ${feedData.error.type}`);
        throw new Error(`Error publicando en Facebook Page: ${feedData.error.message}`);
    }

    addLog(`  ✅ Post de texto publicado exitosamente: ${JSON.stringify(feedData)}`);
    addLog(`  ✅ Diagnóstico de Facebook completado!`);
}

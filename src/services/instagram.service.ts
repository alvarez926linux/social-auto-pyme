import { prisma } from "@/lib/prisma";

export class InstagramService {
    private static GRAPH_URL = "https://graph.facebook.com/v19.0";

    // IDs de páginas conocidas del usuario (fallback cuando /me/accounts está vacío)
    private static KNOWN_PAGE_IDS = [
        "316033991604108", // Academia ACP
        "110723485144764", // AlvarezF1Team
    ];

    /**
     * Publica un post en Instagram (Imagen o Reel/Video)
     */
    static async publishPost(userId: string, content: string, mediaUrls?: string[]): Promise<any> {
        console.log(`🎬 InstagramService: Iniciando publicación para el usuario ${userId}`);

        if (!mediaUrls || mediaUrls.length === 0) {
            throw new Error("Instagram requiere al menos una imagen o video.");
        }

        // 1. Obtener el token de acceso de Facebook/Instagram desde la DB
        const account = await prisma.account.findFirst({
            where: { userId, provider: "facebook" },
        });

        if (!account?.access_token) {
            throw new Error("No se encontró cuenta de Facebook/Instagram vinculada.");
        }

        const userAccessToken = account.access_token;
        console.log(`🔑 Token encontrado. Buscando Instagram Business ID...`);

        // 2. Obtener el IG Business ID y el Page Access Token
        const { igBusinessId, pageAccessToken, pageName } = await this.getInstagramBusinessIdAndPageToken(userAccessToken);
        console.log(`✅ Instagram Business ID: ${igBusinessId} (Página: ${pageName})`);

        // 3. Detectar tipo de media (HEAD request para URLs de UploadThing sin extensión)
        const mediaUrl = mediaUrls[0];
        const isVideo = await this.isVideoUrl(mediaUrl);

        console.log(`📦 Creando contenedor para ${isVideo ? "VIDEO/REEL" : "IMAGEN"}...`);
        const containerId = await this.createMediaContainer(igBusinessId, pageAccessToken, mediaUrl, content, isVideo);
        console.log(`📦 Contenedor creado: ${containerId}`);

        // 4. Esperar a que el contenedor esté listo (necesario para videos)
        await this.waitForContainerReady(igBusinessId, pageAccessToken, containerId);

        // 5. Publicar
        console.log(`🚀 Publicando contenedor ${containerId}...`);
        const result = await this.publishMediaContainer(igBusinessId, pageAccessToken, containerId);
        console.log("✅ Publicado en Instagram:", result);
        return result;
    }

    /**
     * Detecta si una URL apunta a un video via Content-Type.
     * Necesario porque UploadThing genera URLs sin extensión de archivo.
     */
    private static async isVideoUrl(url: string): Promise<boolean> {
        // Primero intentar por extensión (más rápido)
        if (/\.(mp4|mov|avi|webm|mkv)/i.test(url)) return true;
        if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) return false;

        // Fallback: HEAD request para leer el Content-Type real
        try {
            const res = await fetch(url, { method: "HEAD" });
            const contentType = res.headers.get("content-type") || "";
            const isVideo = contentType.startsWith("video/");
            console.log(`  🔍 Content-Type de ${url.slice(-30)}: ${contentType} → ${isVideo ? "VIDEO" : "IMAGEN"}`);
            return isVideo;
        } catch {
            console.warn(`  ⚠️ No se pudo detectar tipo de media, asumiendo IMAGEN.`);
            return false;
        }
    }

    /**
     * Obtiene el IG Business ID y el Page Access Token.
     *
     * Estrategia doble:
     * 1. /me/accounts (páginas personales)
     * 2. Acceso directo por page ID (páginas de Business Manager)
     */
    private static async getInstagramBusinessIdAndPageToken(
        userAccessToken: string
    ): Promise<{ igBusinessId: string; pageAccessToken: string; pageName: string }> {

        // Estrategia 1: /me/accounts
        const pagesRes = await fetch(
            `${this.GRAPH_URL}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
        );
        const pagesData = await pagesRes.json();
        const pages = pagesData.data || [];
        console.log(`  📋 /me/accounts: ${pages.length} página(s)`);

        for (const page of pages) {
            const result = await this.checkPageForInstagram(page.id, page.access_token || userAccessToken, page.name);
            if (result) return result;
        }

        // Estrategia 2: Acceso directo por IDs conocidos (Business Manager)
        console.log(`  🔄 /me/accounts vacío. Intentando acceso directo por page IDs...`);
        for (const pageId of this.KNOWN_PAGE_IDS) {
            const pageRes = await fetch(
                `${this.GRAPH_URL}/${pageId}?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
            );
            const pageData = await pageRes.json();

            if (pageData.error) {
                console.warn(`  ⚠️ Sin acceso a page ${pageId}: ${pageData.error.message}`);
                continue;
            }

            if (pageData.instagram_business_account) {
                const igId = pageData.instagram_business_account.id;
                console.log(`  ✅ Página "${pageData.name}" tiene IG Business: ${igId}`);
                return {
                    igBusinessId: igId,
                    pageAccessToken: pageData.access_token || userAccessToken,
                    pageName: pageData.name || pageId,
                };
            }
        }

        throw new Error(
            "No se encontró ninguna cuenta de Instagram Business. " +
            "Por favor reconecta tu cuenta desde la aplicación."
        );
    }

    /**
     * Verifica si una página tiene Instagram Business vinculado.
     */
    private static async checkPageForInstagram(
        pageId: string,
        pageToken: string,
        pageName: string
    ): Promise<{ igBusinessId: string; pageAccessToken: string; pageName: string } | null> {
        const igRes = await fetch(
            `${this.GRAPH_URL}/${pageId}?fields=instagram_business_account,name&access_token=${pageToken}`
        );
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
            console.log(`  ✅ "${pageName}" → IG: ${igData.instagram_business_account.id}`);
            return {
                igBusinessId: igData.instagram_business_account.id,
                pageAccessToken: pageToken,
                pageName,
            };
        }
        return null;
    }

    /**
     * Paso 1: Crear el contenedor de media en Instagram
     */
    private static async createMediaContainer(
        igId: string,
        accessToken: string,
        mediaUrl: string,
        caption: string,
        isVideo: boolean
    ): Promise<string> {
        const params: any = { access_token: accessToken, caption };

        if (isVideo) {
            params.video_url = mediaUrl;
            params.media_type = "REELS";
        } else {
            params.image_url = mediaUrl;
        }

        const res = await fetch(`${this.GRAPH_URL}/${igId}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            throw new Error(`Error creando contenedor IG (${res.status}): ${data.error?.message || res.statusText}`);
        }

        return data.id;
    }

    /**
     * Paso 2: Publicar el contenedor de media
     */
    private static async publishMediaContainer(igId: string, accessToken: string, containerId: string): Promise<any> {
        const res = await fetch(`${this.GRAPH_URL}/${igId}/media_publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: accessToken, creation_id: containerId }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            throw new Error(`Error publicando en IG (${res.status}): ${data.error?.message || res.statusText}`);
        }

        return data;
    }

    /**
     * Polling para esperar a que el contenedor esté listo (necesario para videos)
     */
    private static async waitForContainerReady(
        igId: string,
        accessToken: string,
        containerId: string,
        maxWaitMs = 120000
    ): Promise<void> {
        const deadline = Date.now() + maxWaitMs;
        let attempt = 0;

        while (Date.now() < deadline) {
            attempt++;
            const res = await fetch(
                `${this.GRAPH_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`
            );

            if (res.ok) {
                const data = await res.json();
                console.log(`   🔍 [IG Poll #${attempt}] status_code: ${data.status_code}`);

                if (data.status_code === "FINISHED") {
                    console.log(`   ✅ Contenedor listo.`);
                    return;
                }
                if (data.status_code === "ERROR") {
                    throw new Error(`Instagram falló al procesar el media: ${data.status}`);
                }
                if (data.status_code === "IN_PROGRESS" || data.status_code === "PUBLISHED") {
                    // Para imágenes, puede que no haya polling necesario
                    if (attempt === 1 && data.status_code === "PUBLISHED") return;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error("Timeout esperando procesamiento de media en Instagram (120s).");
    }
}

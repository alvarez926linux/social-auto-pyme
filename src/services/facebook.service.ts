import { prisma } from "@/lib/prisma";

const GRAPH_URL = "https://graph.facebook.com/v19.0";

// IDs de páginas conocidas (mismo fallback que InstagramService)
const KNOWN_PAGE_IDS = [
    "316033991604108", // Academia ACP
    "110723485144764", // AlvarezF1Team
];

export class FacebookService {

    /**
     * Publica un post en una Página de Facebook (texto, imagen o video)
     */
    static async publishPost(userId: string, content: string, mediaUrls?: string[]): Promise<any> {
        console.log(`📘 FacebookService: Iniciando publicación para el usuario ${userId}`);

        // 1. Obtener el User Access Token de Facebook desde la DB
        const account = await prisma.account.findFirst({
            where: { userId, provider: "facebook" },
        });

        if (!account?.access_token) {
            throw new Error("No se encontró cuenta de Facebook vinculada. Por favor reconecta tu cuenta.");
        }

        const userAccessToken = account.access_token;

        // 2. Obtener el Page Access Token (necesario para publicar en páginas)
        const { pageId, pageAccessToken, pageName } = await this.getPageToken(userAccessToken);
        console.log(`  ✅ Página encontrada: "${pageName}" (ID: ${pageId})`);

        // 3. Detectar tipo de media y publicar
        if (!mediaUrls || mediaUrls.length === 0) {
            // Post de solo texto
            console.log(`  📝 Publicando post de texto en Facebook...`);
            return this.publishTextPost(pageId, pageAccessToken, content);
        }

        const mediaUrl = mediaUrls[0];
        const isVideo = await this.isVideoUrl(mediaUrl);

        if (isVideo) {
            console.log(`  🎬 Publicando video en Facebook...`);
            return this.publishVideoPost(pageId, pageAccessToken, mediaUrl, content);
        } else {
            console.log(`  🖼️ Publicando imagen en Facebook...`);
            return this.publishImagePost(pageId, pageAccessToken, mediaUrl, content);
        }
    }

    /**
     * Obtiene el Page Access Token de la primera página administrada por el usuario.
     * Estrategia doble: /me/accounts → fallback por IDs conocidos.
     */
    private static async getPageToken(
        userAccessToken: string
    ): Promise<{ pageId: string; pageAccessToken: string; pageName: string }> {

        // Estrategia 1: /me/accounts
        const pagesRes = await fetch(
            `${GRAPH_URL}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
        );
        const pagesData = await pagesRes.json();
        const pages = pagesData.data || [];
        console.log(`  📋 /me/accounts: ${pages.length} página(s)`);

        if (pages.length > 0) {
            const page = pages[0]; // Usar la primera página
            return {
                pageId: page.id,
                pageAccessToken: page.access_token || userAccessToken,
                pageName: page.name,
            };
        }

        // Estrategia 2: Acceso directo por IDs conocidos
        console.log(`  🔄 /me/accounts vacío. Intentando con page IDs conocidos...`);
        for (const pageId of KNOWN_PAGE_IDS) {
            const pageRes = await fetch(
                `${GRAPH_URL}/${pageId}?fields=id,name,access_token&access_token=${userAccessToken}`
            );
            const pageData = await pageRes.json();

            if (pageData.error) {
                console.warn(`  ⚠️ Sin acceso a page ${pageId}: ${pageData.error.message}`);
                continue;
            }

            if (pageData.id) {
                return {
                    pageId: pageData.id,
                    pageAccessToken: pageData.access_token || userAccessToken,
                    pageName: pageData.name || pageId,
                };
            }
        }

        throw new Error(
            "No se encontró ninguna Página de Facebook administrada. " +
            "Asegúrate de ser administrador de al menos una página y reconecta tu cuenta."
        );
    }

    /**
     * Publica un post de solo texto en la página.
     */
    private static async publishTextPost(
        pageId: string,
        pageAccessToken: string,
        message: string
    ): Promise<any> {
        const res = await fetch(`${GRAPH_URL}/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, access_token: pageAccessToken }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            console.error("❌ Error publicando texto en Facebook:", JSON.stringify(data));
            throw new Error(`Error publicando texto en Facebook: ${data.error?.message || res.statusText}`);
        }

        console.log(`  ✅ Post de texto publicado: ${data.id}`);
        return data;
    }

    /**
     * Publica una imagen en la página.
     * Usa el endpoint /photos que acepta una URL pública directamente.
     */
    private static async publishImagePost(
        pageId: string,
        pageAccessToken: string,
        imageUrl: string,
        caption: string
    ): Promise<any> {
        const res = await fetch(`${GRAPH_URL}/${pageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: imageUrl,
                caption,
                access_token: pageAccessToken,
            }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            console.error("❌ Error publicando imagen en Facebook:", JSON.stringify(data));
            throw new Error(`Error publicando imagen en Facebook: ${data.error?.message || res.statusText}`);
        }

        console.log(`  ✅ Imagen publicada: ${data.id}`);
        return data;
    }

    /**
     * Publica un video en la página.
     * Facebook acepta la URL del video directamente en el campo `file_url`.
     */
    private static async publishVideoPost(
        pageId: string,
        pageAccessToken: string,
        videoUrl: string,
        description: string
    ): Promise<any> {
        const res = await fetch(`${GRAPH_URL}/${pageId}/videos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                file_url: videoUrl,
                description,
                access_token: pageAccessToken,
            }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            console.error("❌ Error publicando video en Facebook:", JSON.stringify(data));
            throw new Error(`Error publicando video en Facebook: ${data.error?.message || res.statusText}`);
        }

        console.log(`  ✅ Video publicado: ${data.id}`);
        return data;
    }

    /**
     * Detecta si una URL apunta a un video via Content-Type.
     */
    private static async isVideoUrl(url: string): Promise<boolean> {
        if (/\.(mp4|mov|avi|webm|mkv)/i.test(url)) return true;
        if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) return false;

        try {
            const res = await fetch(url, { method: "HEAD" });
            const contentType = res.headers.get("content-type") || "";
            return contentType.startsWith("video/");
        } catch {
            return false;
        }
    }
}

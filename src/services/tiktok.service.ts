import { prisma } from "@/lib/prisma";

const TIKTOK_API = "https://open.tiktokapis.com/v2";
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;

export class TikTokService {

    /**
     * Publica un video en TikTok usando el método PULL_FROM_URL.
     * TikTok descarga el video directamente desde la URL pública (UploadThing).
     * 
     * NOTA: Hasta que la app pase el App Review de TikTok, los posts
     * se publican como PRIVADOS (privacy_level: "SELF_ONLY").
     */
    static async publishPost(userId: string, caption: string, mediaUrls?: string[]): Promise<any> {
        console.log(`🎵 TikTokService: Iniciando publicación para el usuario ${userId}`);

        // 1. Validar que hay un video (TikTok solo acepta videos)
        if (!mediaUrls || mediaUrls.length === 0) {
            throw new Error("TikTok requiere un video para publicar. No se puede publicar solo texto o imágenes.");
        }

        const videoUrl = mediaUrls[0];
        const isVideo = await this.isVideoUrl(videoUrl);
        if (!isVideo) {
            throw new Error("TikTok solo acepta videos. El archivo proporcionado no parece ser un video MP4/WebM/MOV.");
        }

        // 2. Obtener el token de acceso de TikTok desde la DB
        const account = await prisma.account.findFirst({
            where: { userId, provider: "tiktok" },
        });

        if (!account?.access_token) {
            throw new Error("No se encontró cuenta de TikTok vinculada. Por favor conecta tu cuenta de TikTok.");
        }

        // 3. Verificar si el token está expirado y refrescar si es necesario
        const accessToken = await this.getValidToken(account);
        console.log(`  🔑 Token TikTok válido. Open ID: ${account.providerAccountId}`);

        // 4. Iniciar la publicación via PULL_FROM_URL
        console.log(`  🎬 Publicando video via PULL_FROM_URL: ${videoUrl.substring(0, 80)}...`);

        const publishRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
                post_info: {
                    title: caption.substring(0, 2200), // TikTok limit: 2200 chars
                    privacy_level: "SELF_ONLY",        // Privado hasta pasar App Review
                    disable_duet: false,
                    disable_comment: false,
                    disable_stitch: false,
                    video_cover_timestamp_ms: 1000,
                },
                source_info: {
                    source: "PULL_FROM_URL",
                    video_url: videoUrl,
                },
            }),
        });

        const publishData = await publishRes.json();
        console.log(`  📋 TikTok publish response: ${JSON.stringify(publishData).substring(0, 500)}`);

        if (!publishRes.ok || publishData.error?.code !== "ok") {
            const errMsg = publishData.error?.message || publishData.error?.code || publishRes.statusText;
            throw new Error(`Error publicando en TikTok: ${errMsg}`);
        }

        const publishId = publishData.data?.publish_id;
        console.log(`  ✅ Video enviado a TikTok. Publish ID: ${publishId}`);
        console.log(`  ℹ️ El video se publicará como PRIVADO hasta que la app pase el App Review de TikTok.`);

        return publishData.data;
    }

    /**
     * Refresca el access token usando el refresh token si está próximo a expirar.
     */
    private static async getValidToken(account: any): Promise<string> {
        if (!account.expires_at) return account.access_token;

        const expiresAt = new Date(account.expires_at * 1000);
        const now = new Date();
        const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000 / 60;

        // Si expira en menos de 10 minutos, refrescar
        if (minutesUntilExpiry > 10) return account.access_token;

        console.log(`  🔄 Token TikTok próximo a expirar. Refrescando...`);

        if (!account.refresh_token) {
            throw new Error("Token de TikTok expirado y no hay refresh token disponible. Reconecta tu cuenta.");
        }

        const refreshRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: TIKTOK_CLIENT_KEY,
                client_secret: TIKTOK_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: account.refresh_token,
            }),
        });

        const refreshData = await refreshRes.json();

        if (!refreshRes.ok || !refreshData.access_token) {
            throw new Error(`Error refrescando token de TikTok: ${JSON.stringify(refreshData)}`);
        }

        // Actualizar token en DB
        await prisma.account.update({
            where: { id: account.id },
            data: {
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token,
                expires_at: refreshData.expires_in
                    ? Math.floor(Date.now() / 1000) + refreshData.expires_in
                    : null,
            },
        });

        console.log(`  ✅ Token TikTok refrescado exitosamente.`);
        return refreshData.access_token;
    }

    /**
     * Detecta si una URL apunta a un video via Content-Type.
     */
    private static async isVideoUrl(url: string): Promise<boolean> {
        if (/\.(mp4|mov|webm|avi|mkv)/i.test(url)) return true;
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

import { prisma } from "@/lib/prisma";

export class LinkedInService {
    private static API_URL = "https://api.linkedin.com/v2";

    /**
     * Publica un post en LinkedIn (Texto y opcionalmente Media)
     */
    static async publishPost(userId: string, content: string, mediaUrls?: string[]): Promise<any> {
        console.log(`🎬 LinkedInService: Iniciando publicación para el usuario ${userId}`);
        // 1. Obtener el token de acceso de la base de datos
        const account = await prisma.account.findFirst({
            where: { userId, provider: "linkedin" },
        });

        if (!account?.access_token) {
            throw new Error("No se encontró token de LinkedIn para el usuario");
        }

        // 2. Obtener el URN del usuario (ID interno de LinkedIn)
        const userUrn = await this.getUserUrn(account.access_token);
        const authorUrn = `urn:li:person:${userUrn}`;

        let shareContent: any = {
            shareCommentary: { text: content },
            shareMediaCategory: "NONE",
        };

        // 3. Manejo de Multimedia (Si existen mediaUrls)
        if (mediaUrls && mediaUrls.length > 0) {
            try {
                // Detectar tipo de media con fallback por extensión si HEAD falla
                const mediaWithTypes = await Promise.all(mediaUrls.map(async (url) => {
                    let contentType = "";
                    try {
                        const headRes = await fetch(url, { method: "HEAD", timeout: 5000 } as any);
                        contentType = headRes.headers.get("content-type") || "";
                    } catch (e) {
                        console.warn(`⚠️ Error en HEAD para ${url}, usando detección por extensión.`);
                    }

                    if (!contentType) {
                        const extension = url.split(".").pop()?.toLowerCase();
                        const videoExtensions = ["mp4", "mov", "avi", "webm"];
                        contentType = videoExtensions.includes(extension || "") ? "video/mp4" : "image/jpeg";
                    }

                    const isVideo = contentType.startsWith("video/");
                    return { url, isVideo, contentType };
                }));

                const assets = await Promise.all(mediaWithTypes.map(async ({ url, isVideo, contentType }) => {
                    console.log(`🚀 Iniciando subida de ${isVideo ? "VIDEO" : "IMAGEN"}: ${url}`);
                    const assetUrn = await this.uploadMedia(account.access_token!, authorUrn, url, isVideo, contentType);

                    // NOTA: El polling de waitForAssetReady fue eliminado porque la API
                    // de LinkedIn Assets retorna 404/400 inmediatamente después de la subida
                    // aunque el asset está guardado correctamente. LinkedIn procesa el video
                    // en segundo plano y el post se publica correctamente sin esperar.
                    console.log(`✅ Asset subido: ${assetUrn} — publicando sin esperar procesamiento.`);

                    return {
                        status: "READY",
                        media: assetUrn,
                        title: { text: "Post Media" }
                    };
                }));

                const hasVideo = mediaWithTypes.some(m => m.isVideo);
                shareContent.shareMediaCategory = hasVideo ? "VIDEO" : "IMAGE";
                shareContent.media = assets;
            } catch (error) {
                console.error("❌ Error subiendo media a LinkedIn:", error);
                throw new Error("Error procesando imágenes/videos para LinkedIn");
            }
        }

        // 4. Publicar el UGC Post
        console.log("📤 Enviando publicación final a LinkedIn...");
        const response = await fetch(`${this.API_URL}/ugcPosts`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${account.access_token}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify({
                author: authorUrn,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": shareContent,
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ LinkedIn API Error:", JSON.stringify(errorData, null, 2));
            throw new Error(`Error en LinkedIn API: ${response.statusText}`);
        }

        const publishResult = await response.json();
        console.log("✅ Post publicado exitosamente:", publishResult.id);
        return publishResult;
    }

    /**
     * Flujo de 3 pasos para subir media a LinkedIn
     */
    private static async uploadMedia(accessToken: string, author: string, mediaUrl: string, isVideo: boolean, contentType?: string): Promise<string> {
        // PASO 1: Register Upload
        const registerRes = await fetch(`${this.API_URL}/assets?action=registerUpload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                registerUploadRequest: {
                    recipes: [isVideo ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image"],
                    owner: author,
                    serviceRelationships: [
                        {
                            relationshipType: "OWNER",
                            identifier: "urn:li:userGeneratedContent",
                        },
                    ],
                },
            }),
        });

        if (!registerRes.ok) {
            const err = await registerRes.json();
            console.error("❌ Error en registerUpload:", err);
            throw new Error("Fallo al registrar subida en LinkedIn");
        }

        const registerData = await registerRes.json();
        console.log("📦 registerUpload Response:", JSON.stringify(registerData, null, 2));
        const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
        const assetUrn = registerData.value.asset;

        // PASO 2: Descargar el archivo original y subirlo a LinkedIn
        const mediaBufferRes = await fetch(mediaUrl);
        if (!mediaBufferRes.ok) throw new Error("No se pudo descargar la media original de Uploadthing");
        const mediaBuffer = await mediaBufferRes.arrayBuffer();

        const uploadContentType = contentType || (isVideo ? "video/mp4" : "image/jpeg");

        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": uploadContentType,
            },
            body: Buffer.from(mediaBuffer),
        });

        if (!uploadRes.ok) throw new Error("Fallo en la subida binaria a LinkedIn");

        return assetUrn;
    }

    /**
     * Espera a que LinkedIn termine de procesar un asset de video.
     */
    private static async waitForAssetReady(accessToken: string, assetUrn: string, maxWaitMs = 180000): Promise<void> {
        const encodedUrn = encodeURIComponent(assetUrn);
        const deadline = Date.now() + maxWaitMs;
        const pollInterval = 10000; // Aumentar a 10s para ser más conservadores

        console.log(`⏳ Esperando a que LinkedIn procese el asset: ${assetUrn}`);

        while (Date.now() < deadline) {
            try {
                // Estrategia 1: Assets API con IDS (más flexible)
                const res = await fetch(`${this.API_URL}/assets?ids=${encodedUrn}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "X-Restli-Protocol-Version": "2.0.0"
                    },
                });

                if (res.ok) {
                    const data: any = await res.json();
                    const assetData = data.results?.[assetUrn] || data.statuses?.[assetUrn] || data[assetUrn];

                    if (assetData) {
                        const status = assetData.status || (assetData.recipes?.[0]?.status);
                        console.log(`   🔍 [POLL-IDS] Status de ${assetUrn}:`, status);

                        if (status === "AVAILABLE" || status === "READY" || status === "ACTIVE") {
                            console.log(`✅ Asset listo.`);
                            return;
                        }
                        if (status === "FAILED" || status === "PROCESSING_FAILED") {
                            console.error("❌ LinkedIn falló al procesar el archivo (IDS):", JSON.stringify(data, null, 2));
                            throw new Error("LinkedIn falló al procesar el archivo multimedia.");
                        }
                        if (!status) {
                            console.log("❓ Data de asset sin status reconocido (IDS):", JSON.stringify(data, null, 2));
                        }
                    } else {
                        console.log(`❓ Asset no encontrado en la respuesta de IDS. Intentando fallback...`);
                    }
                } else {
                    const errText = await res.text();
                    console.warn(`⚠️ LinkedIn Poll error (IDS, ${res.status}): ${errText.substring(0, 100)}`);
                }

                // Estrategia 2: Si falla la anterior o no hay datos, probar Videos API si parece un video
                const assetId = assetUrn.split(":").pop();
                if (assetId) { // Only try if assetId is valid
                    const videoRes = await fetch(`${this.API_URL}/videos/${assetId}`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "X-Restli-Protocol-Version": "2.0.0"
                        },
                    });

                    if (videoRes.ok) {
                        const videoData: any = await videoRes.json();
                        const status = videoData.status;
                        console.log(`   🔍 [POLL-VIDEO] Status de ${assetUrn}:`, status);

                        if (status === "AVAILABLE" || status === "READY" || status === "ACTIVE") {
                            console.log(`✅ Video listo.`);
                            return;
                        }
                        if (status === "FAILED" || status === "PROCESSING_FAILED") {
                            console.error("❌ LinkedIn falló al procesar el archivo (VIDEO):", JSON.stringify(videoData, null, 2));
                            throw new Error("LinkedIn falló al procesar el archivo multimedia.");
                        }
                        if (!status) {
                            console.log("❓ Data de video sin status reconocido (VIDEO):", JSON.stringify(videoData, null, 2));
                        }
                    } else if (videoRes.status !== 404) { // Log errors other than 404 (which might mean it's not a video)
                        const errText = await videoRes.text();
                        console.log(`⚠️ Video API error (${videoRes.status}): ${errText.substring(0, 100)}`);
                    }
                }

            } catch (e: any) {
                console.error(`❌ Error en el loop de polling: ${e.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error(`Timeout: El video no estuvo listo después de ${maxWaitMs / 1000} segundos.`);
    }

    private static async getUserUrn(accessToken: string): Promise<string> {
        const response = await fetch(`${this.API_URL}/userinfo`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error("No se pudo obtener el profile de LinkedIn");
        const data = await response.json();
        return data.sub; // URN del usuario
    }
}

import { inngest } from "./client";
import { LinkedInService } from "@/services/linkedin.service";
import { InstagramService } from "@/services/instagram.service";
import { FacebookService } from "@/services/facebook.service";
import { TikTokService } from "@/services/tiktok.service";
import { prisma } from "@/lib/prisma";

/**
 * Workflow para agendar y publicar un post en múltiples redes sociales
 */
export const scheduleSocialPost = inngest.createFunction(
    { id: "schedule-social-post" },
    { event: "post.scheduled" },
    async ({ event, step }) => {
        const { postId, scheduledDate } = event.data;

        // 1. Esperar hasta la fecha programada
        if (scheduledDate) {
            await step.sleepUntil("wait-for-publish", scheduledDate);
        }

        // 2. Ejecutar la publicación en cada plataforma
        const result = await step.run("publish-social-media", async () => {
            const post = await prisma.post.findUnique({
                where: { id: postId },
            });

            if (!post) throw new Error("Post no encontrado");

            const results: Record<string, any> = {};
            const errors: string[] = [];
            const platforms = post.platforms?.length > 0 ? post.platforms : ["linkedin"];

            // Publicar en cada plataforma seleccionada
            for (const platform of platforms) {
                try {
                    console.log(`🚀 Iniciando publicación en ${platform} para el post ${postId}`);

                    if (platform === "linkedin") {
                        results.linkedin = await LinkedInService.publishPost(
                            post.userId,
                            post.content,
                            post.mediaUrls
                        );
                    } else if (platform === "instagram") {
                        results.instagram = await InstagramService.publishPost(
                            post.userId,
                            post.content,
                            post.mediaUrls
                        );
                    } else if (platform === "facebook") {
                        results.facebook = await FacebookService.publishPost(
                            post.userId,
                            post.content,
                            post.mediaUrls
                        );
                    } else if (platform === "tiktok") {
                        results.tiktok = await TikTokService.publishPost(
                            post.userId,
                            post.content,
                            post.mediaUrls
                        );
                    }
                } catch (error: any) {
                    console.error(`❌ Error publicando en ${platform}:`, error.message);
                    errors.push(`${platform}: ${error.message}`);
                }
            }

            // Determinar estado final
            if (errors.length === 0) {
                await prisma.post.update({
                    where: { id: postId },
                    data: { status: "PUBLISHED" },
                });
            } else if (errors.length < post.platforms.length) {
                // Publicado parcialmente (lo dejamos como PUBLISHED por ahora, o podrías crear un estado nuevo)
                await prisma.post.update({
                    where: { id: postId },
                    data: { status: "PUBLISHED" },
                });
            } else {
                await prisma.post.update({
                    where: { id: postId },
                    data: { status: "FAILED" },
                });
                throw new Error(`Fallo total en publicación: ${errors.join(", ")}`);
            }

            return { success: true, results, errors };
        });

        return result;
    }
);

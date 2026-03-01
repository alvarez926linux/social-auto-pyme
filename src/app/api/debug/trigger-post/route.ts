import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/debug/trigger-post?postId=...
 * Fuerza la publicación de un post en las plataformas configuradas via Inngest.
 * SOLO PARA DIAGNÓSTICO - remover antes de producción.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
        // Si no hay postId, devolver el último post con video para facilitar las pruebas
        const latestPost = await prisma.post.findFirst({
            where: { mediaUrls: { isEmpty: false } },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            error: "Falta el parámetro postId",
            suggestion: latestPost ? `Usar: /api/debug/trigger-post?postId=${latestPost.id}` : "No hay posts con media",
            latestPost,
        }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
        return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
    }

    console.log(`🧪 [DEBUG] Forzando publicación del post ${postId} via Inngest`);
    console.log(`   Plataformas: ${post.platforms.join(", ")}`);
    console.log(`   Media URLs: ${post.mediaUrls.join(", ")}`);

    // Enviar a Inngest para publicación inmediata (sin sleep)
    await inngest.send({
        name: "post.scheduled",
        data: {
            postId,
            userId: post.userId,
            scheduledDate: null, // null = publicar ahora
        },
    });

    return NextResponse.json({
        message: `✅ Evento enviado a Inngest para el post ${postId}`,
        post: {
            id: post.id,
            status: post.status,
            platforms: post.platforms,
            mediaUrls: post.mediaUrls,
        },
        note: "Revisa el Inngest Dev Server en http://localhost:8288 para ver los logs en tiempo real",
    });
}

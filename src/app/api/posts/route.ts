import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { content, mediaUrls, scheduledDate, platforms } = await req.json();

        if (!content) {
            return NextResponse.json({ error: "Contenido es requerido" }, { status: 400 });
        }

        // 1. Guardar en DB
        const post = await prisma.post.create({
            data: {
                userId: (session.user as any).id,
                content,
                mediaUrls: mediaUrls || [],
                platforms: platforms || ["linkedin"],
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                status: scheduledDate ? "SCHEDULED" : "DRAFT",
            },
        });


        // 2. Si tiene fecha, disparar el workflow de Inngest
        if (scheduledDate) {
            try {
                await inngest.send({
                    name: "post.scheduled",
                    data: {
                        postId: post.id,
                        userId: post.userId,
                        scheduledDate: post.scheduledDate,
                    },
                });
            } catch (inngestError) {
                console.warn("⚠️ Inngest side-effect failed, but post was created in DB:", inngestError);
                // No lanzamos error para que la UI no falle, el post ya está en la DB
            }
        }

        return NextResponse.json(post);
    } catch (error: any) {
        console.error("Post Creation Error:", error);
        return NextResponse.json({
            error: "Error creando el post",
            details: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        }, { status: 500 });
    }
}

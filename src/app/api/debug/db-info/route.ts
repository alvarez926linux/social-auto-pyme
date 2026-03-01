import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, email: true, name: true }
    });

    const posts = await prisma.post.findMany({
        where: { mediaUrls: { isEmpty: false } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
            id: true,
            userId: true,
            platforms: true,
            status: true,
            mediaUrls: true,
            createdAt: true,
        }
    });

    const accounts = await prisma.account.findMany({
        take: 10,
        select: {
            userId: true,
            provider: true,
            expires_at: true,
        }
    });

    return NextResponse.json({ users, posts, accounts });
}

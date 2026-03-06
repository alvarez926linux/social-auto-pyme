import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { provider } = await req.json();

        if (!provider) {
            return NextResponse.json({ error: "Proveedor no especificado" }, { status: 400 });
        }

        // Eliminar la cuenta del proveedor para este usuario
        await prisma.account.deleteMany({
            where: {
                userId: session.user.id,
                provider: provider,
            },
        });

        console.log(`[auth/disconnect] ✅ Cuenta ${provider} desvinculada para userId=${session.user.id}`);
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[auth/disconnect] Error:", err.message);
        return NextResponse.json({ error: "Error al desvincular cuenta" }, { status: 500 });
    }
}

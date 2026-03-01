import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FACEBOOK_APP_ID = process.env.FACEBOOK_CLIENT_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/auth/link-instagram`;

/**
 * GET /api/auth/link-instagram
 * 
 * Dos modos:
 * 1. Sin ?code → Redirige a Facebook OAuth para pedir permisos
 * 2. Con ?code → Callback de Facebook: intercambia el code por token y lo guarda en DB
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // --- Modo 1: Iniciar OAuth (no hay code) ---
    if (!code) {
        const scopes = [
            "public_profile",
            "instagram_basic",
            "instagram_content_publish",
            "pages_show_list",
            "pages_read_engagement",
            "pages_manage_posts",
        ].join(",");

        const fbUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
        fbUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
        fbUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        fbUrl.searchParams.set("scope", scopes);
        fbUrl.searchParams.set("response_type", "code");

        console.log(`[link-instagram] Redirigiendo a Facebook OAuth...`);
        return NextResponse.redirect(fbUrl.toString());
    }

    // --- Modo 2: Callback con code ---
    if (error) {
        console.error(`[link-instagram] Error de Facebook: ${error}`);
        return NextResponse.redirect(new URL("/?ig_error=" + encodeURIComponent(error), req.url));
    }

    try {
        // 1. Intercambiar code por access_token
        const tokenRes = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?` +
            `client_id=${FACEBOOK_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&client_secret=${FACEBOOK_APP_SECRET}` +
            `&code=${code}`
        );
        const tokenData = await tokenRes.json();

        if (tokenData.error || !tokenData.access_token) {
            console.error("[link-instagram] Error al obtener token:", tokenData.error);
            return NextResponse.redirect(new URL("/?ig_error=token_failed", req.url));
        }

        const accessToken: string = tokenData.access_token;
        const expiresIn: number = tokenData.expires_in ?? null;

        // 2. Obtener el ID de la cuenta de Facebook del usuario
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
        const meData = await meRes.json();

        if (!meData.id) {
            console.error("[link-instagram] No se pudo obtener el ID de Facebook:", meData);
            return NextResponse.redirect(new URL("/?ig_error=profile_failed", req.url));
        }

        const providerAccountId = meData.id;
        const userId = session.user.id;

        // 3. Guardar/actualizar la cuenta de Facebook en DB
        await prisma.account.upsert({
            where: {
                provider_providerAccountId: {
                    provider: "facebook",
                    providerAccountId: providerAccountId,
                }
            },
            update: {
                access_token: accessToken,
                expires_at: expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null,
                scope: "public_profile,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_engagement",
                token_type: "bearer",
            },
            create: {
                userId: userId,
                type: "oauth",
                provider: "facebook",
                providerAccountId: providerAccountId,
                access_token: accessToken,
                expires_at: expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null,
                scope: "public_profile,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_engagement",
                token_type: "bearer",
            }
        });

        console.log(`[link-instagram] ✅ Cuenta Facebook guardada para userId=${userId}, fbId=${providerAccountId}`);
        return NextResponse.redirect(new URL("/?ig_connected=true", req.url));

    } catch (err: any) {
        console.error("[link-instagram] Error inesperado:", err.message);
        return NextResponse.redirect(new URL("/?ig_error=unexpected", req.url));
    }
}

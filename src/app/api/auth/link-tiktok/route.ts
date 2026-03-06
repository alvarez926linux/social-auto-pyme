import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/auth/link-tiktok`;

// Nombre de la cookie donde se guarda el code_verifier para PKCE
const VERIFIER_COOKIE = "tt_cv";

/**
 * Genera el code_verifier y code_challenge según RFC 7636 (PKCE)
 */
function generatePKCE() {
    // code_verifier: 43-128 caracteres alfanuméricos aleatorios
    const codeVerifier = crypto.randomBytes(48).toString("base64url").substring(0, 64);
    // code_challenge = BASE64URL(SHA256(code_verifier))
    const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");
    return { codeVerifier, codeChallenge };
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // --- Modo 1: Iniciar OAuth → generar PKCE y redirigir ---
    if (!code) {
        const { codeVerifier, codeChallenge } = generatePKCE();
        const csrfState = crypto.randomBytes(16).toString("hex");

        const ttUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
        ttUrl.searchParams.set("client_key", TIKTOK_CLIENT_KEY);
        ttUrl.searchParams.set("scope", "video.publish,video.upload");
        ttUrl.searchParams.set("response_type", "code");
        ttUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        ttUrl.searchParams.set("state", csrfState);
        ttUrl.searchParams.set("code_challenge", codeChallenge);
        ttUrl.searchParams.set("code_challenge_method", "S256");

        console.log(`[link-tiktok] Redirigiendo a TikTok OAuth con PKCE...`);

        const redirResponse = NextResponse.redirect(ttUrl.toString());
        // Guardar el code_verifier en una cookie para usarlo en el callback
        redirResponse.cookies.set(VERIFIER_COOKIE, codeVerifier, {
            httpOnly: true,
            secure: false, // localhost
            maxAge: 600,   // 10 minutos
            path: "/",
            sameSite: "lax",
        });
        return redirResponse;
    }

    // --- Modo 2: Callback ---
    if (error) {
        console.error(`[link-tiktok] Error de TikTok: ${error}`);
        return NextResponse.redirect(new URL("/?tt_error=" + encodeURIComponent(error), req.url));
    }

    try {
        // Recuperar el code_verifier de la cookie
        const codeVerifier = req.cookies.get(VERIFIER_COOKIE)?.value;
        if (!codeVerifier) {
            console.error("[link-tiktok] No se encontró code_verifier en la cookie");
            return NextResponse.redirect(new URL("/?tt_error=verifier_missing", req.url));
        }

        // 1. Intercambiar code por access_token + refresh_token con PKCE
        const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: TIKTOK_CLIENT_KEY,
                client_secret: TIKTOK_CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier,
            }),
        });

        const tokenData = await tokenRes.json();
        console.log("[link-tiktok] Token response:", JSON.stringify(tokenData).substring(0, 300));

        if (tokenData.error || !tokenData.access_token) {
            console.error("[link-tiktok] Error al obtener token:", tokenData);
            return NextResponse.redirect(new URL("/?tt_error=token_failed", req.url));
        }

        const { access_token, refresh_token, expires_in, open_id } = tokenData;

        let userId = session?.user?.id;

        if (!userId) {
            // Si no hay sesión, buscamos si ya existe el usuario con esta cuenta de TikTok
            const existingAccount = await prisma.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: "tiktok",
                        providerAccountId: open_id,
                    }
                },
                select: { userId: true }
            });

            if (existingAccount) {
                userId = existingAccount.userId;
            } else {
                // Crear un nuevo usuario para este login de TikTok
                const newUser = await prisma.user.create({
                    data: {
                        name: "TikTok User",
                    }
                });
                userId = newUser.id;
            }
        }

        // 2. Guardar/actualizar la cuenta de TikTok en DB
        await prisma.account.upsert({
            where: {
                provider_providerAccountId: {
                    provider: "tiktok",
                    providerAccountId: open_id,
                },
            },
            update: {
                access_token,
                refresh_token,
                expires_at: expires_in ? Math.floor(Date.now() / 1000) + expires_in : null,
                scope: "video.publish,video.upload",
                token_type: "bearer",
            },
            create: {
                userId,
                type: "oauth",
                provider: "tiktok",
                providerAccountId: open_id,
                access_token,
                refresh_token,
                expires_at: expires_in ? Math.floor(Date.now() / 1000) + expires_in : null,
                scope: "video.publish,video.upload",
                token_type: "bearer",
            },
        });

        console.log(`[link-tiktok] ✅ Cuenta TikTok guardada. userId=${userId}, openId=${open_id}`);

        const successResponse = NextResponse.redirect(new URL("/?tt_connected=true", req.url));
        // Limpiar la cookie del verifier
        successResponse.cookies.delete(VERIFIER_COOKIE);
        return successResponse;

    } catch (err: any) {
        console.error("[link-tiktok] Error inesperado:", err.message);
        return NextResponse.redirect(new URL("/?tt_error=unexpected", req.url));
    }
}

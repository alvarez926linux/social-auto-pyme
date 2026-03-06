import { NextAuthOptions } from "next-auth";
import LinkedInProvider from "next-auth/providers/linkedin";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    debug: process.env.NODE_ENV === "development",
    providers: [
        LinkedInProvider({
            clientId: process.env.LINKEDIN_CLIENT_ID!,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
            authorization: {
                params: { scope: "openid profile email w_member_social" },
            },
            issuer: "https://www.linkedin.com/oauth",
            jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                };
            },
        }),
        FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID!,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
            authorization: {
                params: {
                    // 'email' fue removido: no es scope válido en Facebook Login para Instagram Graph API
                    scope: "public_profile,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"
                }
            },
            allowDangerousEmailAccountLinking: true,
        })
    ],
    callbacks: {
        async signIn({ account, user, profile }) {
            const logPath = 'c:\\RedesSociales\\social-auto-pyme\\DEBUG_AUTH.txt';
            const log = (msg: string) => {
                try { require('fs').appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`); } catch (e) { }
            };

            log(`🔐 SIGNIN: Provider=${account?.provider}, UserID=${user?.id}, Email=${user?.email || (profile as any)?.email}`);

            if (!account || !account.access_token) return true;

            // Intentar encontrar un usuario por email si NextAuth no lo vinculó automáticamente
            // o si el provider no devuelve email (como Facebook a veces)
            const email = user?.email || (profile as any)?.email;

            if (account.provider === "facebook" || account.provider === "tiktok" || account.provider === "linkedin") {
                try {
                    // 1. Si el usuario ya está logueado en la sesión (vinculación en caliente)
                    // NextAuth maneja esto internamente con el adaptador si la sesión existe,
                    // pero forzamos la lógica de persistencia manual para mayor control.

                    let dbUserId = user?.id;

                    // 2. Si es un login nuevo (no hay sesión), buscamos por email
                    if (!dbUserId && email) {
                        const existingUser = await prisma.user.findUnique({
                            where: { email },
                            select: { id: true }
                        });
                        dbUserId = existingUser?.id;
                    }

                    // 3. Si sigue sin haber userId, NextAuth creará uno nuevo (flujo normal adaptador)
                    // pero si es Facebook/TikTok y queremos vincularlo a un usuario existente sin email:
                    if (!dbUserId) {
                        // Fallback: Si no hay email, buscamos cualquier usuario (para demos de un solo usuario)
                        // o dejamos que el adaptador cree uno nuevo.
                        const firstUser = await prisma.user.findFirst({ select: { id: true } });
                        dbUserId = firstUser?.id;
                    }

                    if (dbUserId && account.providerAccountId) {
                        log(`🔗 Vinculando ${account.provider} a userId=${dbUserId}`);
                        await prisma.account.upsert({
                            where: {
                                provider_providerAccountId: {
                                    provider: account.provider,
                                    providerAccountId: account.providerAccountId,
                                }
                            },
                            update: {
                                access_token: account.access_token,
                                refresh_token: account.refresh_token ?? null,
                                expires_at: account.expires_at ?? null,
                                scope: account.scope ?? null,
                                token_type: account.token_type ?? null,
                            },
                            create: {
                                userId: dbUserId,
                                type: account.type,
                                provider: account.provider,
                                providerAccountId: account.providerAccountId,
                                access_token: account.access_token,
                                refresh_token: account.refresh_token ?? null,
                                expires_at: account.expires_at ?? null,
                                scope: account.scope ?? null,
                                token_type: account.token_type ?? null,
                            }
                        });
                        return true;
                    }
                } catch (err: any) {
                    log(`❌ Error en signIn callback: ${err.message}`);
                    return true; // Permitir login aunque falle el upsert manual (el adaptador lo intentará)
                }
            }

            return true;
        },
        async jwt({ token, account, user }) {
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.provider = account.provider;
            }
            if (user) {
                token.dbUserId = user.id;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.dbUserId as string;
                // Cargar todas las cuentas vinculadas para mostrar en la UI
                const accounts = await prisma.account.findMany({
                    where: { userId: token.dbUserId as string },
                    select: { provider: true }
                });
                session.accounts = accounts;
                session.provider = token.provider;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 días
    },
    pages: {
        signIn: "/",
        error: "/",
    },
    logger: {
        error(code, metadata) {
            try {
                require('fs').appendFileSync(
                    'c:\\RedesSociales\\social-auto-pyme\\DEBUG_AUTH.txt',
                    `\n[${new Date().toISOString()}] ❌ ERROR: ${code} - ${JSON.stringify(metadata)}\n`
                );
            } catch (e) { }
        },
        warn(code) {
            try {
                require('fs').appendFileSync(
                    'c:\\RedesSociales\\social-auto-pyme\\DEBUG_AUTH.txt',
                    `[${new Date().toISOString()}] ⚠️ WARN: ${code}\n`
                );
            } catch (e) { }
        },
        debug(code, metadata) {
            try {
                require('fs').appendFileSync(
                    'c:\\RedesSociales\\social-auto-pyme\\DEBUG_AUTH.txt',
                    `[${new Date().toISOString()}] 🔍 DEBUG: ${code} - ${JSON.stringify(metadata)}\n`
                );
            } catch (e) { }
        },
    },
};

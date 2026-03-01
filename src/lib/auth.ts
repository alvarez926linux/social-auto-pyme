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

            // Para Facebook: guardar/actualizar manualmente la cuenta en DB.
            // Usamos el providerAccountId de LinkedIn (ya en DB) porque sin scope
            // 'email', Facebook no devuelve el correo del usuario.
            if (account?.provider === "facebook" && account.access_token) {
                try {
                    // Buscar el usuario que tenga una cuenta de LinkedIn en DB
                    // (el usuario principal de la aplicación)
                    const linkedinAccount = await prisma.account.findFirst({
                        where: { provider: "linkedin" },
                        select: { userId: true }
                    });

                    if (!linkedinAccount) {
                        log("\u274c No se encontró ningún usuario con LinkedIn en DB. Debes iniciar sesión con LinkedIn primero.");
                        return false;
                    }

                    const dbUserId = linkedinAccount.userId;

                    // Upsert de la cuenta de Facebook vinculada al usuario de LinkedIn
                    await prisma.account.upsert({
                        where: {
                            provider_providerAccountId: {
                                provider: "facebook",
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
                            provider: "facebook",
                            providerAccountId: account.providerAccountId,
                            access_token: account.access_token,
                            refresh_token: account.refresh_token ?? null,
                            expires_at: account.expires_at ?? null,
                            scope: account.scope ?? null,
                            token_type: account.token_type ?? null,
                        }
                    });

                    log(`\u2705 Cuenta de Facebook guardada/actualizada en DB para userId=${dbUserId}`);
                    console.log(`\u2705 Cuenta Facebook guardada en DB para userId=${dbUserId}`);

                    // Retornar true para que NextAuth complete su flujo normal
                    return true;
                } catch (err: any) {
                    log(`\u274c Error al guardar cuenta FB: ${err.message}`);
                    console.error("\u274c Error guardando cuenta de Facebook en DB:", err.message);
                    return false;
                }
            }

            return true;
        },
        async jwt({ token, account, user }) {
            try {
                require('fs').appendFileSync(
                    'c:\\RedesSociales\\social-auto-pyme\\DEBUG_AUTH.txt',
                    `[${new Date().toISOString()}] 🎫 JWT: Provider=${account?.provider || 'none'}, UserID=${user?.id || 'none'}, TokenSub=${token.sub}\n`
                );
            } catch (e) { }

            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
            }
            if (user) {
                token.dbUserId = user.id;
            } else if (token.sub && !token.dbUserId) {
                token.dbUserId = token.sub;
            }
            return token;
        },
        async session({ session, token }: any) {
            try {
                require('fs').appendFileSync(
                    'c:\\RedesSociales\\social-auto-pyme\\DEBUG_AUTH.txt',
                    `[${new Date().toISOString()}] 👤 SESSION: User=${session.user?.email}, DB_ID=${token.dbUserId}\n`
                );
            } catch (e) { }

            if (session.user) {
                session.user.id = token.dbUserId as string;
                const accounts = await prisma.account.findMany({
                    where: { userId: token.dbUserId as string },
                    select: { provider: true }
                });
                (session as any).accounts = accounts;
            }
            session.accessToken = token.accessToken;
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

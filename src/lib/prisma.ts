import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let dbUrl = process.env.DATABASE_URL || "";
// Fix para el bug de la integración Vercel+Supabase que omite el Project ID en Supavisor
if (dbUrl.includes("pooler.supabase.com") && dbUrl.includes("postgres:") && !dbUrl.includes("postgres.xtauuwadmwmdjfgthrcu:")) {
    dbUrl = dbUrl.replace("postgres:", "postgres.xtauuwadmwmdjfgthrcu:");
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined
});
const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ["query"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

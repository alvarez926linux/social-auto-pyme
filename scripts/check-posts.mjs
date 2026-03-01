import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Posts con media
  const posts = await prisma.post.findMany({
    where: { mediaUrls: { isEmpty: false } },
    orderBy: { createdAt: 'desc' },
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

  console.log(`\n=== POSTS CON MEDIA (${posts.length} encontrados) ===`);
  for (const p of posts) {
    console.log(`\n- Post ID: ${p.id}`);
    console.log(`  userId:   ${p.userId}`);
    console.log(`  status:   ${p.status}`);
    console.log(`  platforms:${JSON.stringify(p.platforms)}`);
    console.log(`  mediaUrls:`);
    for (const url of p.mediaUrls) {
      console.log(`    → ${url}`);
    }
  }

  // Usuarios
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    take: 5
  });

  console.log(`\n=== USUARIOS (${users.length}) ===`);
  for (const u of users) {
    console.log(`- ${u.id} | ${u.email} | ${u.name}`);
  }

  // Cuentas vinculadas
  const accounts = await prisma.account.findMany({
    select: { userId: true, provider: true, expires_at: true },
    take: 10
  });

  console.log(`\n=== CUENTAS VINCULADAS ===`);
  for (const a of accounts) {
    const exp = a.expires_at ? new Date(a.expires_at * 1000).toISOString() : 'sin expiración';
    const expired = a.expires_at ? (new Date(a.expires_at * 1000) < new Date() ? '❌ EXPIRADO' : '✅ Válido') : '?';
    console.log(`- ${a.userId} | ${a.provider} | expira: ${exp} ${expired}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

import { PrismaClient } from '../prisma/generated/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM recommended_contents'
    );
    const count = rows?.[0]?.count ?? 0;
    console.log(`recommended_contents exists. Row count: ${count}`);
  } catch (err: any) {
    console.error('Check failed:', err?.message || err);
    if (String(err?.message || '').includes('relation') && String(err?.message || '').includes('does not exist')) {
      console.error('It looks like the table does not exist yet. Run Prisma migrate to create it.');
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

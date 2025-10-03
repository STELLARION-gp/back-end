// lib/prisma.ts
import { PrismaClient } from '../prisma/generated/client';

// Prevent multiple instances in dev (hot reload)
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    //log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error']
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function gracefulShutdown() {
    try {
        await prisma.$disconnect();
        // eslint-disable-next-line no-console
        console.log('🛑 Prisma disconnected gracefully');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Prisma disconnect error', e);
    }
}

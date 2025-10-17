// lib/prisma.ts
// Ensure environment variables are loaded before Prisma initializes
import 'dotenv/config';
import { PrismaClient } from '../prisma/generated/client';

// Prevent multiple instances in dev (hot reload)
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

if (!process.env.DATABASE_URL) {
    // Provide a clear warning early to aid debugging when env isn't set
    console.warn('⚠️  Prisma: DATABASE_URL is not set. Set it in .env or the environment before starting the server.');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    //log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error']
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function gracefulShutdown() {
    try {
        await prisma.$disconnect();
         
        console.log('🛑 Prisma disconnected gracefully');
    } catch (e) {
         
        console.error('Prisma disconnect error', e);
    }
}

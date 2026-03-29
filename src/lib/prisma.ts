import { PrismaClient } from '@prisma/client';

/** Singleton pattern to prevent multiple PrismaClient instances in development */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client instance with environment-aware logging.
 * Uses singleton pattern to maintain single connection across hot reloads.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

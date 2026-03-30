import { PrismaClient } from '@prisma/client';
import { withOptimize } from '@prisma/extension-optimize';

/** Singleton pattern to prevent multiple PrismaClient instances in development */
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.OPTIMIZE_API_KEY) {
    return client.$extends(
      withOptimize({
        apiKey: process.env.OPTIMIZE_API_KEY,
      })
    );
  }

  return client;
}

/**
 * Prisma client instance with environment-aware logging and Optimize extension.
 * Uses singleton pattern to maintain single connection across hot reloads.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

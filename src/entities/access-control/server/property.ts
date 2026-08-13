import { db } from '@api/server';
import { standardSeats } from '@/db/schema/standard-seats';
import { and, eq } from 'drizzle-orm';

/** Resolve the caller's property via standard seat (same pattern as security panic). */
export async function resolveCallerPropertyId(
  tenantId: string,
  userId: string
): Promise<string | null> {
  const [seat] = await db
    .select({ propertyId: standardSeats.propertyId })
    .from(standardSeats)
    .where(and(eq(standardSeats.tenantId, tenantId), eq(standardSeats.userId, userId)))
    .limit(1);
  return seat?.propertyId ?? null;
}

import 'server-only';

import { sql, eq, and } from 'drizzle-orm';
import { db, disputeCases } from '@api/server';

/**
 * Generate a dispute reference number in DSP-YYYY-NNNN format.
 * Format: DSP-{year}-{sequence padded to 4 digits}
 *
 * Sequence is per-tenant per-year, starting at 1.
 */
export async function generateDisputeReference(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(disputeCases)
    .where(
      and(
        eq(disputeCases.tenantId, tenantId),
        sql`extract(year from ${disputeCases.createdAt}) = ${year}`
      )
    );

  const seq = (row?.count ?? 0) + 1;
  const paddedSeq = String(seq).padStart(4, '0');

  return `DSP-${year}-${paddedSeq}`;
}

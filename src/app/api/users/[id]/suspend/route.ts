import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, users, platformSuspensions } from '@api/db';
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { requireAssistScope } from '@entities/tenant/api/assist-scope-guard';

export const maxDuration = 8;

const VALID_SUSPENSION_TYPES = [
  'VIOLATION',
  'DISRUPTION',
  'BEHAVIOR',
  'PROPERTY',
  'NON_PAYMENT',
  'OTHER',
] as const;

type SuspensionType = (typeof VALID_SUSPENSION_TYPES)[number];

interface SuspendBody {
  suspensionType: SuspensionType;
  reason: string;
  description?: string;
  endDate?: string | null;
}

/**
 * POST /api/users/[id]/suspend - Create a timed or permanent suspension for a user.
 * Deactivates the user account and records the suspension reason.
 * Only ADMIN/MANAGER roles with 'users' permission can suspend.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId } = await withTenant();

  // AssistSession scope guard: metadata-scoped staff cannot suspend users
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  // Authentication: verify session and check admin permission
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [adminUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const adminRole = adminUser?.role || 'RESIDENT';
  if (!hasPermission(adminRole, 'users')) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  // Verify target user exists within the same tenant
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Parse and validate request body
  const body: SuspendBody = await request.json();

  // Validate suspensionType
  if (!VALID_SUSPENSION_TYPES.includes(body.suspensionType as SuspensionType)) {
    return NextResponse.json(
      { error: 'Invalid suspension type. Must be one of: ' + VALID_SUSPENSION_TYPES.join(', ') },
      { status: 400 }
    );
  }

  // Validate reason
  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 3) {
    return NextResponse.json(
      { error: 'Reason is required and must be at least 3 characters' },
      { status: 400 }
    );
  }

  // Check if user already has an active suspension
  const [existingSuspension] = await db
    .select({
      id: platformSuspensions.id,
      suspensionType: platformSuspensions.suspensionType,
      reason: platformSuspensions.reason,
      startDate: platformSuspensions.startDate,
      endDate: platformSuspensions.endDate,
      isPermanent: platformSuspensions.isPermanent,
    })
    .from(platformSuspensions)
    .where(and(eq(platformSuspensions.userId, id), eq(platformSuspensions.isActive, true)))
    .limit(1);

  if (existingSuspension) {
    return NextResponse.json(
      {
        error: 'User already has an active suspension',
        existingSuspension,
      },
      { status: 409 }
    );
  }

  // Create suspension record + deactivate user atomically
  const suspensionId = crypto.randomUUID();
  const parsedEndDate = body.endDate ? new Date(body.endDate) : null;
  const isPermanent = !body.endDate;

  const result = await db.transaction(async tx => {
    const [suspension] = await tx
      .insert(platformSuspensions)
      .values({
        id: suspensionId,
        tenantId,
        userId: id,
        suspensionType: body.suspensionType,
        reason: body.reason.trim(),
        description: body.description || null,
        startDate: new Date(),
        endDate: parsedEndDate,
        isPermanent,
        isActive: true,
        createdById: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await tx.update(users).set({ isActive: false }).where(eq(users.id, id));

    return suspension;
  });

  return NextResponse.json(result, { status: 201 });
}

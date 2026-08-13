import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, apiInternalError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { securityContacts } from '@/db/schema/security-contacts';
import { securityContactSchema } from '@entities/security';
import { clearDefaultSecurityContact } from '@entities/security/server';
import { createId } from '@shared/lib/id';
import { createComponentLogger } from '@shared/lib';
import { asc, eq } from 'drizzle-orm';

export const maxDuration = 8;

const log = createComponentLogger('admin-security-contacts-api');

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();

  const rows = await db
    .select()
    .from(securityContacts)
    .where(eq(securityContacts.tenantId, tenantId))
    .orderBy(asc(securityContacts.isDefaultCallTarget), asc(securityContacts.label));

  return apiSuccess({ contacts: rows });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const body = await request.json();
  const parsed = securityContactSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid contact payload', 400, parsed.error.flatten());
  }

  const id = createId();
  const now = new Date();
  const { label, phone, contactType, isDefaultCallTarget } = parsed.data;

  try {
    if (isDefaultCallTarget) {
      await clearDefaultSecurityContact(tenantId);
    }

    await db.insert(securityContacts).values({
      id,
      tenantId,
      label: label.trim(),
      phone: phone.trim(),
      contactType,
      isDefaultCallTarget: isDefaultCallTarget ?? false,
      createdByUserId: auth.data.userId,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    log.error({ operation: 'POST' }, 'Failed to create security contact', error);
    return apiInternalError('Failed to create security contact');
  }

  const [created] = await db
    .select()
    .from(securityContacts)
    .where(eq(securityContacts.id, id))
    .limit(1);
  return apiSuccess(created, undefined, 201);
});

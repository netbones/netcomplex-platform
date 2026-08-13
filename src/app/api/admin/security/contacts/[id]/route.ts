import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, apiInternalError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { securityContacts } from '@/db/schema/security-contacts';
import { securityContactSchema } from '@entities/security';
import { clearDefaultSecurityContact, setDefaultSecurityContact } from '@entities/security/server';
import { createComponentLogger } from '@shared/lib';
import { and, eq } from 'drizzle-orm';

export const maxDuration = 8;

const log = createComponentLogger('admin-security-contacts-id-api');

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function loadContact(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(securityContacts)
    .where(and(eq(securityContacts.id, id), eq(securityContacts.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}

export const GET = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { id } = await context.params;
  const { tenantId } = await withTenant();
  const row = await loadContact(tenantId, id);
  if (!row) return apiError('NOT_FOUND', 'Contact not found', 404);
  return apiSuccess(row);
});

export const PATCH = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { id } = await context.params;
  const { tenantId } = await withTenant();
  const existing = await loadContact(tenantId, id);
  if (!existing) return apiError('NOT_FOUND', 'Contact not found', 404);

  const body = await request.json();

  if (body && typeof body === 'object' && body.setDefault === true) {
    await setDefaultSecurityContact(tenantId, id);
    const updated = await loadContact(tenantId, id);
    return apiSuccess(updated);
  }

  const parsed = securityContactSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid contact payload', 400, parsed.error.flatten());
  }

  const now = new Date();
  const { label, phone, contactType, isDefaultCallTarget } = parsed.data;

  try {
    if (isDefaultCallTarget) {
      await clearDefaultSecurityContact(tenantId, id);
    }

    await db
      .update(securityContacts)
      .set({
        label: label.trim(),
        phone: phone.trim(),
        contactType,
        isDefaultCallTarget: isDefaultCallTarget ?? existing.isDefaultCallTarget,
        updatedAt: now,
      })
      .where(and(eq(securityContacts.id, id), eq(securityContacts.tenantId, tenantId)));
  } catch (error) {
    log.error({ operation: 'PATCH', id }, 'Failed to update security contact', error);
    return apiInternalError('Failed to update security contact');
  }

  const updated = await loadContact(tenantId, id);
  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { id } = await context.params;
  const { tenantId } = await withTenant();
  const existing = await loadContact(tenantId, id);
  if (!existing) return apiError('NOT_FOUND', 'Contact not found', 404);

  if (existing.isDefaultCallTarget) {
    return apiError('CONFLICT', 'Set another contact as default before deleting this one.', 409);
  }

  await db
    .delete(securityContacts)
    .where(and(eq(securityContacts.id, id), eq(securityContacts.tenantId, tenantId)));

  return apiSuccess({ success: true });
});

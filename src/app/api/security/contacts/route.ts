import { db, apiSuccess, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { securityContacts } from '@/db/schema/security-contacts';
import { eq, asc } from 'drizzle-orm';

export const maxDuration = 8;

/** GET /api/security/contacts — resident-readable contact list + default target */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();

  const rows = await db
    .select({
      id: securityContacts.id,
      label: securityContacts.label,
      phone: securityContacts.phone,
      contactType: securityContacts.contactType,
      isDefaultCallTarget: securityContacts.isDefaultCallTarget,
    })
    .from(securityContacts)
    .where(eq(securityContacts.tenantId, tenantId))
    .orderBy(asc(securityContacts.isDefaultCallTarget), asc(securityContacts.label));

  const defaultContact = rows.find(r => r.isDefaultCallTarget) ?? null;

  return apiSuccess({ contacts: rows, defaultContact });
});

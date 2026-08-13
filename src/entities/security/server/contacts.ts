import { db } from '@api/server';
import { securityContacts } from '@/db/schema/security-contacts';
import { and, eq } from 'drizzle-orm';

/** Clear default flag on all tenant contacts except optional exclude id. */
export async function clearDefaultSecurityContact(
  tenantId: string,
  exceptId?: string
): Promise<void> {
  const conditions = [
    eq(securityContacts.tenantId, tenantId),
    eq(securityContacts.isDefaultCallTarget, true),
  ];
  const rows = await db
    .select({ id: securityContacts.id })
    .from(securityContacts)
    .where(and(...conditions));

  for (const row of rows) {
    if (exceptId && row.id === exceptId) continue;
    await db
      .update(securityContacts)
      .set({ isDefaultCallTarget: false, updatedAt: new Date() })
      .where(eq(securityContacts.id, row.id));
  }
}

export async function setDefaultSecurityContact(
  tenantId: string,
  contactId: string
): Promise<void> {
  await clearDefaultSecurityContact(tenantId, contactId);
  await db
    .update(securityContacts)
    .set({ isDefaultCallTarget: true, updatedAt: new Date() })
    .where(and(eq(securityContacts.id, contactId), eq(securityContacts.tenantId, tenantId)));
}

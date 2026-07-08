import { db, notDeleted, now } from '@api/server';
import { bursaries } from '@schema/bursaries';
import { bursaryFields } from '@schema/bursary-fields';
import { eq, desc, and } from 'drizzle-orm';
import { createId } from '@shared/lib/id';
import type { BursaryCreateData, BursaryUpdateData, BursaryFieldData } from '../schema';

export async function listBursaryFields(tenantId: string) {
  return db
    .select()
    .from(bursaryFields)
    .where(and(eq(bursaryFields.tenantId, tenantId), notDeleted(bursaryFields)))
    .orderBy(bursaryFields.label);
}

export async function getBursaryField(id: string) {
  const [row] = await db.select().from(bursaryFields).where(eq(bursaryFields.id, id)).limit(1);
  return row ?? null;
}

export async function createBursaryField(
  tenantId: string,
  data: Omit<BursaryFieldData, 'id' | 'tenantId'>
) {
  const id = createId();
  const ts = now();
  await db.insert(bursaryFields).values({
    id,
    tenantId,
    value: data.value,
    label: data.label,
    description: data.description ?? null,
    isActive: data.isActive ?? true,
    createdAt: ts,
    deletedAt: null,
  });
  return getBursaryField(id);
}

export async function updateBursaryField(id: string, data: Partial<BursaryFieldData>) {
  await db
    .update(bursaryFields)
    .set({
      value: data.value,
      label: data.label,
      description: data.description,
      isActive: data.isActive,
    })
    .where(eq(bursaryFields.id, id));
  return getBursaryField(id);
}

export async function softDeleteBursaryField(id: string) {
  await db
    .update(bursaryFields)
    .set({ deletedAt: now(), isActive: false })
    .where(eq(bursaryFields.id, id));
}

export async function listBursaries(tenantId: string) {
  return db
    .select()
    .from(bursaries)
    .where(and(eq(bursaries.tenantId, tenantId), notDeleted(bursaries)))
    .orderBy(desc(bursaries.deadline));
}

export async function getBursary(id: string) {
  const [row] = await db.select().from(bursaries).where(eq(bursaries.id, id)).limit(1);
  return row ?? null;
}

export async function createBursary(tenantId: string, data: BursaryCreateData) {
  const id = createId();
  const ts = now();
  await db.insert(bursaries).values({
    id,
    tenantId,
    title: data.title,
    funder: data.funder,
    fieldId: data.fieldId,
    amount: data.amount,
    description: data.description,
    applyUrl: data.applyUrl ?? null,
    deadline: new Date(data.deadline),
    status: data.status ?? 'DRAFT',
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });
  return getBursary(id);
}

export async function updateBursary(data: BursaryUpdateData) {
  const ts = now();
  const updateData: Record<string, unknown> = { updatedAt: ts };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.funder !== undefined) updateData.funder = data.funder;
  if (data.fieldId !== undefined) updateData.fieldId = data.fieldId;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.applyUrl !== undefined) updateData.applyUrl = data.applyUrl;
  if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
  if (data.status !== undefined) updateData.status = data.status;
  await db.update(bursaries).set(updateData).where(eq(bursaries.id, data.id));
  return getBursary(data.id);
}

export async function softDeleteBursary(id: string) {
  await db.update(bursaries).set({ deletedAt: now() }).where(eq(bursaries.id, id));
}

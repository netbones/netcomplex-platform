import { z } from 'zod';
import {
  router,
  protectedProcedure,
  adminProcedure,
  db,
  maintenanceRequests,
  maintenanceTeams,
  maintenanceCategories,
  serviceProviders,
  requestNotes,
  requestHistories,
  internalMaintenanceNotes,
  users,
  properties,
  revalidateDashboard,
  notDeleted,
  now,
  auth,
  emitEvent,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, desc, asc, isNull, sql } from 'drizzle-orm';

import {
  listMaintenanceRequests,
  createMaintenanceRequest,
  buildMaintenanceConditions,
  toMaintenanceRequestViewList,
} from '@entities/maintenance/server';
import { createId } from '@shared/lib/id';

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const RequestIdInput = z.object({ id: z.string() });

const RequestStatusEnum = z.enum([
  'SUBMITTED',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
]);

const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']);

const ListRequestsInput = z
  .object({
    status: z.string().optional(),
    priority: z.string().optional(),
    category: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    scope: z.enum(['mine', 'all', 'community']).optional().default('all'),
  })
  .optional();

const CreateRequestInput = z.object({
  propertyId: z.string().optional(),
  category: z.string().min(1),
  priority: PriorityEnum,
  description: z.string().min(10).max(2000),
  images: z.array(z.string()).optional().default([]),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
});

const UpdateRequestInput = z.object({
  id: z.string(),
  status: RequestStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  description: z.string().min(10).max(2000).optional(),
  assignedTo: z.string().optional(),
  vendor: z.string().optional(),
  scheduledDate: z.string().optional(),
  estimatedCost: z.string().optional(),
  actualCost: z.string().optional(),
  resolution: z.string().optional(),
  assignedTeamId: z.string().optional(),
  assignedProviderId: z.string().optional(),
});

const CreateNoteInput = z.object({
  requestId: z.string(),
  content: z.string().min(1).max(2000),
  isInternal: z.boolean().optional().default(true),
});

const AssignRequestInput = z.object({
  requestId: z.string(),
  teamId: z.string().optional(),
  providerId: z.string().optional(),
});

const CategoryInput = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
});

const UpdateCategoryInput = z.object({
  id: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const ProviderInput = z.object({
  companyName: z.string().min(1),
  trade: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

const UpdateProviderInput = z.object({
  id: z.string(),
  companyName: z.string().optional(),
  trade: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  isActive: z.boolean().optional(),
});

const TeamInput = z.object({
  name: z.string().min(1),
  trade: z.string().min(1),
  contactName: z.string().optional(),
});

const UpdateTeamInput = z.object({
  id: z.string(),
  name: z.string().optional(),
  trade: z.string().optional(),
  contactName: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ──────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────

/** Verify a maintenance request exists in the user's tenant */
async function getTenantRequest(requestId: string, tenantId: string) {
  const [req] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, requestId), eq(maintenanceRequests.tenantId, tenantId)));
  if (!req) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Maintenance request not found' });
  }
  return req;
}

/** Check admin has the 'requests' permission */
function requireRequestsPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'requests')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

/** Map changed fields on a request update to history entries */
function safeString(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

async function trackRequestChanges(
  requestId: string,
  userId: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
) {
  const changes: Array<{
    id: string;
    requestId: string;
    userId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: Date;
  }> = [];

  for (const [key, newVal] of Object.entries(newValues)) {
    if (newVal === undefined) continue;
    const oldVal = oldValues[key];
    const oldStr = safeString(oldVal);
    const newStr = safeString(newVal);
    if (oldStr !== newStr) {
      changes.push({
        id: createId(),
        requestId,
        userId,
        field: key,
        oldValue: oldStr,
        newValue: newStr,
        createdAt: new Date(),
      });
    }
  }

  if (changes.length > 0) {
    await db.insert(requestHistories).values(changes);
  }
}

export {
  z,
  router,
  protectedProcedure,
  adminProcedure,
  db,
  maintenanceRequests,
  maintenanceTeams,
  maintenanceCategories,
  serviceProviders,
  requestNotes,
  requestHistories,
  internalMaintenanceNotes,
  users,
  properties,
  revalidateDashboard,
  notDeleted,
  now,
  auth,
  emitEvent,
  TRPCError,
  hasPermission,
  eq,
  and,
  desc,
  asc,
  isNull,
  sql,
  listMaintenanceRequests,
  createMaintenanceRequest,
  buildMaintenanceConditions,
  toMaintenanceRequestViewList,
  RequestIdInput,
  RequestStatusEnum,
  PriorityEnum,
  ListRequestsInput,
  CreateRequestInput,
  UpdateRequestInput,
  CreateNoteInput,
  AssignRequestInput,
  CategoryInput,
  UpdateCategoryInput,
  ProviderInput,
  UpdateProviderInput,
  TeamInput,
  UpdateTeamInput,
  getTenantRequest,
  requireRequestsPermission,
  trackRequestChanges,
};

import { z } from 'zod';
import {
  db,
  propertyJoinRequests,
  vehicles,
  apiError,
  apiCreated,
  apiForbidden,
  apiConflict,
  rateLimitByIP,
  verifyTurnstile,
  now,
  withErrorHandler,
} from '@api/server';
import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const vehicleSchema = z.object({
  make: z.string().trim().max(100).optional().or(z.literal('')),
  model: z.string().trim().max(100).optional().or(z.literal('')),
  color: z.string().trim().max(50).optional().or(z.literal('')),
  registration: z.string().trim().min(1).max(50),
});

const joinRequestSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1).optional().nullable(),
  propertyNumberRaw: z.string().trim().min(1).max(100),
  relationshipType: z.enum(['OWNER_RESIDENT', 'OWNER_LEASING', 'TENANT_RENTER', 'ADDITIONAL_USER']),
  requestedName: z.string().trim().min(1).max(200),
  requestedSurname: z.string().trim().max(200).optional().or(z.literal('')),
  requestedEmail: z.string().email().max(200),
  requestedPhone: z.string().trim().max(50).optional().or(z.literal('')),
  rulesAcceptedAt: z.string().optional(),
  turnstileToken: z.string().optional(),
  website: z.string().optional(),
  vehicles: z.array(vehicleSchema).max(10).default([]),
});

export const POST = withErrorHandler(async (request: Request) => {
  // Rate limit: 5 join-request submissions per hour per IP.
  const rateLimit = await rateLimitByIP(request, { windowMs: 3600_000, maxRequests: 5 });
  if (rateLimit) return rateLimit;

  const body = await request.json().catch(() => null);
  if (!body) return apiError('VALIDATION_ERROR', 'Invalid JSON', 400);

  // Honeypot: bots fill the hidden `website` field.
  if (body.website && String(body.website).length > 0) {
    return apiCreated({ success: true });
  }

  const parsed = joinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid join request', 400, parsed.error.flatten());
  }

  const input = parsed.data;

  // Turnstile bot check (skips when not configured, matching signup route).
  const human = await verifyTurnstile(input.turnstileToken ?? '');
  if (!human) {
    return apiForbidden('Bot verification failed. Please try again.');
  }

  // Duplicate pending request for the same email is a hard conflict.
  const [existing] = await db
    .select({ id: propertyJoinRequests.id })
    .from(propertyJoinRequests)
    .where(
      and(
        eq(propertyJoinRequests.tenantId, input.tenantId),
        eq(propertyJoinRequests.requestedEmail, input.requestedEmail),
        eq(propertyJoinRequests.status, 'PENDING'),
        isNull(propertyJoinRequests.deletedAt)
      )
    )
    .limit(1);

  if (existing) {
    return apiConflict('A join request for this email is already pending');
  }

  const requestId = createId();
  const timestamp = now();

  await db.insert(propertyJoinRequests).values({
    id: requestId,
    tenantId: input.tenantId,
    propertyId: input.propertyId || null,
    propertyNumberRaw: input.propertyNumberRaw,
    relationshipType: input.relationshipType,
    requestedName: input.requestedName,
    requestedSurname: input.requestedSurname || null,
    requestedEmail: input.requestedEmail,
    requestedPhone: input.requestedPhone || null,
    rulesAcceptedAt: input.rulesAcceptedAt ? new Date(input.rulesAcceptedAt) : null,
    status: 'PENDING',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  if (input.vehicles.length > 0) {
    await db.insert(vehicles).values(
      input.vehicles.map(v => ({
        id: createId(),
        tenantId: input.tenantId,
        joinRequestId: requestId,
        make: v.make || null,
        model: v.model || null,
        color: v.color || null,
        registration: v.registration,
        createdAt: timestamp,
      }))
    );
  }

  return apiCreated({ id: requestId, status: 'PENDING' });
});

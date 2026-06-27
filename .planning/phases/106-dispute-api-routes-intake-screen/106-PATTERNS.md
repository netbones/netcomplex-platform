# Phase 106: Dispute API Routes & Intake Screen — Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 21 (12 created, 9 analogs examined)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File                                | Role                     | Data Flow                           | Closest Analog                                                     | Match Quality |
| ------------------------------------------------ | ------------------------ | ----------------------------------- | ------------------------------------------------------------------ | ------------- |
| `src/app/api/disputes/route.ts`                  | controller/route-handler | CRUD, request-response              | `src/app/api/maintenance/route.ts`                                 | exact         |
| `src/app/api/disputes/[id]/route.ts`             | controller/route-handler | CRUD, request-response              | `src/app/api/maintenance/[id]/route.ts`                            | exact         |
| `src/app/api/disputes/[id]/submit/route.ts`      | controller/route-handler | request-response, status-transition | `src/app/api/maintenance/[id]/route.ts` (PATCH)                    | role-match    |
| `src/app/api/disputes/[id]/messages/route.ts`    | controller/route-handler | CRUD, realtime-broadcast            | `src/app/api/messages/route.ts`                                    | exact         |
| `src/app/api/disputes/[id]/evidence/route.ts`    | controller/route-handler | file-I/O, request-response          | `src/app/api/maintenance/route.ts` (upload pattern via storage.ts) | role-match    |
| `src/app/api/disputes/[id]/assign/route.ts`      | controller/route-handler | request-response, admin-action      | `src/app/api/maintenance/[id]/route.ts` (PATCH)                    | role-match    |
| `src/app/api/disputes/[id]/ruling/route.ts`      | controller/route-handler | request-response, admin-action      | `src/app/api/maintenance/[id]/route.ts` (PATCH)                    | role-match    |
| `src/app/api/disputes/[id]/csos-export/route.ts` | controller/route-handler | request-response, data-export       | `src/app/api/maintenance/[id]/route.ts` (GET)                      | role-match    |
| `src/app/api/disputes/intake-screen/route.ts`    | controller/route-handler | request-response, AI-integration    | `src/app/api/translate/route.ts`                                   | exact         |
| `src/entities/dispute/lib/pii-sanitizer.ts`      | utility                  | transform                           | `src/shared/lib/sanitize/server.ts` (sanitizeHtml)                 | role-match    |
| `src/entities/dispute/index.server.ts`           | barrel/index             | n/a                                 | `src/entities/dispute/index.server.ts` (existing, modifies)        | n/a           |
| `src/app/api/disputes/__tests__/helpers.ts`      | test/helper              | n/a                                 | `src/test/api/helpers.ts`                                          | exact         |
| `src/app/api/disputes/__tests__/*.test.ts`       | test/integration         | n/a                                 | `src/test/api/maintenance.test.ts`                                 | exact         |

---

## Pattern Assignments

### 1. `src/app/api/disputes/route.ts` (controller, CRUD list+create)

**Analog:** `src/app/api/maintenance/route.ts` (lines 1-177)

**Imports pattern** (lines 1-20 of analog):

```typescript
import {
  auth,
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiInternalError,
  apiValidationError,
  revalidateDashboard,
  db,
  emitEvent,
  users,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import {} from /* Zod schema */ '@entities/maintenance';
import { apiLogger } from '@shared/lib';
import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import {} from /* entity service functions */
'@entities/maintenance/server';
```

**Dispute-specific imports to use:**

```typescript
import { disputeCases, disputeEvents } from '@api/server';
import { generateDisputeReference } from '@entities/dispute/server';
import { canTransition } from '@entities/dispute';
import { ALL_DISPUTE_CATEGORIES, ALL_DISPUTE_STATUSES } from '@entities/dispute';
```

**GET handler pattern** (lines 54-112 of analog):

```typescript
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'admin');
  const { searchParams } = new URL(request.url);
  // ... extract query params ...

  const { tenantId } = await withTenant();

  // Delegate to service or inline Drizzle query
  const results = await db
    .select()
    .from(disputeCases)
    .where(and(eq(disputeCases.tenantId, tenantId), isNull(disputeCases.deletedAt)))
    .orderBy(desc(disputeCases.createdAt))
    .limit(20);

  return apiSuccess(results);
}
```

**POST handler pattern** (lines 114-177 of analog):

```typescript
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);
  if (!authData) { return apiUnauthorized(); }

  try {
    const body = await request.json();
    // Validate with Zod
    const validationResult = disputeCreateSchema.safeParse(body);
    if (!validationResult.success) { return apiValidationError(validationResult.error.issues); }

    const { tenantId } = await withTenant();
    // ... create DRAFT with coolingOffEndsAt ...
    const [dispute] = await db.insert(disputeCases).values({...}).returning();
    // Log event
    await db.insert(disputeEvents).values({...});
    return apiCreated(dispute);
  } catch (error) {
    apiLogger.error({ err: error }, 'Dispute creation error');
    return apiInternalError();
  }
}
```

**Error handling pattern** (lines 173-176 of analog):

```typescript
try { ... } catch (error) {
  apiLogger.error({ err: error, path: '/api/disputes' }, 'Dispute creation error');
  return apiInternalError();
}
```

---

### 2. `src/app/api/disputes/[id]/route.ts` (controller, CRUD get+update)

**Analog:** `src/app/api/maintenance/[id]/route.ts` (lines 1-417)

**Imports pattern** (lines 1-22 of analog):

```typescript
import {
  db,
  /* table schemas */,
  auth,
  revalidateDashboard,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  now,
  withErrorHandler,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;
```

**GET with `withErrorHandler` pattern** (lines 59-168 of analog):

```typescript
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Fetch with tenant scoping
    const [row] = await db
      .select()
      .from(disputeCases)
      .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      return apiNotFound('Not found');
    }

    // Access control: party check
    const isParty = row.complainantId === authData.userId || row.respondentId === authData.userId;
    const isModerator =
      hasPermission(authData.role, 'admin') ||
      authData.role === 'BOARD' ||
      authData.role === 'COMMITTEE';
    if (!isParty && !isModerator) {
      return apiForbidden();
    }

    return apiSuccess(row);
  }
);
```

**PATCH with status transitions** (lines 175-388 of analog):

```typescript
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Must be party or moderator
    // ...

    const body = await request.json();
    const [existing] = await db
      .select()
      .from(disputeCases)
      .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)))
      .limit(1);
    if (!existing) {
      return apiNotFound('Not found');
    }

    // Validate status transition with canTransition()
    if (body.status && body.status !== existing.status) {
      if (!canTransition(existing.status, body.status)) {
        return apiConflict(`Cannot transition from ${existing.status} to ${body.status}`);
      }
      // ... update + insert disputeEvents ...
    }

    const ts = now();
    const [updated] = await db
      .update(disputeCases)
      .set({ ...updates, updatedAt: ts })
      .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)))
      .returning();

    return apiSuccess(updated);
  }
);
```

**getSessionAndRole inline pattern** (lines 37-53 of analog):

```typescript
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return null;
  }
  const [userResult] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  return { session, userId: session.user.id, role: userResult?.role || 'RESIDENT' };
}
```

**NOTE:** Prefer importing `getSessionAndRole` from `@api/server` (the consolidated version at `src/shared/api/auth-utils.ts`) which includes suspension checking. Only use the inline pattern if the file structure prevents barrel import.

---

### 3. `src/app/api/disputes/[id]/submit/route.ts` (controller, cooling-off+status transition)

**Analog:** `src/app/api/maintenance/[id]/route.ts` PATCH handler (lines 175-388)

**Key pattern — status transition in transaction** (lines 319-347 of analog):

```typescript
await db.transaction(async tx => {
  await tx
    .update(disputeCases)
    .set({ status: 'SUBMITTED', submittedAt: now, updatedAt: now })
    .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)));
  await tx.insert(disputeEvents).values({
    id: crypto.randomUUID(),
    tenantId,
    disputeId: id,
    actorId: userId,
    eventType: 'SUBMITTED',
    fromStatus: 'DRAFT',
    toStatus: 'SUBMITTED',
  });
});
```

**Cooling-off validation (from RESEARCH.md lines 447-464):**

```typescript
const now = new Date();
if (dispute.coolingOffEndsAt && dispute.coolingOffEndsAt > now) {
  const remainingMs = dispute.coolingOffEndsAt.getTime() - now.getTime();
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  return apiError(
    'COOLING_OFF_ACTIVE',
    `Cooling-off period has not elapsed. ${remainingSeconds}s remaining.`,
    423
  );
}
```

**Note:** The 423 status is not in the standard api-response.ts helpers — use `apiError('COOLING_OFF_ACTIVE', msg, 423)` directly.

---

### 4. `src/app/api/disputes/[id]/messages/route.ts` (controller, CRUD+realtime)

**Analog:** `src/app/api/messages/route.ts` (lines 1-282)

**Imports pattern** (lines 1-33 of analog):

```typescript
import {
  auth,
  db,
  messages,
  users,
  apiCreated,
  apiError,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  now,
  rateLimitByUser,
} from '@api/server';
import { createClient } from '@supabase/supabase-js';
import { eq, and, or, isNull, isNotNull, gt, lt, asc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { sanitizeHtml } from '@/shared/lib/sanitize/server';
import { hasPermission } from '@shared/lib';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**GET with visibility filtering** (lines 74-139 of analog):

```typescript
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const { searchParams } = new URL(request.url);
  const disputeId = searchParams.get('disputeId'); /* or from params */

  const { tenantId } = await withTenant();

  // Verify user is party or moderator
  const isParty =
    dispute.complainantId === authData.userId || dispute.respondentId === authData.userId;
  const isModerator =
    hasPermission(authData.role, 'admin') ||
    authData.role === 'BOARD' ||
    authData.role === 'COMMITTEE';

  const messages = await db
    .select()
    .from(disputeMessages)
    .where(
      and(
        eq(disputeMessages.disputeId, id),
        eq(disputeMessages.tenantId, tenantId),
        isNull(disputeMessages.deletedAt),
        // Visibility rule
        isParty
          ? eq(disputeMessages.isInternal, false) /* no filter for moderator */
          : isModerator
            ? undefined
            : sql`false`
      )
    )
    .orderBy(asc(disputeMessages.createdAt));

  return apiSuccess(messages);
}
```

**POST with Realtime broadcast** (lines 149-250 of analog):

```typescript
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const rateLimit = await rateLimitByUser(authData.userId, { windowMs: 60_000, maxRequests: 30 });
  if (rateLimit) return rateLimit;

  // ... validate body, check tenant isolation, verify participant access ...

  const [newMessage] = await db
    .insert(disputeMessages)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      disputeId: id,
      senderId: authData.userId,
      content: sanitizeHtml(content),
      isInternal: body.isInternal ?? false,
    })
    .returning();

  // Broadcast via Supabase Realtime
  await supabase.channel(`dispute:${id}`).send({
    type: 'broadcast',
    event: 'new-mediation-message',
    payload: newMessage,
  });

  return apiCreated(newMessage);
}
```

**Dispute-specific: `isInternal` enforcement (from RESEARCH.md lines 517-520):**

```typescript
const isInternal = body.isInternal ?? false;
if (isInternal && !isModerator) {
  return apiForbidden('Only moderators can post internal notes');
}
```

---

### 5. `src/app/api/disputes/[id]/evidence/route.ts` (controller, file-I/O)

**Analog:** `src/app/api/maintenance/route.ts` POST pattern + `src/shared/api/storage.ts`

**Storage upload pattern** (src/shared/api/storage.ts lines 57-93):

```typescript
export async function uploadImage(file: File, userId: string): Promise<UploadResult> {
  // Validates file type: ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  // Validates file size: MAX_FILE_SIZE = 2MB
  // S3 key format: `users/${userId}/${uuidv4()}.${ext}`
  // ACL: public-read
  // Returns: { url, key, error? }
}
```

**Route handler structure** — follow maintenance POST pattern (lines 125-177):

```typescript
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const { tenantId } = await withTenant();
  // Verify user is party or moderator
  // ...

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return apiValidationError([{ message: 'File is required' }]);
  }

  const uploadResult = await uploadImage(file, authData.userId);
  if (uploadResult.error) {
    return apiError('UPLOAD_FAILED', uploadResult.error, 400);
  }

  const [evidence] = await db
    .insert(disputeEvidences)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      disputeId: id,
      uploadedBy: authData.userId,
      fileUrl: uploadResult.url,
      fileType: file.type,
      fileName: file.name,
    })
    .returning();

  // Log event
  await db.insert(disputeEvents).values({
    id: crypto.randomUUID(),
    tenantId,
    disputeId: id,
    actorId: authData.userId,
    eventType: 'EVIDENCE_ADDED',
  });

  return apiCreated(evidence);
}
```

**Rate limiting:** Apply `rateLimitByUser` from `@api/server` (as in messages route line 157):

```typescript
const rateLimit = await rateLimitByUser(authData.userId, { windowMs: 60_000, maxRequests: 10 });
if (rateLimit) return rateLimit;
```

---

### 6. `src/app/api/disputes/[id]/assign/route.ts` (controller, admin-action)

**Analog:** `src/app/api/maintenance/[id]/route.ts` PATCH handler (lines 175-388)

**Pattern:** Single-purpose POST instead of PATCH. Follow PATCH guard + update pattern.

**Auth guard** (lines 185-189 of analog):

```typescript
const canViewAll = hasPermission(authData.role, 'requests'); // replace with 'admin'
if (!canViewAll && authData.role !== 'BOARD') {
  return apiForbidden();
}
```

**Atomic update+event in transaction:**

```typescript
await db.transaction(async tx => {
  await tx
    .update(disputeCases)
    .set({ assignedModeratorId: body.moderatorId, updatedAt: now() })
    .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)));
  await tx.insert(disputeEvents).values({
    id: crypto.randomUUID(),
    tenantId,
    disputeId: id,
    actorId: authData.userId,
    eventType: 'ASSIGNED',
    metadata: { assignedModeratorId: body.moderatorId },
  });
});
return apiSuccess({ success: true });
```

---

### 7. `src/app/api/disputes/[id]/ruling/route.ts` (controller, admin-action)

**Analog:** Same as assign — `src/app/api/maintenance/[id]/route.ts` PATCH handler

**Pattern:** Identical to assign. Board/Admin-only POST. Validate input, update dispute, log event.

```typescript
if (authData.role !== 'BOARD' && !hasPermission(authData.role, 'admin')) {
  return apiForbidden();
}
// Validate with Zod: rulingDescription required
// Transition: current status → 'FORMAL_RULING' via canTransition()
// Atomic: UPDATE disputeCases + INSERT disputeEvents (eventType: 'RULING_ISSUED')
```

---

### 8. `src/app/api/disputes/[id]/csos-export/route.ts` (controller, data-export)

**Analog:** `src/app/api/maintenance/[id]/route.ts` GET handler (lines 59-168)

**Pattern:** GET handler with access control. Phase 106 returns JSON event log (not PDF).

**CSOS export structure (from RESEARCH.md line 563):**

```typescript
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const authData = await getSessionAndRole(request);
    if (!authData) { return apiUnauthorized(); }

    // Access: complainant (own) OR BOARD/ADMIN
    const [dispute] = await db.select().from(disputeCases)
      .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId))).limit(1);
    if (!dispute) { return apiNotFound(); }

    const isOwner = dispute.complainantId === authData.userId;
    const isModerator = authData.role === 'BOARD' || hasPermission(authData.role, 'admin');
    if (!isOwner && !isModerator) { return apiForbidden(); }

    // Rate limit: 3 exports/case/day
    const rateLimitKey = `csos-export:${id}:${authData.userId}`;
    const rateLimit = await rateLimitByKey(rateLimitKey, { windowMs: 86_400_000, maxRequests: 3 });
    if (rateLimit) return rateLimit;

    // Fetch events for timeline
    const events = await db.select().from(disputeEvents)
      .where(and(eq(disputeEvents.disputeId, id), eq(disputeEvents.tenantId, tenantId)))
      .orderBy(asc(disputeEvents.createdAt));

    // Fetch evidence
    const evidence = await db.select().from(disputeEvidences)
      .where(and(eq(disputeEvidences.disputeId, id), eq(disputeEvidences.tenantId, tenantId),
        isNull(disputeEvidences.deletedAt)));

    // Log export event
    await db.insert(disputeEvents).values({
      id: crypto.randomUUID(), tenantId, disputeId: id, actorId: authData.userId,
      eventType: 'NOTE_ADDED', metadata: { exportType: 'CSOS', exportedAt: new Date().toISOString() },
    });

    return apiSuccess({
      parties: { complainant: /* masked if anonymous */, respondent: /* ... */ },
      summary: { referenceNumber: dispute.referenceNumber, title: dispute.title, description: dispute.description, status: dispute.status },
      resolutionHistory: events,
      evidence,
      ruling: dispute.rulingDescription ? { description: dispute.rulingDescription, issuedAt: dispute.rulingIssuedAt } : null,
      certification: { exportedAt: new Date().toISOString(), exportedBy: authData.userId },
    });
  }
);
```

---

### 9. `src/app/api/disputes/intake-screen/route.ts` (controller, AI-integration)

**Analog:** `src/app/api/translate/route.ts` (lines 1-159) — **EXACT match**

**Full pattern** (from translate/route.ts):

**Imports** (lines 1-7):

```typescript
import { z } from 'zod';
import { apiError, apiInternalError, apiSuccess, db, getSessionAndRole } from '@api/server';
import { getAiProvider, isAiCapabilityEnabled, checkQuota, recordUsage } from '@api/server';
import type { AiCapabilityKey } from '@entities/tenant/server';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { AI_MODELS, rateLimitByUser } from '@api/server';
```

**Request schema** (lines 9-13 of analog):

```typescript
const intakeScreenSchema = z.object({
  description: z.string().min(1, 'Description is required').max(2000),
  category: z.enum(ALL_DISPUTE_CATEGORIES).optional(),
});
```

**export const maxDuration = 15;** (AI calls need longer timeout — line 22 of analog)

**AI call lifecycle** (lines 24-154 of analog):

```typescript
export async function POST(request: Request) {
  try {
    // 0. Auth
    const auth = await getSessionAndRole(request);
    if (!auth) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    // 1. Rate limit
    const rateLimitResult = await rateLimitByUser(auth.userId, {
      windowMs: 60_000,
      maxRequests: 5,
    });
    if (rateLimitResult) return rateLimitResult;

    // 2. Validate input
    const parsed = intakeScreenSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const { description, category } = parsed.data;
    const { tenantId } = await withTenant();

    // 3. PII sanitization (POPIA)
    const sanitised = sanitizeDescriptionForAI(description); // from pii-sanitizer.ts

    // 4. Capability check
    const capability: AiCapabilityKey = 'ai.disputes.frivolityScreen';
    if (!(await isAiCapabilityEnabled(tenantId, capability))) {
      return apiError('FEATURE_DISABLED', 'AI dispute screening not available', 503);
    }

    // 5. Quota check
    const quota = await checkQuota(tenantId, capability, db);
    if (!quota.allowed) {
      return apiError(
        'FEATURE_DISABLED',
        `AI token quota exhausted. ${quota.remainingTokens} tokens remaining.`,
        429,
        { code: 'AI_QUOTA_EXHAUSTED', remainingTokens: quota.remainingTokens }
      );
    }

    // 6. Get provider
    const provider = await getAiProvider(tenantId);
    if (!provider.isAvailable()) {
      return apiError('FEATURE_DISABLED', 'AI service temporarily unavailable', 503);
    }

    // 7. Call AI
    const start = Date.now();
    let result;
    let success = true;
    let errorCode: string | undefined;
    try {
      result = await provider.complete(sanitised, {
        capability,
        systemPrompt: FRIVOLITY_SCREEN_PROMPT,
        maxTokens: 500,
        jsonMode: true,
      });
    } catch (err) {
      success = false;
      errorCode = err instanceof Error ? err.message.slice(0, 50) : 'UNKNOWN';
      result = { text: '', provider: 'null' as const, tokensUsed: 0 };
    }

    // 8. Record usage (ALWAYS)
    await recordUsage(
      {
        tenantId,
        capability,
        userId: auth.userId,
        provider: result.provider,
        model: result.provider === 'anthropic' ? AI_MODELS.ANTHROPIC : AI_MODELS.OPENAI,
        inputTokens: estimateInputTokens(sanitised),
        outputTokens: result.tokensUsed ?? 0,
        durationMs: Date.now() - start,
        success,
        errorCode,
      },
      db
    );

    // 9. Handle result
    if (!success) {
      return apiError('INTAKE_SCREEN_FAILED', 'AI analysis failed. You may retry.', 502);
    }
    if (!result.text) {
      return apiError('INTAKE_SCREEN_FAILED', 'AI returned empty result', 502);
    }

    // Parse JSON from AI response
    const parsed = JSON.parse(result.text); // validate with zod
    return apiSuccess({ toneScore, likelyFrivolous, suggestedCategory, deEscalationTip }); // never persisted
  } catch (error) {
    logError({ component: 'dispute-intake', operation: 'POST' }, 'Intake screen failed', error);
    return apiInternalError();
  }
}
```

**Token estimator** (lines 157-159 of analog):

```typescript
function estimateInputTokens(text: string): number {
  return Math.ceil(text.length * 0.27 * 1.2); // ~4 chars per token + 20% buffer
}
```

**FRIVOLITY_SCREEN_PROMPT** — define as `const` in file: system prompt instructing AI to output JSON with `toneScore` (0-100), `likelyFrivolous` (boolean), `suggestedCategory` (string matching DisputeCategory), `deEscalationTip` (string).

---

### 10. `src/entities/dispute/lib/pii-sanitizer.ts` (utility, transform)

**Analog:** `src/shared/lib/sanitize/server.ts`

Pattern for a utility module with a single exported function:

```typescript
/**
 * Sanitise dispute description for AI intake (POPIA compliance).
 * Strips surnames and unit numbers before sending to external AI.
 *
 * @param description - Raw dispute description from user input
 * @returns Sanitised description safe for AI processing
 */
export function sanitizeDescriptionForAI(description: string): string {
  let sanitised = description;

  // Pattern 1: Strip unit/house numbers (e.g., "Unit 42", "#180", "House 12", "Apt 3B")
  sanitised = sanitised.replace(
    /\b(Unit|House|Apartment|Suite|Apt|Flat|#)\s*[0-9A-Za-z-]+\b/gi,
    '[ADDRESS]'
  );

  // Pattern 2: Strip common SA surnames (capitalised words after "Mr/Mrs/Ms/Dr" prefixes)
  // Conservative approach — replace anything that looks like a full name
  sanitised = sanitised.replace(/\b(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+[A-Z][a-z]+\b/g, '[NAME]');

  // Pattern 3: Strip phone numbers
  sanitised = sanitised.replace(/\b(?:\+27|0)[0-9]{9}\b/g, '[PHONE]');

  // Pattern 4: Strip email addresses
  sanitised = sanitised.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]');

  return sanitised;
}
```

**Export from** `src/entities/dispute/index.server.ts`:

```typescript
export { sanitizeDescriptionForAI } from './lib/pii-sanitizer';
```

---

### 11. `src/app/api/disputes/__tests__/helpers.ts` (test fixture)

**Analog:** `src/test/api/helpers.ts` (lines 1-104) — **EXACT match**

```typescript
import { vi } from 'vitest';

export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  return new Request(options.url ?? 'http://localhost:3000/api/disputes', {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  const thenable = {
    then: (resolve: (v: unknown[]) => void) => Promise.resolve(result).then(resolve),
    limit: () => thenable,
    orderBy: () => thenable,
    offset: () => thenable,
  };
  chain.where = vi.fn(() => thenable);
  chain.limit = vi.fn(() => thenable);
  chain.orderBy = vi.fn(() => thenable);
  return chain;
}

export function makeInsertChain(result: unknown[]) {
  return { values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve(result)) })) };
}

export function makeUpdateChain(result: unknown[]) {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve(result)) })),
    })),
  };
}
```

**Additional dispute-specific fixtures:**

```typescript
export const MOCK_DISPUTE = {
  id: 'dispute-1',
  tenantId: 'test-tenant-id',
  referenceNumber: 'DSP-2026-0001',
  complainantId: 'user-resident',
  respondentId: null,
  respondentType: 'RESIDENT' as const,
  category: 'NOISE' as const,
  title: 'Loud music at night',
  description: 'The neighbor plays loud music after 10pm.',
  severity: 'MODERATE' as const,
  status: 'DRAFT' as const,
  isConfidential: true,
  coolingOffEndsAt: new Date(Date.now() + 24 * 3600_000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const MOCK_USERS = {
  resident: { userId: 'user-resident', role: 'RESIDENT' },
  board: { userId: 'user-board', role: 'BOARD' },
  admin: { userId: 'user-admin', role: 'ADMIN' },
  committee: { userId: 'user-committee', role: 'COMMITTEE' },
};
```

---

### 12. Test files (`src/app/api/disputes/__tests__/*.test.ts`)

**Analog:** `src/test/api/maintenance.test.ts` (lines 1-340) — **EXACT match**

**Mock infrastructure** (lines 1-160 of analog):

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => {
        if (key === 'x-tenant-id') return 'test-tenant-id';
        if (key === 'x-tenant-slug') return 'test-tenant';
        return null;
      }),
    })
  ),
}));

const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('@api/server', () => ({
  auth: { api: { getSession: () => Promise.resolve(mocks.sessionResult) } },
  db: mocks.dbMock,
  disputeCases: {
    /* column stubs */
  },
  disputeEvents: {
    /* column stubs */
  },
  disputeMessages: {
    /* column stubs */
  },
  disputeEvidences: {
    /* column stubs */
  },
  apiSuccess: vi.fn(
    data =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiCreated: vi.fn(
    data =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiForbidden: vi.fn(
    () =>
      new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiNotFound: vi.fn(
    () =>
      new Response(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiInternalError: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiValidationError: vi.fn(
    details =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiError: vi.fn(
    (code, message, status) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  withErrorHandler: (fn: Function) => fn,
  rateLimitByUser: vi.fn(() => null),
  rateLimitByKey: vi.fn(() => null),
  revalidateDashboard: vi.fn(),
  now: () => new Date(),
  checkQuota: vi.fn(() => Promise.resolve({ allowed: true, remainingTokens: 100000 })),
  getAiProvider: vi.fn(() =>
    Promise.resolve({
      isAvailable: () => true,
      complete: () => Promise.resolve({ text: '{}', provider: 'anthropic', tokensUsed: 50 }),
      name: 'anthropic',
    })
  ),
  isAiCapabilityEnabled: vi.fn(() => Promise.resolve(true)),
  recordUsage: vi.fn(() => Promise.resolve()),
  AI_MODELS: { ANTHROPIC: 'claude-3-haiku-20240307', OPENAI: 'gpt-4o-mini' },
  getSessionAndRole: vi.fn(() =>
    Promise.resolve(
      mocks.sessionResult
        ? {
            session: {
              user: { id: mocks.sessionResult.user.id, email: 'test@test.com', name: 'Test' },
            },
            userId: mocks.sessionResult.user.id,
            role: 'RESIDENT',
            suspension: null,
          }
        : null
    )
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  assertModuleEnabled: vi.fn(() => Promise.resolve()),
}));
```

**Test structure** (lines 165-339 of analog):

```typescript
describe('Dispute API — route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/disputes', () => {
    it('returns 401 without auth', async () => {
      /* ... */
    });
    it('returns list with valid auth', async () => {
      /* ... */
    });
    it('enforces tenant isolation via withTenant', async () => {
      /* ... */
    });
  });

  describe('POST /api/disputes', () => {
    it('returns 401 without auth', async () => {
      /* ... */
    });
    it('returns 422 for invalid input', async () => {
      /* ... */
    });
    it('creates DRAFT with coolingOffEndsAt', async () => {
      /* ... */
    });
  });
});
```

---

## Shared Patterns

### Authentication — `getSessionAndRole`

**Source:** `src/shared/api/auth-utils.ts` (lines 43-68), exported from `@api/server`
**Apply to:** All 9 route handler files

```typescript
import { getSessionAndRole } from '@api/server';
// Returns: { session, userId, role, suspension } | null
```

### Tenant Isolation — `withTenant()`

**Source:** `src/entities/tenant/api/with-tenant.ts` (line 11), exported from `@entities/tenant/server`
**Apply to:** Every route handler

```typescript
import { withTenant } from '@entities/tenant/server';
const { tenantId } = await withTenant();
// MUST be called before any DB query
// Every query MUST include: eq(table.tenantId, tenantId)
```

### Feature Gate — `assertModuleEnabled`

**Source:** `src/entities/tenant/lib/modules/assert-module-enabled.ts` (line 83)
**Apply to:** All dispute route handlers

```typescript
import { assertModuleEnabled } from '@entities/tenant/server';
await assertModuleEnabled(tenantId, 'disputes');
// Throws if disputes module not enabled for tenant
```

### Error Response Envelope

**Source:** `src/shared/api/api-response.ts` (lines 58-86)
**Apply to:** All route handlers

```typescript
// Always use these — never raw Response.json()
apiSuccess(data, meta?, status?, init?)
apiCreated(data)
apiError(code: string, message: string, status: number, details?)
apiValidationError(details?)
apiUnauthorized()     // 401
apiForbidden(msg?)    // 403
apiNotFound(msg?)     // 404
apiConflict(msg?)     // 409
apiInternalError()    // 500
```

### Error Handler Wrapper — `withErrorHandler`

**Source:** `src/shared/api/with-error-handler.ts` (lines 19-33)
**Apply to:** All dynamic-param routes (`/[id]/*`)

```typescript
import { withErrorHandler } from '@api/server';
export const GET = withErrorHandler(async (request, { params }) => { ... });
// Catches thrown ZodErrors → apiValidationError
// Catches all other errors → apiInternalError + logs
```

### Rate Limiting

**Source:** `src/shared/api/rate-limit.ts`, exported from `@api/server`
**Apply to:** Messages (30/min), evidence upload (10/min), intake-screen (5/min), CSOS export (3/day)

```typescript
import { rateLimitByUser, rateLimitByKey } from '@api/server';
// Per-user: rateLimitByUser(userId, { windowMs, maxRequests })
// Per-key: rateLimitByKey(key, { windowMs, maxRequests })
```

### Drizzle Query — Tenant Scoping + Soft Delete

**Source:** RESEARCH.md pattern + all maintenance routes
**Apply to:** All DB queries in dispute routes

```typescript
import { eq, and, isNull, desc } from 'drizzle-orm';
// Always: where(and(eq(table.tenantId, tenantId), isNull(table.deletedAt)))
// IDs: crypto.randomUUID()
// Soft-delete: SET deletedAt = now() — never hard delete
```

### AI Provider Integration

**Source:** `src/app/api/translate/route.ts` (lines 24-154) + `src/shared/api/ai/pool.ts`
**Apply to:** `intake-screen/route.ts`

```typescript
import {
  getAiProvider,
  isAiCapabilityEnabled,
  checkQuota,
  recordUsage,
  AI_MODELS,
} from '@api/server';
// Pattern: checkQuota() → getAiProvider() → provider.complete() → recordUsage() (always)
```

### Transaction — Status Change + Event Audit

**Source:** `src/app/api/maintenance/[id]/route.ts` PATCH handler
**Apply to:** submit, assign, ruling, close/withdraw

```typescript
await db.transaction(async tx => {
  await tx.update(disputeCases).set({ status: newStatus, ... }).where(...);
  await tx.insert(disputeEvents).values({ eventType, fromStatus, toStatus, ... });
});
```

### Realtime Broadcast — Supabase

**Source:** `src/app/api/messages/route.ts` (lines 238-243)
**Apply to:** Messages POST route only

```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
await supabase
  .channel(`dispute:${disputeId}`)
  .send({ type: 'broadcast', event: 'new-mediation-message', payload: newMessage });
```

### PII Sanitization — `sanitizeHtml`

**Source:** `src/shared/lib/sanitize/server.ts` (line 12)
**Apply to:** Messages POST (content sanitization)

```typescript
import { sanitizeHtml } from '@/shared/lib/sanitize/server';
content: sanitizeHtml(content), // applied before DB insert
```

### Logging

**Source:** `src/shared/lib/logger/index.ts` (line 57)
**Apply to:** All route handlers

```typescript
import { createComponentLogger } from '@shared/lib';
const log = createComponentLogger('dispute-api');
// OR use apiLogger directly from '@shared/lib'
import { apiLogger, logError } from '@shared/lib';
```

---

## No Analog Found

All files have close matches in the codebase. No gaps.

## Metadata

**Analog search scope:** `src/app/api/` (maintenance, translate, messages), `src/shared/api/` (server barrel, auth-utils, api-response, storage, rate-limit, with-error-handler), `src/entities/dispute/` (entity layer from Phase 105), `src/shared/lib/` (permissions, sanitize, logger), `src/test/api/` (test patterns)

**Files scanned:** 350+ (analogs: 9 source files extracted, 20+ files checked)

**Pattern extraction date:** 2026-06-26

**Key reference documents:**

- `docs/advisories/ADVISORY-017.md` §10, §12, §13 — Dispute system spec
- `docs/advisories/ADVISORY-017-SUPPLEMENTAL-2.md` §5 — AI pool integration pattern
- `.planning/phases/105-dispute-schema-entity-layer/` — Entity layer output (prerequisite)

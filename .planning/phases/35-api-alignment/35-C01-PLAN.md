---
phase: 35-api-alignment
plan: C01
type: execute
wave: 2
depends_on: ['35-A01']
files_modified:
  - src/app/api/v1/tenant/maintenance/route.ts
  - src/app/api/v1/tenant/bookings/route.ts
  - src/app/api/v1/tenant/events/route.ts
  - src/app/api/v1/tenant/users/route.ts
  - src/app/api/v1/tenant/households/route.ts
  - src/app/api/v1/tenant/announcements/route.ts
  - src/app/api/v1/tenant/content/route.ts
  - src/app/api/v1/tenant/groups/route.ts
  - src/app/api/v1/tenant/messages/route.ts
  - src/app/api/v1/tenant/conversations/route.ts
  - src/app/api/v1/tenant/notifications/route.ts
  - src/app/api/v1/tenant/settings/route.ts
  - src/app/api/v1/tenant/resources/route.ts
  - src/app/api/v1/tenant/competitions/route.ts
  - src/app/api/v1/tenant/surveys/route.ts
  - src/app/api/v1/tenant/invitations/route.ts
  - src/app/api/v1/tenant/community-services/route.ts
  - src/app/api/v1/tenant/community-services/listings/route.ts
  - src/app/api/v1/tenant/community-services/inquiries/route.ts
  - src/app/api/v1/tenant/community-services/reviews/route.ts
  - src/app/api/v1/public/events/route.ts
  - src/app/api/v1/public/content/route.ts
  - src/app/api/v1/public/resources/route.ts
  - src/app/api/v1/public/competitions/route.ts
  - src/app/api/v1/platform/tenants/route.ts
  - src/app/api/v1/platform/onboarding/route.ts
  - src/app/api/v1/system/health/route.ts
  - src/app/api/webhooks/payload/route.ts
  - src/app/api/v1/tenant/pricing/route.ts
  - src/app/api/v1/tenant/campaign/route.ts
  - src/app/api/v1/tenant/conservation/route.ts
  - src/app/api/v1/tenant/agents/route.ts
  - src/middleware.ts
autonomous: true
requirements:
  - API-ROUTE-01

must_haves:
  truths:
    - 'All new API endpoints follow the canonical route structure: /api/v1/{class}/{resource}'
    - 'Existing /api/* routes continue to work (backward compatibility)'
    - 'API routes are classified: public, tenant, platform, system'
    - 'Webhook namespace exists at /api/webhooks/'
  artifacts:
    - path: 'src/app/api/v1/'
      provides: 'Canonical versioned API structure'
    - path: 'src/app/api/webhooks/'
      provides: 'Webhook endpoint namespace'
  key_links:
    - from: 'src/app/api/v1/tenant/*'
      to: 'src/app/api/*'
      via: 'V1 routes delegate to or mirror existing route logic'
    - from: 'src/middleware.ts'
      to: '/api/v1/*'
      via: 'Middleware classifies traffic by route prefix'
---

<objective>
Establish the canonical API route structure per API_ARCHITECTURE.md §10 and API.md §5.

Purpose: All current API routes sit flat at `/api/*` with no classification. The governance model requires:

- `/api/v1/tenant/` — Authenticated tenant-scoped endpoints
- `/api/v1/public/` — Anonymous access endpoints
- `/api/v1/platform/` — Platform admin endpoints
- `/api/v1/system/` — Infrastructure/health endpoints
- `/api/webhooks/` — Webhook receivers

This plan creates the v1 namespace as a forward-looking structure, keeping existing routes working for backward compatibility. New routes should use the canonical structure going forward.

Output: Canonical route structure with v1 namespace, webhook skeleton, backward-compatible legacy routes.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/API.md
@docs/architecture/API_ARCHITECTURE.md
@src/app/api/
@src/middleware.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Create canonical v1 route namespace with classification directories</name>
<files>src/app/api/v1/</files>
<action>
Create the full directory structure under `src/app/api/v1/`:

```
src/app/api/v1/
├── tenant/
│   ├── maintenance/
│   │   └── route.ts
│   ├── bookings/
│   │   └── route.ts
│   ├── events/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── users/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── households/
│   │   └── route.ts
│   ├── announcements/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── content/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── groups/
│   │   ├── route.ts
│   │   ├── [id]/
│   │   │   └── route.ts
│   │   ├── members/
│   │   │   └── route.ts
│   │   └── membership-requests/
│   │       ├── route.ts
│   │       └── [id]/
│   │           └── route.ts
│   ├── conversations/
│   │   ├── route.ts
│   │   └── find/
│   │       └── route.ts
│   ├── messages/
│   │   ├── route.ts
│   │   └── unread/
│   │       └── route.ts
│   ├── notifications/
│   │   └── route.ts
│   ├── settings/
│   │   ├── route.ts
│   │   ├── [key]/
│   │   │   └── route.ts
│   │   └── contact/
│   │       └── route.ts
│   ├── resources/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── competitions/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── surveys/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── invitations/
│   │   ├── route.ts
│   │   ├── [id]/
│   │   │   └── route.ts
│   │   ├── accept/
│   │   │   └── route.ts
│   │   └── validate/
│   │       └── route.ts
│   ├── community-services/
│   │   └── ... (mirror existing structure)
│   ├── pricing/
│   │   └── route.ts
│   ├── campaign/
│   │   └── route.ts
│   ├── conservation/
│   │   └── route.ts
│   └── agents/
│       └── ...
├── public/
│   ├── events/
│   │   └── route.ts
│   ├── content/
│   │   └── route.ts
│   ├── resources/
│   │   └── route.ts
│   └── competitions/
│       └── route.ts
├── platform/
│   ├── tenants/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   └── onboarding/
│       └── route.ts
└── system/
    ├── health/
    │   └── route.ts
    └── flags/
        └── route.ts
```

Each `route.ts` in the v1 tree should:

1. **Re-export from the existing route** for the first version — keeping logic centralized while establishing the canonical path:

```typescript
// Re-export from canonical route location
// This route exists to establish the /api/v1/tenant/ namespace.
// The implementation lives at the flat /api/{resource} path for now.
// During the tRPC migration (Phase B), these routes will become tRPC procedures instead.
export { GET, POST } from '@/app/api/maintenance/route';
```

Use the correct relative import path for each. This keeps logic DRY while establishing the structure.

2. For routes that have both auth-required and public modes (like content, events), the `/api/v1/public/` version exports only the public GET handler:

```typescript
// /api/v1/public/events/route.ts
// Public read-only endpoint for events
export { GET } from '@/app/api/events/route';
```

3. The `/api/v1/system/health/route.ts` can be a dedicated route:

```typescript
import { apiSuccess } from '@shared/api/api-response';

export async function GET() {
  return apiSuccess({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'nodejs',
    version: '1.0.0',
  });
}
```

4. **Create webhook skeleton** at `/api/webhooks/payload/route.ts`:

```typescript
// Webhook endpoint — governed API per API.md §24
// Required protections (future): signed payloads, replay protection, idempotency
import { apiSuccess, apiInternalError } from '@shared/api/api-response';
import { apiLogger } from '@shared/lib';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    apiLogger.info({ webhookBody: body }, 'Webhook received');
    return apiSuccess({ received: true });
  } catch (error) {
    apiLogger.error({ err: error }, 'Webhook processing error');
    return apiInternalError();
  }
}
```

**Do NOT delete or modify any existing flat `/api/*` routes.** This task is purely additive.
</action>
<verify>
<automated>find src/app/api/v1 -name 'route.ts' | wc -l | xargs echo "V1 routes created:"; find src/app/api/webhooks -name 'route.ts' | wc -l | xargs echo "Webhook routes:"</automated>
<manual>Verify `ls src/app/api/v1/tenant/` returns all expected resource directories</manual>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Canonical v1 route structure created with re-exports to existing logic. Webhook skeleton in place.</done>
</task>

<task type="auto">
<name>Task 2: Update middleware to handle v1 route classification</name>
<files>src/middleware.ts</files>
<action>
**This task is OPTIONAL — only if middleware changes are needed.**
Review `src/middleware.ts` to determine if any changes to the x-plane/x-tenant-slug headers are needed for /api/v1/ routes.

Current middleware already handles `/api/*` routes (line 97-117: sets x-plane and x-tenant-slug for API routes). This should work for `/api/v1/tenant/*` and `/api/v1/platform/*` as well since they match `/api/*`.

Add a comment block documenting the canonical route classification:

```typescript
/**
 * Canonical API Route Classification (API.md §4-5):
 *
 * /api/v1/public/*   → No auth required
 * /api/v1/tenant/*   → Authenticated tenant member
 * /api/v1/platform/* → Platform administrator only
 * /api/v1/system/*   → Infrastructure/internal
 * /api/webhooks/*    → Signed webhook payloads
 *
 * Flat /api/* routes are legacy — new routes should use v1 structure.
 * See docs/STEERING/API.md §5 and docs/architecture/API_ARCHITECTURE.md §10
 */
```

Do NOT change any middleware logic — only add the documentation comment.
</action>
<verify>
<automated>grep -q "Canonical API Route Classification" src/middleware.ts && echo "Classification docs added"</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Middleware documents the canonical route classification structure.</done>
</task>

</tasks>

<verification>
1. `find src/app/api/v1 -name 'route.ts'` returns expected count (matching existing domains)
2. `npx tsc --noEmit` passes
3. `curl http://localhost:3000/api/v1/tenant/maintenance` returns same data as `/api/maintenance`
4. `curl http://localhost:3000/api/v1/system/health` returns health status
5. `curl http://localhost:3000/api/webhooks/payload -X POST -d '{}'` returns webhook acknowledgment
</verification>

<success_criteria>

- Canonical v1 route tree created under /api/v1/{public,tenant,platform,system}
- Webhook namespace at /api/webhooks/
- All v1 routes delegate to existing implementation or have their own
- Backward compatibility preserved — flat routes still work
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-C01-SUMMARY.md`
</output>

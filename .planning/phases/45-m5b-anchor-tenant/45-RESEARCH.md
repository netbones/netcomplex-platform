# Phase 45: Anchor Tenant Features — Research

**Researched:** 2026-06-18
**Domain:** Community management platform — authentication, gamification, i18n, rich text
**Confidence:** HIGH

## Summary

Phase 45 ships the 4 launch-blocking features for Soralia Village's 180-home rollout. The system already provides the infrastructure: Better Auth with plugin pattern (Phase 43), Resend email delivery (Phase 10), Drizzle+Prisma dual ORM with soft deletes (Phase 101), `useSafeTranslation` i18n hydration safety (Phase 42), AdminLayer command bar (Phase 34), and TipTap rich text (built-in). Each feature wires into these existing systems rather than building from scratch.

The phase introduces a new `behaviorRecord` table following the Phase 33 `platformSuspension` data model pattern — standalone table with enum, tenant isolation, point tracking, and event-driven auto-escalation. The admin page follows Phase 36's dedicated CRUD page pattern (not an inline widget). i18n batch leverages the Phase 42 `useSafeTranslation` hook pattern to convert 25+ widgets from raw `useTranslation` to hydration-safe translations.

**Primary recommendation:** Wire emailOTP first (lowest risk, reuses existing Resend infra), then build the behaviorRecord data model + API, then the admin UI + standing badges, then batch i18n migration, and finally Tiptap locale support.

## Architectural Responsibility Map

| Capability                        | Primary Tier       | Secondary Tier  | Rationale                                                                     |
| --------------------------------- | ------------------ | --------------- | ----------------------------------------------------------------------------- |
| OTP password reset                | API / Backend      | Frontend Server | emailOTP plugin + Resend email; client only renders OTP input form            |
| behaviorRecord data model         | Database / Storage | API / Backend   | New Prisma model + Drizzle schema; API handles CRUD                           |
| Standing calculation              | API / Backend      | —               | Server-side point math; no client-side trust                                  |
| Auto-escalation (threshold check) | API / Backend      | —               | Event-driven on infraction create; same pattern as Phase 33 auto-unsuspension |
| Merits admin CRUD page            | Frontend Server    | API / Backend   | Next.js page module + dedicated API routes                                    |
| Standing badge on directory       | Browser / Client   | Frontend Server | UI component reads from user data already fetched                             |
| Standing badge on profile         | Browser / Client   | Frontend Server | UI component on resident profile page                                         |
| i18n widget migration             | Browser / Client   | Frontend Server | Client-side i18n with SSR fallback via useSafeTranslation                     |
| Tiptap locale content             | Browser / Client   | API / Backend   | Editor saves locale-keyed content; existing jsonb content column              |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-02:** Standalone `behaviorRecord` table — clean separation from `platformSuspension` (Phase 33).
- **D-03:** Tier thresholds are hardcoded constants, not per-tenant configurable.
- **D-04:** Standing badge visible on directory cards AND profile page.
- **D-05:** Event-driven escalation — on infraction creation, immediately evaluate if thresholds are crossed.
- **D-06:** Dedicated admin page at `/admin/merits` — full CRUD, not an AdminLayer widget.
- **D-07:** Email-based OTP (6-digit code) via Better Auth `emailOTP` plugin. No authenticator app.
- **D-08:** Plan order: (1) OTP, (2) Community Merits, (3) i18n batch, (4) Tiptap i18n.
- **D-09:** i18n batch prioritizes most visible surfaces: HomeLayer, admin domain grids, navigation.

### the agent's Discretion

- Exact behaviorType enum values, point weights, tier threshold numbers
- Standing badge visual design (color, icon, placement)
- Which specific widgets to migrate first within each visibility tier
- Admin page layout (following Phase 36 pattern)

### Deferred Ideas (OUT OF SCOPE)

- 7-day production soak — separate phase
- Per-tenant configurable tier thresholds — hardcoded for MVP
- Low-visibility i18n widgets — deferred to follow-up

## Phase Requirements

| ID         | Description                                 | Research Support                                                                      |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| (implicit) | OTP password reset via Better Auth emailOTP | §1: emailOTP plugin API, Resend infra, auth.ts plugin array                           |
| (implicit) | behaviorRecord data model                   | §2: schema pattern from platformSuspension, enum pattern, Drizzle+Prisma registration |
| (implicit) | Community Merits admin CRUD page            | §3: Phase 36 page-module pattern, admin nav registration                              |
| (implicit) | Standing badges on directory + profile      | §4: UnifiedResidentCard, resident profile page                                        |
| (implicit) | i18n batch for visible widgets              | §5: useSafeTranslation pattern, 46 widget files, most visible surfaces                |
| (implicit) | Tiptap content localization                 | §6: jsonb locale storage, getLocalizedContent helper                                  |

## Standard Stack

### Core

| Library       | Version          | Purpose                             | Why Standard                                        |
| ------------- | ---------------- | ----------------------------------- | --------------------------------------------------- |
| better-auth   | ^1.5.6 (project) | emailOTP plugin for OTP auth        | Already installed; emailOTP is a first-party plugin |
| drizzle-orm   | ^0.45.2          | behaviorRecord queries              | Project standard for all DB queries                 |
| prisma        | 5.22.0           | schema migration for behaviorRecord | Project standard for schema management              |
| resend        | ^6.12.2          | OTP email delivery                  | Already wired for all transactional emails          |
| react-i18next | ^17.0.0          | i18n framework                      | Already installed; useSafeTranslation wraps it      |
| @tiptap/react | ^3.21.0          | Rich text editor                    | Already installed for content editing               |

### Supporting

| Library         | Version  | Purpose                | When to Use                             |
| --------------- | -------- | ---------------------- | --------------------------------------- |
| zod             | ^3.25.76 | API validation schemas | Admin API validation, OTP verification  |
| react-hook-form | ^7.72.0  | Admin forms            | Merits admin page form                  |
| lucide-react    | ^1.7.0   | Standing badge icons   | Gold/Silver/Bronze/Probation tier icons |

### Alternatives Considered

| Instead of                  | Could Use                  | Tradeoff                                                                         |
| --------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| emailOTP plugin             | Custom OTP via Resend only | emailOTP handles verification state, expiry, rate-limiting; custom = reimplement |
| Custom standing calculation | Separate scoring service   | Simple math fits in Drizzle query; MVP doesn't need a service                    |

## Package Legitimacy Audit

> No new external packages are installed in this phase. All libraries (better-auth, drizzle-orm, prisma, resend, react-i18next, @tiptap/react, zod, react-hook-form, lucide-react) are already in package.json and verified by prior phases.

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious SUS:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Soralia Village App                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐   ┌──────────────────────────────────┐ │
│  │   OTP Reset Flow   │   │   Community Merits System        │ │
│  │                    │   │                                  │ │
│  │  Forget Password   │   │  Admin CRUD (/admin/merits)      │ │
│  │       ↓            │   │       ↓                          │ │
│  │  emailOTP Plugin   │   │  POST /api/merits                │ │
│  │       ↓            │   │       ↓                          │ │
│  │  Resend Email      │   │  behaviorRecord.insert           │ │
│  │       ↓            │   │       ↓                          │ │
│  │  OTP Verification  │   │  checkStanding() threshold eval  │ │
│  │       ↓            │   │       ↓                          │ │
│  │  Password Reset    │   │  Standing badge update           │ │
│  └──────────────────┘   └──────────────────────────────────┘ │
│                                                              │
│  ┌──────────────────┐   ┌──────────────────────────────────┐ │
│  │   i18n Batch       │   │   Tiptap Localization            │ │
│  │                    │   │                                  │ │
│  │  useSafeTranslation│   │  ContentForm + LocaleSelector    │ │
│  │  + tx(key,fallback)│   │       ↓                          │ │
│  │       ↓            │   │  Save: content[locale] = html    │ │
│  │  Widget files      │   │       ↓                          │ │
│  │  (25+ files)       │   │  Load: getLocalizedContent()     │ │
│  └──────────────────┘   └──────────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Existing Infrastructure (read-only for this phase)       ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    ││
│  │  │ Better   │ │ Drizzle  │ │ Resend   │ │ react-   │    ││
│  │  │ Auth     │ │ ORM      │ │ Email    │ │ i18next  │    ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (new files only)

```
src/
├── app/
│   ├── (tenant)/admin/merits/        # Merits admin page (new route)
│   │   ├── page.tsx                  # Merits list page
│   │   ├── [userId]/page.tsx          # User-specific merit entries
│   │   └── new/page.tsx              # Create new behavior entry
│   └── api/merits/                   # Merits API routes (new)
│       ├── route.ts                  # GET list / POST create
│       └── [id]/route.ts            # GET/PATCH/DELETE single entry
├── db/schema/
│   ├── behavior-type-enum.ts         # MERIT | WARNING | INFRACTION
│   ├── behavior-records.ts           # behaviorRecord table
│   └── behavior-records-relations.ts # Drizzle relations
├── page-modules/admin/merits/        # Merits admin page module
│   ├── index.ts
│   └── ui/
│       ├── MeritsListPage.tsx        # List all behavior entries
│       ├── MeritEntryForm.tsx         # Create/edit form
│       └── UserStandingCard.tsx       # Per-user standing summary
├── entities/directory/ui/
│   └── StandingBadge.tsx             # Reusable standing tier badge
└── shared/api/
    └── merits-helpers.ts             # Standing calculation helpers
```

### Pattern 1: Better Auth Plugin Registration (Phase 43 precedent)

**What:** Add emailOTP plugin to the existing plugins array in `src/shared/api/auth.ts`
**When to use:** Adding any Better Auth plugin
**Example:**

```typescript
// Source: Better Auth official docs + existing auth.ts
import { emailOTP } from 'better-auth/plugins';

// In src/shared/api/auth.ts, add to plugins array:
plugins: [
  twoFactor({ issuer: tenantConfig.auth.issuer }),
  organization(),
  bearer(),
  passkey(),
  emailOTP({
    otpLength: 6,               // [ASSUMED] 6-digit code
    expiresIn: 300,             // [ASSUMED] 5 minutes
    async sendVerificationOTP({ email, otp, type }) {
      if (type === 'password-reset') {
        sendEmail({
          to: email,
          subject: templates.passwordReset.subject,
          html: templates.passwordReset.getHtml(otp), // New template or modified
        }).catch(err => authLogger.error({ err, email }, 'OTP email send failed'));
      }
    },
  }),
  validator([...]), // existing
],
```

### Pattern 2: Drizzle Table + Enum — behaviorRecord (Phase 33 precedent)

**What:** New pgTable with pgEnum, following platformSuspension structure
**When to use:** Any new database table
**Example:**

```typescript
// Source: src/db/schema/platform-suspensions.ts (Phase 33 pattern)
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { behaviorTypeEnum } from './behavior-type-enum';

export const behaviorRecords = pgTable('BehaviorRecord', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  behaviorType: behaviorTypeEnum('behaviorType').notNull(),
  reason: text('reason').notNull(),
  description: text('description'),
  points: integer('points').notNull().default(0),
  standingBefore: integer('standingBefore'),
  standingAfter: integer('standingAfter'),
  createdById: text('createdById').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
```

### Pattern 3: Event-Driven Auto-Escalation (Phase 33 precedent)

**What:** On infraction creation, immediately evaluate threshold crossings. No cron job.
**When to use:** Any state transition that depends on accumulated data
**Example:**

```typescript
// Source: Phase 33 auth-utils.ts checkActiveSuspension pattern
// After inserting behaviorRecord:
const standing = await calculateStanding(userId, tenantId);
if (standing < PROBATION_THRESHOLD) {
  // Auto-escalate: flag user, notify admins
}
```

### Pattern 4: Admin Dedicated CRUD Page (Phase 36 precedent)

**What:** Admin page at `/admin/merits`, not an inline widget. Page-module pattern.
**When to use:** Admin features with full CRUD surface
**Example:**

```typescript
// Source: src/page-modules/admin/surveys/ui/SurveysListPage.tsx
// Page at src/app/(tenant)/admin/merits/page.tsx:
import { MeritsListPage } from '@pages/admin';
export default function Page() { return <MeritsListPage />; }
```

### Pattern 5: useSafeTranslation Migration (Phase 42 precedent)

**What:** Replace `useTranslation` with `useSafeTranslation`, replace `t('key')` with `tx('key', 'fallback')`
**When to use:** Any client component rendered during SSR hydration
**Example:**

```typescript
// Source: src/shared/lib/hooks/useSafeTranslation.ts (Phase 42)
// Before:
const { t } = useTranslation('dashboard');
// After:
const { tx } = useSafeTranslation('dashboard');
// Usage: tx('widget.title', 'My Widget') instead of t('widget.title')
```

### Anti-Patterns to Avoid

- **Inline admin widget for merits:** Too much surface area; dedicated page per D-06
- **Cron job for escalation:** Phase 33 pattern of event-driven check is proven; cron adds complexity
- **Per-tenant tier configuration:** Hardcoded per D-03; don't read from settings
- **New email provider:** Use existing Resend infrastructure; don't add MailerSend
- **Direct useTranslation in new code:** Always use useSafeTranslation with tx() fallback

## Don't Hand-Roll

| Problem                              | Don't Build                  | Use Instead                                             | Why                                                         |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| OTP generation + verification        | Custom OTP service           | better-auth emailOTP plugin                             | Handles generation, storage, expiry, rate-limiting          |
| Standing recalculation on every read | Denormalized standing column | Server-side calculateStanding() on-demand               | Avoids stale data; always reflects current behavior records |
| Admin form validation                | Custom validation            | zod + react-hook-form (already installed)               | Consistent with all other admin forms                       |
| Tier badge component from scratch    | Custom badge                 | Reuse CARD_HEADER_COLORS constants + lucide-react icons | Consistent with UnifiedResidentCard design system           |

## Environment Availability

| Dependency  | Required By        | Available | Version  | Fallback |
| ----------- | ------------------ | --------- | -------- | -------- |
| Node.js     | Build/runtime      | ✓         | 20+      | —        |
| pnpm        | Package management | ✓         | 10.33.0  | —        |
| PostgreSQL  | Database           | ✓         | Supabase | —        |
| Resend API  | OTP email delivery | ✓         | ^6.12.2  | —        |
| better-auth | emailOTP plugin    | ✓         | ^1.5.6   | —        |

**Missing dependencies with no fallback:** none — all dependencies already installed.
**Missing dependencies with fallback:** none.

## Common Pitfalls

### Pitfall 1: emailOTP Plugin Conflict with Existing Password Reset

**What goes wrong:** Better Auth's existing `emailAndPassword.sendResetPassword` fires in parallel with emailOTP's `sendVerificationOTP`, sending two emails.
**Why it happens:** Both systems handle password reset flows.
**How to avoid:** When emailOTP plugin is active, the existing token-based `sendResetPassword` may need to be disabled or the flow adjusted. Check Better Auth docs for conflict behavior.
**Warning signs:** Users receive two different emails for one password reset request.

### Pitfall 2: behaviorRecord Points Not in Transaction

**What goes wrong:** Standing is calculated before the behaviorRecord insert commits, or the insert succeeds but the standing update fails.
**Why it happens:** Standing calculation may read stale data or fail silently.
**How to avoid:** Wrap both insert and standing recalculation in a Drizzle transaction (`db.transaction(async tx => {...})`), same as Phase 33's suspend route.
**Warning signs:** behaviorRecord has a standing value that doesn't match the actual point total.

### Pitfall 3: useSafeTranslation Missing Fallback Strings

**What goes wrong:** Widgets render translation keys (e.g., `dashboard.title`) instead of readable text during SSR.
**Why it happens:** `tx()` requires a fallback string; using `t()` directly causes hydration mismatch.
**How to avoid:** Every `tx('key', 'fallback')` call must have a meaningful English fallback. Audit migrated widgets for any remaining `t()` calls.
**Warning signs:** Browser console shows "Text content did not match" React hydration warnings.

### Pitfall 4: Tiptap Locale Content Key Mismatch

**What goes wrong:** Content saved under one locale key is retrieved under a different key, showing empty or wrong-language content.
**Why it happens:** The locale selector value and the jsonb key don't align (e.g., UI shows 'en' but saves under 'en-US').
**How to avoid:** Use the existing `supportedLanguages` constant ('en', 'af', 'xh', 'zu') consistently. Validate locale against the const array before saving.
**Warning signs:** Content editor appears empty after locale switch; console shows locale mismatch.

### Pitfall 5: Admin Navigation Registration Missing

**What goes wrong:** Merits admin page exists but is unreachable from the admin interface.
**Why it happens:** The route is created but ADMIN_ITEMS in navigation-config.ts is not updated.
**How to avoid:** Add merits entry to `ADMIN_ITEMS` in `src/entities/tenant/lib/navigation-config.ts` AND to `ADMIN_DOMAINS` in `src/widgets/dashboard/model/spaces.ts`.
**Warning signs:** `/admin/merits` returns 200 but no link exists in admin sidebar or AdminLayer.

## Code Examples

### Creating behaviorRecord with Standing Calculation

```typescript
// Source: Phase 33 suspend route pattern (src/app/api/users/[id]/suspend/route.ts)
// Adapted for behaviorRecord
export async function POST(request: Request) {
  const { tenantId } = await withTenant();
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();
  if (!hasPermission(authData.role, 'users')) return apiForbidden();

  const body = await request.json();
  const entryId = crypto.randomUUID();

  const result = await db.transaction(async tx => {
    // Calculate current standing BEFORE insert
    const currentStanding = await calculateStandingForUser(body.userId, tenantId, tx);
    const pointDelta = BEHAVIOR_POINTS[body.behaviorType] || 0;
    const newStanding = currentStanding + pointDelta;

    const [entry] = await tx
      .insert(behaviorRecords)
      .values({
        id: entryId,
        tenantId,
        userId: body.userId,
        behaviorType: body.behaviorType,
        reason: body.reason,
        description: body.description || null,
        points: pointDelta,
        standingBefore: currentStanding,
        standingAfter: newStanding,
        createdById: authData.userId,
        createdAt: new Date(),
      })
      .returning();

    // Auto-escalation check (D-05)
    await checkAndEscalateStanding(body.userId, newStanding, tenantId, tx);

    return entry;
  });

  writeAuditLog({ action: 'BEHAVIOR_RECORD_CREATED', ... });
  return apiCreated(result);
}
```

### Standing Badge Component

```typescript
// Source: UnifiedResidentCard + CARD_HEADER_COLORS pattern
// New file: src/entities/directory/ui/StandingBadge.tsx
export function StandingBadge({ points, size = 'sm' }: { points: number; size?: 'sm' | 'md' }) {
  const tier = getStandingTier(points); // Gold >= 50, Silver >= 20, Bronze >= 0, Probation < 0
  const config = STANDING_TIER_CONFIG[tier]; // { label, color, icon }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-${size === 'md' ? 'sm' : 'xs'} font-medium ${config.color}`}>
      <config.icon className={`w-${size === 'md' ? '4' : '3'} h-${size === 'md' ? '4' : '3'}`} />
      {config.label}
    </span>
  );
}

// Usage in UnifiedResidentCard:
<StandingBadge points={resident.standing ?? 0} />
```

### i18n Widget Migration Pattern

```typescript
// Source: Phase 42 useSafeTranslation pattern
// Before:
import { useTranslation } from 'react-i18next';
// ... const { t } = useTranslation('dashboard');
// ... <h3>{t('widget.title')}</h3>

// After:
import { useSafeTranslation } from '@shared/lib';
// ... const { tx } = useSafeTranslation('dashboard');
// ... <h3>{tx('widget.title', 'Widget Title')}</h3>
```

## State of the Art

| Old Approach                  | Current Approach             | When Changed               | Impact                           |
| ----------------------------- | ---------------------------- | -------------------------- | -------------------------------- |
| Token-based password reset    | emailOTP 6-digit code        | This phase (Plan 45-01)    | Lower friction; no link clicking |
| No resident standing system   | behaviorRecord + tier badges | This phase (Plan 45-02/03) | New engagement feature           |
| Raw useTranslation in widgets | useSafeTranslation + tx()    | This phase (Plan 45-04)    | Eliminates hydration mismatches  |
| Single-locale TipTap content  | Locale-keyed TipTap JSON     | This phase (Plan 45-05)    | 4-locale content editing         |

**Deprecated/outdated:**

- Token-based `sendResetPassword` in auth.ts — may conflict with emailOTP; review and potentially disable

## Assumptions Log

| #   | Claim                                                                                                        | Section | Risk if Wrong                                                    |
| --- | ------------------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------- |
| A1  | emailOTP plugin `sendVerificationOTP` can coexist with existing `sendResetPassword`; only one fires per flow | §1      | Two emails sent per request; confusing UX                        |
| A2  | behaviorType enum values: MERIT (+5 points), WARNING (-2 points), INFRACTION (-10 points)                    | §2      | Wrong point values produce incorrect standing tiers              |
| A3  | Tier thresholds: Gold ≥ 50, Silver ≥ 20, Bronze ≥ 0, Probation < 0                                           | §2      | Too strict/lenient thresholds for 180-home community             |
| A4  | Standing calculation is `SUM(points)` from all non-deleted behaviorRecords                                   | §2      | If points should decay over time, current model is wrong         |
| A5  | Admin merits page reuses 'users' permission from Phase 33 pattern                                            | §3      | Wrong permission gate grants/denies access incorrectly           |
| A6  | 25+ widget files currently use raw `useTranslation` and need migration                                       | §5      | Actual count may differ; some may already use useSafeTranslation |

## Open Questions

1. **emailOTP + existing sendResetPassword conflict behavior**
   - What we know: Both handle password reset. emailOTP uses `type === 'password-reset'` in sendVerificationOTP. Existing `sendResetPassword` uses tokens.
   - What's unclear: Whether Better Auth disables token-based flow when emailOTP is active, or if both fire.
   - Recommendation: Test in dev. If both fire, disable `sendResetPassword` when emailOTP is present. Check Better Auth docs — the emailOTP plugin docs mention `type === 'password-reset'` as a supported flow, suggesting it replaces the token-based approach.

2. **Standing tier threshold values (Gold/Silver/Bronze/Probation)**
   - What we know: D-03 says hardcoded constants. Exact numbers not specified.
   - What's unclear: What point thresholds make sense for a 180-home community.
   - Recommendation: Start with Gold ≥ 50, Silver ≥ 20, Bronze ≥ 0, Probation < 0. These are easily adjusted constants. Flag for user confirmation in discuss-phase.

3. **Behavior point values per type**
   - What we know: MERIT adds points, WARNING/INFRACTION subtract.
   - What's unclear: Exact point values and whether infractions from different severity levels exist.
   - Recommendation: Start simple with 3 types (MERIT +5, WARNING -2, INFRACTION -10). Can add severity subtypes later.

4. **Merits admin page permission model**
   - What we know: Phase 33 suspend uses `hasPermission(role, 'users')`. Phase 36 surveys use `hasPermission(role, 'content')`.
   - What's unclear: Whether merits should gate on 'users' permission (same as suspension) or a new 'merits' permission.
   - Recommendation: Gate on 'users' permission initially (same admin users who can suspend). If finer-grained access needed, add 'merits' permission later.

5. **Tiptap locale switching behavior**
   - What we know: Content model uses jsonb with locale keys. `defaultLocale` field exists. RichTextEditor accepts `content: string` and `onChange: (html: string) => void`.
   - What's unclear: Whether the editor should auto-switch content when locale changes (losing unsaved changes) or require explicit save-per-locale.
   - Recommendation: Per-locale save with locale selector that warns on unsaved changes. Follow existing ContentForm locale pattern.

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                      |
| --------------------- | ------- | ----------------------------------------------------- |
| V2 Authentication     | yes     | better-auth emailOTP plugin (OTP verification)        |
| V3 Session Management | no      | (unchanged — existing Better Auth sessions)           |
| V4 Access Control     | yes     | requirePermission('users') guard on merits API routes |
| V5 Input Validation   | yes     | zod schemas for behaviorRecord body, OTP code         |
| V6 Cryptography       | no      | (OTP is short-lived plaintext code; no crypto needed) |

### Known Threat Patterns for this stack

| Pattern                                           | STRIDE                 | Standard Mitigation                                                       |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| OTP brute-force                                   | Elevation of Privilege | emailOTP plugin handles rate-limiting; expiresIn=300 limits window        |
| Malicious admin assigns excessive negative points | Tampering              | Audit log on every behaviorRecord creation; standingBefore/after recorded |
| Standing check read-before-write race             | Tampering              | Drizzle transaction wraps insert + standing recalculation                 |
| XSS in TipTap content                             | Information Disclosure | dompurify (already used in RichTextRenderer) sanitizes rendered content   |

## Sources

### Primary (HIGH confidence)

- `src/shared/api/auth.ts` — Better Auth configuration: existing plugins, email wiring, Resend integration [CODEBASE]
- `src/db/schema/platform-suspensions.ts` — Drizzle table pattern for behaviorRecord [CODEBASE]
- `src/db/schema/suspension-type-enum.ts` — pgEnum pattern [CODEBASE]
- `src/app/api/users/[id]/suspend/route.ts` — Phase 33 admin CRUD pattern with transaction + audit log [CODEBASE]
- `src/shared/api/auth-utils.ts` — checkActiveSuspension auto-unsuspension pattern (precedent for auto-escalation) [CODEBASE]
- `src/shared/lib/hooks/useSafeTranslation.ts` — i18n hydration-safe hook [CODEBASE]
- `src/page-modules/admin/surveys/` — Phase 36 dedicated admin CRUD page pattern [CODEBASE]
- `src/entities/directory/ui/UnifiedResidentCard.tsx` — Directory card where standing badge renders [CODEBASE]
- `src/app/resident/[id]/page.tsx` — Profile page where standing detail renders [CODEBASE]
- [Context7: /better-auth/better-auth] — emailOTP plugin API: `sendVerificationOTP({ email, otp, type })`, options: `otpLength`, `expiresIn`, `resendStrategy` [VERIFIED: Context7 official docs]
- `src/shared/api/email/resend.ts` — Resend email client (project uses Resend, not MailerSend) [CODEBASE]

### Secondary (MEDIUM confidence)

- `src/entities/content/schema.ts` — localeContentSchema pattern for jsonb locale storage [CODEBASE]
- `src/shared/lib/i18n/config.ts` — supportedLanguages, getLocalizedContent helper [CODEBASE]
- `src/entities/tenant/lib/navigation-config.ts` — ADMIN_ITEMS where merits entry goes [CODEBASE]
- `src/widgets/dashboard/model/spaces.ts` — ADMIN_DOMAINS and ADMIN_DOMAIN_WIDGET_MAP [CODEBASE]
- `prisma/schema.prisma` line 865 — PlatformSuspension model (Prisma migration reference) [CODEBASE]
- `src/db/schema/contents.ts` — Content table with jsonb locale storage (TipTap pattern) [CODEBASE]

### Tertiary (LOW confidence)

- None — all claims verified against codebase or official docs.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed; verified via package.json
- Architecture: HIGH — patterns verified against codebase implementation
- Pitfalls: MEDIUM — emailOTP conflict behavior not yet tested; point thresholds need user confirmation

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (30 days for stable stack)

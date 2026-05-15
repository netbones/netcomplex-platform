# Netcomplex — Admin Role & Tenant Inception: Design Discussion

> **Revision history**
>
> - v1: Initial agent investigation (Platform Admin–led inception flow)
> - v2: Architectural review — self-service inception, trust boundary separation, schema fixes

---

## 0. The Core Problem with v1

The original plan proposed that a **NetComplex superuser (Platform Admin)** creates every tenant site from `/platform/admin/*`. This is architecturally incorrect for a multi-tenant SaaS product and presents a serious trust boundary problem.

**Why it fails:**

A community (e.g. Soralia Village HOA) signing up to NetComplex does not want NetComplex staff to have standing administrative access to their tenant. A NetComplex superuser provisioning tenants would, under the original model, have the same `ADMIN` role as the tenant's own community manager — meaning they could read resident data, manage users, and modify content. No reasonable tenant would accept this.

Additionally, a tenant owner may manage **several community projects** (e.g. a property management company running multiple estates). The original single-tenant inception model does not account for this.

**The fix has three parts:**

1. Replace Platform Admin–led inception with **self-service tenant signup**
2. Strictly separate **Platform superuser identity** from the tenant `Role` enum
3. Add **`ownerId`** to the `Tenant` schema so tenants have a verifiable owner

---

## 1. Revised Inception Model — Two Paths

### Path A — Self-Service Signup (Primary)

The community manager signs up directly on the NetComplex platform website. NetComplex staff are never involved.

```
/platform/signup
  ↓
Collect: name, email, password, community name, desired slug
  ↓
On submit (atomic transaction):
  1. Create user record (Better Auth)
  2. Create Tenant record (name, slug, tier=STANDARD, ownerId=user.id)
  3. Assign user role=ADMIN, tenantId=tenant.id
  4. Send email verification
  5. Redirect → /platform/onboarding/[tenantId]   (new wizard)
```

NetComplex staff have **zero access** to this tenant unless explicitly invited by the tenant owner, or via the break-glass mechanism described in Path B.

### Path B — Assisted Provisioning (Enterprise / Concierge)

For clients who require white-glove onboarding, a NetComplex staff member may assist with setup. This must be done under strict constraints:

- Staff use a **time-limited, scoped access token** — not a permanent `ADMIN` user in the tenant
- Access is recorded in an `AssistSession` log (see schema additions below)
- Access automatically expires after the agreed onboarding window (e.g. 7 days)
- The tenant owner can revoke access at any time from their admin panel
- After provisioning, staff access is revoked and the tenant owner becomes the sole `ADMIN`

This replaces Journey 1 from v1 entirely for self-service tenants. The Platform Admin UI at `/admin/platform/*` is retained for Path B but is scoped to read-only visibility of tenant metadata (name, slug, tier, status) — never tenant content, users, or settings.

---

## 2. Current State Assessment

### Two Admin Levels Exist (retained from v1, with corrections)

| Level              | Route               | Who                                                 | Purpose                                         | Access Boundary                             |
| ------------------ | ------------------- | --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| **Platform Admin** | `/platform/admin/*` | NetComplex ops staff                                | View tenant list, manage tiers, suspend tenants | Tenant metadata only — never tenant content |
| **Tenant Admin**   | `/admin/*`          | Community manager (tenant owner or delegated admin) | Manage community content, users, settings       | Scoped strictly to their `tenantId`         |

### What EXISTS Today

#### Platform Admin (Tenant Setup)

| Feature                     | Status      | Notes                                                          |
| --------------------------- | ----------- | -------------------------------------------------------------- |
| Tenant model                | ✅ Complete | Schema with name, slug, branding, tier, modules, feature flags |
| Platform admin UI           | ⚠️ Partial  | List, new, edit, features pages exist — API routes stubbed     |
| Module system               | ✅ Complete | `platform_modules` + `tenant_modules` tables, tier gating      |
| Tenant branding             | ⚠️ Partial  | `BrandingForm` exists but API non-functional                   |
| Feature management          | ⚠️ Partial  | `FeaturesForm` exists but API non-functional                   |
| **Self-service signup**     | ❌ Missing  | No self-service tenant creation flow                           |
| **Onboarding wizard**       | ❌ Missing  | No guided post-signup setup                                    |
| **`ownerId` on Tenant**     | ❌ Missing  | Tenants have no verifiable owner                               |
| **Platform superuser flag** | ❌ Missing  | NetComplex staff use same Role enum as tenants                 |

#### Tenant Admin — Authentication & Access

| Feature                         | Status      | Notes                                                                     |
| ------------------------------- | ----------- | ------------------------------------------------------------------------- |
| Better Auth                     | ✅ Complete | Email/password, passkey, 2FA, email verification                          |
| Role enum                       | ✅ Complete | RESIDENT, GROUP_ADMIN, COMMITTEE, BOARD, ADMIN, AGENT, MANAGER, ASSOCIATE |
| RBAC permissions                | ✅ Complete | 13 permission flags, ADMIN gets all `true`                                |
| Auth guard                      | ✅ Complete | Proxy-based middleware protecting `/admin` routes                         |
| Session helpers                 | ✅ Complete | `getSessionAndRole()`, `requirePermission()`                              |
| **Bug: Header role check**      | ⚠️ Bug      | `Header.tsx` checks lowercase `'admin'` but enum stores `'ADMIN'`         |
| **Bug: Setting key uniqueness** | ⚠️ Bug      | `Setting.key` is `@unique` globally — must be `@@unique([tenantId, key])` |

#### Tenant Admin — User Management

| Feature              | Status      | Notes                                        |
| -------------------- | ----------- | -------------------------------------------- |
| User list            | ✅ Complete | `/admin/users` — search, filter, sort        |
| Invite users         | ✅ Complete | Email invite with role assignment            |
| Role assignment      | ✅ Complete | Inline dropdown                              |
| Suspend/activate     | ✅ Complete | Toggle user status                           |
| Delete users         | ✅ Complete | With confirmation                            |
| Pending invitations  | ✅ Complete | Display with revoke                          |
| Bulk operations      | ❌ Missing  | No bulk invite or bulk role change           |
| Audit log            | ❌ Missing  | No user activity log                         |
| Impersonation        | ❌ Missing  | Schema field exists, no UI                   |
| Household management | ❌ Missing  | Schema has Household/Property, no admin page |

#### Tenant Admin — Content Management

| Feature             | Status      | Notes                                                                        |
| ------------------- | ----------- | ---------------------------------------------------------------------------- |
| Content CRUD        | ✅ Complete | `/admin/content` — list, new, edit with Tiptap                               |
| Rich text editor    | ✅ Complete | Tiptap, multi-language (en, af, xh, zu)                                      |
| Categories          | ✅ Complete | ANNOUNCEMENT, NEWS, EVENT, BLOG, CONSERVATION, SERVICES, RESOURCES, CAMPAIGN |
| Publish/draft       | ✅ Complete | `published` boolean toggle                                                   |
| Featured flag       | ✅ Complete | `featured` boolean                                                           |
| Content type toggle | ✅ Complete | article vs campaign                                                          |
| **Scheduling UI**   | ❌ Missing  | `publishedAt`/`expiresAt` in schema, no date pickers in ContentForm          |
| Media library       | ❌ Missing  | No image upload management                                                   |
| Approval workflow   | ❌ Missing  | No "pending review" state                                                    |

#### Tenant Admin — Events

| Feature            | Status      | Notes                                                                          |
| ------------------ | ----------- | ------------------------------------------------------------------------------ |
| Event model        | ✅ Complete | `Event` table with title, description, date, location, organizer               |
| Admin page         | ❌ Missing  | No `/admin/events` route                                                       |
| Events API         | ❌ Missing  | No CRUD API for Event model                                                    |
| Events via Content | ⚠️ Partial  | EVENT category exists but standalone Event fields (date, location) not exposed |

#### Tenant Admin — Groups

| Feature                  | Status      | Notes                             |
| ------------------------ | ----------- | --------------------------------- |
| Groups list              | ✅ Complete | `/admin/groups` — grid view       |
| Create/edit/delete group | ✅ Complete | Full CRUD with confirmation       |
| Moderation queue         | ❌ Missing  | No membership approval UI         |
| Group content moderation | ❌ Missing  | No group-published content review |

#### Tenant Admin — Surveys

| Feature           | Status      | Notes                                      |
| ----------------- | ----------- | ------------------------------------------ |
| Survey list       | ✅ Complete | `/admin/surveys`                           |
| Create survey     | ✅ Complete | `/admin/surveys/new`                       |
| External surveys  | ✅ Complete | `/admin/external-surveys`                  |
| Survey results    | ⚠️ Partial  | View link exists, results page unconfirmed |
| Survey categories | ❌ Missing  | No survey type categorisation              |

#### Tenant Admin — Competitions

| Feature           | Status       | Notes                           |
| ----------------- | ------------ | ------------------------------- |
| Competition page  | ⚠️ Hardcoded | `/competition` uses static data |
| Admin management  | ❌ Missing   | No admin CRUD                   |
| Competition model | ❌ Missing   | No database model               |

#### Tenant Admin — Maintenance Requests

| Feature              | Status      | Notes                                          |
| -------------------- | ----------- | ---------------------------------------------- |
| Full admin page      | ✅ Complete | `/admin/requests` — comprehensive              |
| Search/filter/assign | ✅ Complete | Status, priority, category, vendor (free-text) |
| Detail drawer        | ✅ Complete | Full editing, notes, history, cost             |
| Analytics            | ✅ Complete | `/admin/requests/analytics`                    |
| Vendor management    | ❌ Missing  | Vendor is free-text only                       |
| SLA tracking         | ❌ Missing  | No target resolution times                     |
| Export               | ❌ Missing  | No CSV/PDF export                              |

#### Tenant Admin — Page Publishing

| Feature           | Status      | Notes                                                                                   |
| ----------------- | ----------- | --------------------------------------------------------------------------------------- |
| Page flags system | ✅ Complete | 7 flags stored in settings per tenant                                                   |
| Toggle widget     | ✅ Complete | `PageSettingsWidget` in admin dashboard                                                 |
| Flags API         | ✅ Complete | GET/POST `/api/admin/settings/page-flags`                                               |
| Header filtering  | ✅ Complete | Header fetches flags and filters nav                                                    |
| **Missing flags** | ❌ Missing  | Groups, Services, Resources, Maintenance, Surveys, Competitions not controlled by flags |
| Custom pages      | ❌ Missing  | `CUSTOM_PAGES` key exists, no implementation                                            |
| Nav ordering      | ❌ Missing  | Order hardcoded in `BASE_NAV`                                                           |

#### Tenant Admin — Dashboard

| Feature                  | Status      | Notes                             |
| ------------------------ | ----------- | --------------------------------- |
| Widget dashboard         | ✅ Complete | `/admin` with 6 tabs, 12 widgets  |
| Draggable widgets        | ✅ Complete | Add/remove                        |
| Events tab               | ❌ Missing  | No events management in dashboard |
| Bookings tab             | ❌ Missing  | No bookings management            |
| Surveys tab              | ❌ Missing  | Surveys not in dashboard tabs     |
| Widget state persistence | ❌ Missing  | Resets on tab change              |

---

## 3. Schema Changes Required

### 3.1 Add `ownerId` to `Tenant`

Without this, there is no verifiable owner of a tenant — no way to enforce that only the founding user can perform destructive operations or grant/revoke platform-assisted access.

```prisma
model Tenant {
  // ... existing fields
  ownerId         String?
  owner           user?     @relation("TenantOwner", fields: [ownerId], references: [id])
}
```

### 3.2 Add `isPlatformAdmin` to `user`

NetComplex staff must be identifiable via a separate flag, never via the tenant `Role` enum. This prevents any privilege escalation path where a tenant `ADMIN` is evaluated as having platform-level access.

```prisma
model user {
  // ... existing fields
  isPlatformAdmin Boolean @default(false)
}
```

Every Platform Admin API route must check `user.isPlatformAdmin === true`, independently of the `role` field.

### 3.3 Fix `Setting` Key Uniqueness

**Critical bug.** The current constraint `key String @unique` is global — two tenants cannot share a setting key (e.g. `page_flags`). With more than one tenant this will fail immediately.

```prisma
// BEFORE (broken for multi-tenant)
model Setting {
  key   String @unique
}

// AFTER (correct)
model Setting {
  @@unique([tenantId, key])
}
```

### 3.4 Add `TenantOwnership` for Multi-Tenant Portfolio (Phase 2)

For tenant owners managing several community projects, replace the single `ownerId` with a join table allowing one user to own or administer multiple tenants with differentiated roles.

```prisma
model TenantOwnership {
  id          String              @id @default(cuid())
  userId      String
  tenantId    String
  ownerRole   TenantOwnerRole     @default(ADMIN)
  createdAt   DateTime            @default(now())
  user        user                @relation(fields: [userId], references: [id])
  tenant      Tenant              @relation(fields: [tenantId], references: [id])

  @@unique([userId, tenantId])
}

enum TenantOwnerRole {
  OWNER         // Founding user — irrevocable, can transfer
  BILLING_ADMIN // Manages subscription and billing
  ADMIN         // Full tenant admin, delegated by owner
}
```

This also enables a "My Communities" dashboard at the platform level, showing all tenants a user administers, with cross-tenant switching without re-authenticating.

---

## 4. Revised Admin User Stories

### Story 1 — Self-Service Tenant Signup (NEW)

> **As a** community manager,
> **I want to** sign up to NetComplex and create my community's tenant site myself,
> **So that** I can get started without waiting for NetComplex staff and without giving them access to my community's data.

### Story 2 — Tenant Admin (retained, refined)

> **As a** Tenant Admin (community manager),
> **I want to** set up and manage my community's site from inception,
> **So that** I can control page visibility, manage users, moderate content, handle maintenance requests, and create community resources.

### Story 3 — Multi-Project Owner (NEW)

> **As a** community manager overseeing multiple estates,
> **I want to** manage several tenant projects from a single NetComplex account,
> **So that** I don't need separate logins for each community and can switch between them efficiently.

---

## 5. Revised User Journeys

### Journey 0 — Self-Service Tenant Signup (NEW — replaces old Journey 1)

```
┌─────────────────────────────────────────────────────────────────┐
│  SELF-SERVICE: Create Your Community Site                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Visit /platform/signup                                      │
│     └─ Fill: name, email, password, community name, slug        │
│     └─ Agree to terms                                           │
│     └─ Cloudflare Turnstile (already supported in codebase)     │
│                                                                 │
│  2. Atomic provisioning on submit                               │
│     └─ Create user (Better Auth)                                │
│     └─ Create Tenant (name, slug, tier=STANDARD, ownerId=user)  │
│     └─ Assign user: role=ADMIN, tenantId=tenant.id              │
│     └─ Send email verification                                  │
│                                                                 │
│  3. Redirect → /platform/onboarding/[tenantId]                  │
│     └─ Onboarding wizard (see Journey 1 below)                  │
│                                                                 │
│  NetComplex staff: no access created, no notification needed    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 1 — Onboarding Wizard (NEW — post-signup)

```
┌─────────────────────────────────────────────────────────────────┐
│  TENANT ADMIN: Post-Signup Onboarding Wizard                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Branding                                               │
│     └─ Logo upload, primary colour, accent colour, font         │
│     └─ BrandingForm component already exists                    │
│                                                                 │
│  Step 2: Module Selection                                       │
│     └─ Show modules available at STANDARD tier                  │
│     └─ Let admin toggle which modules to enable                 │
│     └─ Upsell prompt for PREMIUM features                       │
│                                                                 │
│  Step 3: Page Visibility                                        │
│     └─ Show all available pages with ON/OFF toggles             │
│     └─ PageSettingsWidget logic reused here                     │
│     └─ Sensible defaults: News ON, Chat OFF, etc.               │
│                                                                 │
│  Step 4: Invite Your Team                                       │
│     └─ Add email addresses for initial co-admins / managers     │
│     └─ Existing invite flow (role=ADMIN or MANAGER)             │
│     └─ Can skip                                                 │
│                                                                 │
│  Step 5: Launch                                                 │
│     └─ "Your community site is live"                            │
│     └─ Link to tenant public URL: /{slug}                       │
│     └─ Link to admin panel: /admin                              │
│     └─ Option: complete remaining setup later                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 1b — Assisted Provisioning (Path B, Enterprise)

```
┌─────────────────────────────────────────────────────────────────┐
│  ASSISTED: NetComplex Staff Helps a Client                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Staff authenticates at /platform/login                      │
│     └─ user.isPlatformAdmin === true (separate flag)            │
│                                                                 │
│  2. Staff creates tenant at /platform/admin/platform/new        │
│     └─ Fills: name, slug, tier, branding, modules               │
│     └─ Sets client contact email as founding admin              │
│     └─ System sends invitation to client                        │
│                                                                 │
│  3. Staff gets time-limited access token (scoped, logged)       │
│     └─ Expires after agreed onboarding window (default 7 days)  │
│     └─ Tenant owner can revoke at any time                      │
│     └─ All staff actions recorded in AssistSession log          │
│                                                                 │
│  4. Client accepts invitation → sets password → becomes ADMIN   │
│     └─ Staff access auto-expires                                │
│     └─ Tenant owner is now the client, not NetComplex           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 2 — Tenant Admin: First Login & Page Setup (revised)

```
┌─────────────────────────────────────────────────────────────────┐
│  TENANT ADMIN: First Login & Site Configuration                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Accept invitation email → set password                      │
│     └─ Better Auth email verification                           │
│     (If self-service: already logged in post-signup)            │
│                                                                 │
│  2. Login at /sign-in → redirected to /admin dashboard          │
│                                                                 │
│  3. Admin Dashboard loads                                       │
│     └─ Overview tab: stats, quick links, recent activity        │
│                                                                 │
│  4. Navigate to "Page Settings" tab                             │
│     └─ Toggle pages on/off                                      │
│     └─ Conservation mode selector                               │
│     └─ Changes reflect in header immediately                    │
│                                                                 │
│  5. Confirm navigation on public site                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 3 — Content Creation with Scheduling (retained from v1)

```
┌─────────────────────────────────────────────────────────────────┐
│  TENANT ADMIN: Create & Schedule Content                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Admin > Content Management → "New Content"                  │
│     └─ Title (en, af, xh, zu), rich text, category             │
│     └─ Content type, featured, published checkboxes             │
│     └─ ⚠️ MISSING: publishedAt date picker                      │
│     └─ ⚠️ MISSING: expiresAt date picker                        │
│                                                                 │
│  2. Save as Draft or Publish                                    │
│     └─ With scheduling: auto-publish at publishedAt             │
│     └─ With scheduling: auto-expire at expiresAt                │
│                                                                 │
│  3. Ensure page flag is ON for content category                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 4 — Maintenance Request Triage (retained from v1)

```
┌─────────────────────────────────────────────────────────────────┐
│  TENANT ADMIN: Handle Maintenance Requests                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Dashboard > Maintenance tab → /admin/requests               │
│  2. Filter by status, priority, category, search                │
│  3. Click request → detail drawer                               │
│     └─ Update status, priority, assignment, notes, costs        │
│     └─ Notify resident                                          │
│  4. /admin/requests/analytics → charts, trends                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 5 — Group Moderation (retained from v1)

```
┌─────────────────────────────────────────────────────────────────┐
│  TENANT ADMIN: Create & Moderate Groups                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. /admin/groups → grid view                                   │
│  2. Create group: name, category, access type, resident filter  │
│  3. Moderate: view members, ⚠️ MISSING: approval queue          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 6 — Surveys & Competitions (retained from v1)

```
┌─────────────────────────────────────────────────────────────────┐
│  TENANT ADMIN: Surveys & Competitions                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SURVEYS: /admin/surveys → create, activate, view results       │
│     └─ ⚠️ MISSING: dedicated results visualisation              │
│                                                                 │
│  COMPETITIONS: ⚠️ MISSING: no admin CRUD, no model              │
│     └─ /competition uses hardcoded static data                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Revised Epic Breakdown

| Epic                                    | Description                                                      | Replaces                    |
| --------------------------------------- | ---------------------------------------------------------------- | --------------------------- |
| **E0: Self-Service Signup**             | `/platform/signup` creates tenant + founding admin atomically    | Old E1 (Platform Admin–led) |
| **E1a: Onboarding Wizard**              | Post-signup guided setup (branding, modules, pages, invites)     | Old E2                      |
| **E1b: Assisted Provisioning**          | Staff-assisted path with time-limited access, scoped to metadata | Old Journey 1               |
| **E1c: Multi-Project Portfolio**        | "My Communities" for users managing multiple tenants             | New                         |
| **E2: First Login & Page Setup**        | Tenant Admin first-run experience                                | Old E2                      |
| **E3: User Management**                 | Invite, roles, suspend, remove                                   | Old E3                      |
| **E4: Content Publishing**              | Create/schedule News, Events, Resources, Campaigns               | Old E4                      |
| **E5: Group Moderation**                | Create, moderate, manage interest groups                         | Old E5                      |
| **E6: Survey & Competition Management** | Surveys with results, Competitions model                         | Old E6                      |
| **E7: Maintenance Triage**              | Attend, assign, track maintenance requests                       | Old E7                      |
| **E8: Page Governance**                 | Header page flag toggles                                         | Old E8                      |

---

## 7. Gap Analysis

### Critical Gaps — Blockers for Correct Multi-Tenant Operation

| Gap                                                                      | Impact                                         | Effort | Priority |
| ------------------------------------------------------------------------ | ---------------------------------------------- | ------ | -------- |
| **Setting key uniqueness bug** (`@unique` → `@@unique([tenantId, key])`) | Will break immediately with 2+ tenants         | Tiny   | P0       |
| **`ownerId` missing from Tenant schema**                                 | No verifiable tenant ownership                 | Small  | P0       |
| **No self-service signup flow**                                          | Cannot onboard tenants without staff           | Medium | P0       |
| **Platform Admin–tenant role conflation**                                | Trust boundary violation                       | Medium | P0       |
| **`isPlatformAdmin` flag missing from `user`**                           | No clean separation of staff from tenant users | Small  | P0       |
| **Header role case-sensitivity bug** (`'admin'` vs `'ADMIN'`)            | Admin link may not show                        | Tiny   | P0       |
| **Platform Admin API routes stubbed**                                    | Cannot create/manage tenants at all            | Medium | P0       |

### Important Gaps — Admin Workflow

| Gap                                                                                      | Impact                                   | Effort | Priority |
| ---------------------------------------------------------------------------------------- | ---------------------------------------- | ------ | -------- |
| **No Onboarding Wizard**                                                                 | New tenants dropped into raw admin panel | Medium | P1       |
| **No Events admin page**                                                                 | Event model exists, no CRUD UI           | Medium | P1       |
| **No content scheduling UI**                                                             | `publishedAt`/`expiresAt` unusable       | Small  | P1       |
| **No Competitions model or admin**                                                       | Hardcoded page                           | Medium | P1       |
| **Missing page flags** (Groups, Services, Resources, Maintenance, Surveys, Competitions) | Cannot control header visibility         | Small  | P1       |
| **No group moderation queue**                                                            | Cannot approve membership applications   | Medium | P2       |
| **No dedicated Resources admin**                                                         | Resources via generic content only       | Small  | P2       |
| **Widget state persistence**                                                             | Dashboard resets on tab change           | Small  | P2       |
| **No admin activity audit log**                                                          | Cannot track admin actions               | Medium | P2       |
| **No survey results visualisation**                                                      | Data exists, not presented               | Medium | P2       |

### Nice-to-Have Gaps

| Gap                                        | Impact                      | Effort | Priority |
| ------------------------------------------ | --------------------------- | ------ | -------- |
| Multi-project portfolio ("My Communities") | Multi-estate managers       | Large  | P3       |
| User impersonation                         | Debug user issues           | Medium | P3       |
| Vendor management (replace free-text)      | Professional service levels | Medium | P3       |
| SLA tracking for maintenance               | Professional reporting      | Medium | P3       |
| Export functionality (CSV/PDF)             | Reporting                   | Small  | P3       |
| Navigation ordering control                | UX flexibility              | Small  | P3       |
| Custom page creation                       | Flexible navigation         | Large  | P4       |
| Recurring maintenance templates            | Automation                  | Medium | P4       |

---

## 8. Recommended Phase Plan

### Phase 0: Critical Schema & Bug Fixes (P0 — do before anything else)

1. Fix `Setting` uniqueness: `@@unique([tenantId, key])`
2. Add `ownerId` to `Tenant` schema + migration
3. Add `isPlatformAdmin` to `user` schema + migration
4. Fix Header role case bug (`'admin'` → `'ADMIN'` or use `isAdmin()` helper)
5. Enforce `tenantId` scoping on all Platform Admin API routes

### Phase A: Self-Service Inception (P0)

1. Build `/platform/signup` — atomic user + tenant + admin role creation
2. Build `/platform/onboarding/[tenantId]` wizard (5 steps: branding, modules, pages, invites, launch)
3. Wire Platform Admin API routes for Path B (assisted provisioning), scoped to metadata only
4. Add time-limited staff access mechanism for assisted provisioning
5. End-to-end test: signup → onboarding → public site live

### Phase B: Content & Events (P0/P1)

1. Add date pickers to `ContentForm` for `publishedAt` / `expiresAt`
2. Add API middleware to filter content by publish/expiry dates
3. Create `/admin/events` page with full CRUD
4. Create Events API routes
5. Add Events tab to admin dashboard

### Phase C: Page Flag Expansion (P1)

1. Add flags: Groups, Services, Resources, Maintenance, Surveys, Competitions
2. Update `PageSettingsWidget` with new toggles
3. Update Header to filter new pages
4. Update `BASE_NAV` with new entries

### Phase D: Competitions & Resources (P1)

1. Create `Competition` model in Prisma schema
2. Create `/admin/competitions` page + API routes
3. Add date controls (start/end) for competitions
4. Replace hardcoded `/competition` page with dynamic content
5. Create `/admin/resources` (or enhance content filtering)

### Phase E: Admin Dashboard Enhancement (P2)

1. Add Surveys tab to dashboard
2. Widget state persistence (UserPreferences table)
3. Survey results visualisation
4. Group moderation queue

### Phase F: Multi-Project Portfolio (P3)

1. Add `TenantOwnership` join table
2. Build "My Communities" platform dashboard
3. Cross-tenant switching without re-auth
4. Billing Admin role for subscription management

---

## 9. Admin Permission Matrix (Current)

| Capability         | ADMIN | MANAGER | BOARD | COMMITTEE | GROUP_ADMIN | RESIDENT |
| ------------------ | ----- | ------- | ----- | --------- | ----------- | -------- |
| Full admin access  | ✅    | ❌      | ❌    | ❌        | ❌          | ❌       |
| Manage users       | ✅    | ✅      | ❌    | ❌        | ❌          | ❌       |
| Manage households  | ✅    | ✅      | ✅    | ❌        | ❌          | ❌       |
| Manage maintenance | ✅    | ✅      | ✅    | ✅        | ❌          | ❌       |
| Manage all content | ✅    | ✅      | ✅    | ✅        | ❌          | ❌       |
| Manage own content | ✅    | ✅      | ✅    | ✅        | ✅          | ✅       |
| Manage all groups  | ✅    | ✅      | ✅    | ✅        | ❌          | ❌       |
| Manage own groups  | ✅    | ✅      | ✅    | ✅        | ✅          | ❌       |
| Manage events      | ✅    | ✅      | ✅    | ✅        | ❌          | ✅       |
| Manage bookings    | ✅    | ✅      | ✅    | ✅        | ❌          | ✅       |
| Access directory   | ✅    | ✅      | ✅    | ✅        | ✅          | ✅       |
| Manage messages    | ✅    | ✅      | ✅    | ✅        | ✅          | ✅       |
| Manage settings    | ✅    | ✅      | ✅    | ✅        | ❌          | ❌       |
| **Platform Admin** | ❌    | ❌      | ❌    | ❌        | ❌          | ❌       |

> Platform Admin is a separate flag (`isPlatformAdmin`) on the `user` model, never a `Role` enum value. It grants access only to `/platform/admin/*` routes and only to tenant metadata — never tenant content, users, or settings.

---

## 10. Key Technical Decisions

### 1. Should Competitions be a standalone model or Content category?

- **Standalone:** More fields (entries, voting, prizes, dates), dedicated admin
- **Content category:** Simpler, reuses existing CMS
- **Decision:** Standalone — competitions need entry management, voting, and deadlines that the Content model cannot cleanly accommodate

### 2. Should Resources be a standalone model or Content category?

- **Currently:** `RESOURCE` category in Content
- **Decision:** Keep as Content category — resources are essentially articles with attachments; no structural reason for a separate model

### 3. Should page flags stay in the `settings` table?

- **Current:** `settings` table per tenant (once `@@unique([tenantId, key])` is fixed)
- **Decision:** Keep in `settings` — tenant-specific, no external dependency, already wired

### 4. How should content scheduling be enforced?

- **Decision:** Add API middleware/query filter that applies `WHERE publishedAt <= NOW() AND (expiresAt IS NULL OR expiresAt > NOW())` to all public content queries. Add date pickers to `ContentForm` for the admin UI.

### 5. How should tenant ownership transfer work?

- **Decision:** The `ownerId` field (Phase 0) is the initial approach. When `TenantOwnership` is introduced (Phase F), the OWNER role in that table is irrevocable except via an explicit "Transfer Ownership" flow that requires email confirmation from both parties.

### 6. How should Platform Admin staff access tenant data in an emergency?

- **Decision:** A break-glass mechanism — a logged, time-limited `AssistSession` record that grants read-only access to specific tenant metadata. Staff cannot access resident data, content, or settings through this mechanism. All access is auditable.

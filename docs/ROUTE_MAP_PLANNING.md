# Route Map Planning (NetComplex + Tenants)

This is a **planning + refactor guide** for organising routes so that:

- `netcomplex.netbones.co.za` serves the **platform control plane**
- `*.netbones.co.za` (and custom domains) serve the **tenant data plane**
- Both can be served by the same Next.js app using **host-based middleware** and **route groups**

---

## High-level principles

- **Admin means “who am I administering for?”**
  - **Tenant admin**: board/HOA admins configuring their community.
  - **Platform admin**: NetComplex operators managing all tenants.
- **Host decides plane**
  - `netcomplex.netbones.co.za` → platform (control plane)
  - `*.netbones.co.za` / custom domains → tenant (data plane)
- **Keep URLs consistent**
  - Keep admin UIs under `/admin/...`
  - Use route groups like `(platform)` and `(tenant)` to separate implementations **without changing URLs**

---

## Target route map

### Platform routes (control plane – `netcomplex.netbones.co.za`)

- **Public / marketing**
  - `/` – NetComplex marketing / landing
  - `/pricing` – plans
  - `/features` – product overview
  - `/docs` – public docs / help (optional)
- **Platform auth**
  - `/login` – platform operator login (or shared Better Auth flow)
- **Platform admin**
  - `/admin/dashboard` – platform overview
  - `/admin/tenants` – list/search tenants
  - `/admin/tenants/[tenantId]` – tenant detail
    - `/admin/tenants/[tenantId]/features`
    - `/admin/tenants/[tenantId]/branding`
    - `/admin/tenants/[tenantId]/billing`
  - `/admin/support` – impersonation tools, support tickets

### Tenant routes (data plane – `*.netbones.co.za` or custom domain)

- **Resident / general**
  - `/` – tenant home
  - `/dashboard`
  - `/directory`
  - `/groups`
  - `/events`
  - `/bookings`
  - `/maintenance`
  - `/messages`
- **Tenant auth**
  - `/sign-in`, `/sign-up`, `/forgot-password`
- **Tenant admin**
  - `/admin` – tenant-level admin home
  - `/admin/users`, `/admin/content`, `/admin/groups`, `/admin/requests`, `/admin/surveys`, etc.

---

## Current repo reality (route inventory)

These paths exist today under `src/app/`:

### Platform admin (today uses `/admin/platform/...`)

- `admin/platform/page.tsx`
- `admin/platform/new/page.tsx`
- `admin/platform/[id]/edit/page.tsx`
- `admin/platform/[id]/features/page.tsx`

### Tenant admin (today uses `/admin/...`)

- `admin/page.tsx`
- `admin/users/page.tsx`
- `admin/content/page.tsx`
- `admin/content/new/page.tsx`
- `admin/content/[id]/page.tsx`
- `admin/groups/page.tsx`
- `admin/groups/new/page.tsx`
- `admin/groups/[id]/page.tsx`
- `admin/requests/page.tsx`
- `admin/requests/analytics/page.tsx`
- `admin/surveys/page.tsx`
- `admin/surveys/new/page.tsx`

### Auth (route group already exists)

- `(auth)/sign-in/page.tsx`
- `(auth)/sign-up/page.tsx`
- `(auth)/forgot-password/page.tsx`

---

## Recommended organisation (route groups)

Keep URLs stable while separating implementations using route groups:

- Tenant plane implementation lives under `src/app/(tenant)/...`
- Platform plane implementation lives under `src/app/(platform)/...`

Both can still expose `/admin/...` paths; the **host decides which plane is allowed**.

---

## Move plan (“A → B”)

These are filesystem moves to make code organisation match the target architecture.

### Step 1 — Move platform admin into `(platform)`

- **Move** `src/app/admin/platform/` → `src/app/(platform)/admin/platform/`

Result:

- Platform implementation becomes clearly isolated under `(platform)`.
- URL remains `/admin/platform/...` (no link rewrite required).

### Step 2 — Move tenant admin into `(tenant)` (excluding `platform/`)

- **Move** `src/app/admin/` → `src/app/(tenant)/admin/`
- **Except**: keep `platform/` in `(platform)` per Step 1.

Concrete examples:

- `src/app/admin/page.tsx` → `src/app/(tenant)/admin/page.tsx`
- `src/app/admin/users/` → `src/app/(tenant)/admin/users/`
- `src/app/admin/content/` → `src/app/(tenant)/admin/content/`
- `src/app/admin/groups/` → `src/app/(tenant)/admin/groups/`
- `src/app/admin/requests/` → `src/app/(tenant)/admin/requests/`
- `src/app/admin/surveys/` → `src/app/(tenant)/admin/surveys/`

### Step 3 — (Optional) Platform marketing pages

If `netcomplex.netbones.co.za` will serve marketing routes from this same app:

- **Create** `src/app/(platform)/(public)/` for:
  - `src/app/(platform)/(public)/page.tsx` → `/`
  - `src/app/(platform)/(public)/pricing/page.tsx` → `/pricing`
  - `src/app/(platform)/(public)/features/page.tsx` → `/features`
  - `src/app/(platform)/(public)/docs/page.tsx` → `/docs`

### Step 4 — Leave auth routes alone (for now)

- Keep `src/app/(auth)/...` as-is until you decide whether platform auth and tenant auth should be split.

---

## Middleware requirements (enforcement)

After the moves, middleware (or equivalent server-side enforcement) must ensure:

- If host is `netcomplex.netbones.co.za`:
  - Allow `src/app/(platform)/...`
  - Deny/redirect tenant-only routes
- Otherwise (tenant host):
  - Resolve tenant and set `x-tenant-id`, `x-tenant-slug`
  - Allow `src/app/(tenant)/...`
  - Deny platform-only routes

This prevents accidental access (e.g. tenant users hitting platform admin).

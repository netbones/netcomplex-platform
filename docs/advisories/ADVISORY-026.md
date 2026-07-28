---
title: ADVISORY-021: Eliminate Hardcoded Soralia Village Branding, i18n Copy & Map Data — Enforce Tenant-DB-Driven Header/Footer/Map
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-021: Eliminate Hardcoded Soralia Village Branding, i18n Copy & Map Data — Enforce Tenant-DB-Driven Header/Footer/Map

**Status:** Draft — awaiting decision gates
**Trigger:** Soralia Heights (second tenant) correctly renders resident directory data via `withTenant()`-scoped queries, but Header, Footer, and the map component (Leaflet/`react-leaflet`, per SPEC.md — colloquially "mapbox") still render Soralia Village's identity, copy, and geography regardless of active tenant.
**Scope:** `src/shared/ui/Header.tsx`, `src/shared/ui/Footer.tsx`, `src/shared/ui/MapContent.tsx`, `src/shared/lib/i18n/*`, `public/locales/**/*.json`, tenant context providers that feed these components. Out of scope (tracked as follow-up, not addressed here): OpenGraph/meta tags, email templates, `platformAddress` domain suffixes, sitemap/robots — see Decision Gate G4.

---

## 1. Problem Statement

Directory/resident data is correctly tenant-scoped (queries go through `withTenant()` + Drizzle, confirmed working for Soralia Heights). Header, Footer, and the map are not. Symptoms reported:

- Header/Footer display Soralia Village's name/copy on the Soralia Heights tenant.
- Map is "locked" — renders Soralia Village's location/markers regardless of which tenant is active.

This means at least one (likely both) of two failure modes is present:

1. **Component-level:** Header/Footer/Map read a hardcoded literal or a stale/default value instead of the resolved `Tenant` record for the current request.
2. **Content-level:** Even where tenant context _is_ wired in, the actual copy strings live in locale JSON (`public/locales/en/common.json`, `home.json`, etc.) which are keyed by **language**, not by **tenant** — so "Soralia Village" as a literal string inside a translation value will render for every tenant regardless of correct tenant-context plumbing.

The map has no known tenant-scoped geography field anywhere in `schema.prisma` today — there is no `Tenant.mapCenterLat/Lng` or equivalent, so it is structurally impossible for `MapContent.tsx` to be tenant-aware without either a schema addition or a `Setting`-based key.

## 2. Root Cause Analysis

| Symptom                                               | Likely root cause                                                                                                                                                                                                                   | Confidence                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Header/Footer show wrong tenant name/logo             | Component uses string literal or a stale singleton import instead of reading `tenant.name`/`tenant.logoUrl` from the tenant context (Zustand store, per ADR-013)                                                                    | High — needs discovery to confirm |
| Header/Footer show wrong tagline/footer legal copy    | Copy lives in locale JSON with "Soralia Village" hardcoded into the translation value itself, not interpolated                                                                                                                      | High                              |
| Map shows Soralia Village's location for every tenant | No `Tenant`-scoped geo field exists in the schema at all; `MapContent.tsx` almost certainly has a hardcoded `center={[lat, lng]}` prop                                                                                              | High                              |
| Directory data works correctly but these three don't  | Directory reads go through `withTenant()` + Drizzle per-request; Header/Footer/Map are more likely to be rendered from a layout-level component that was built before multi-tenant conversion and never migrated off static content | Medium                            |

This is consistent with PRD.md's own listed technical debt for the pre-multi-tenant Soralia build: _"Single-tenant hardcoded (no tenant abstraction)"_ — Header/Footer/Map may simply be surviving artifacts of that phase that were never touched during the tenant migration (PRD Phase 3), because tenant migration work concentrated on data models, not static UI chrome.

## 3. Options Considered

**A. Patch component-level literals only (name/logo), leave i18n untouched.**
Fast, but leaves the deeper defect: any tenant whose default locale copy mentions "Soralia Village" by name (taglines, footer "About" paragraph, legal entity name) will still leak on every tenant. Rejected as incomplete.

**B. Fork locale JSON per tenant (`public/locales/{tenant}/{lang}/*.json`).**
Doesn't scale — combinatorial explosion (tenants × 4 languages × 16 namespace files today), and directly contradicts your platform's multi-tenant/SaaS model where tenants are provisioned via DB rows, not deploys. Rejected.

**C. DB-driven tenant content via existing `Setting` model + i18next interpolation for short strings; move brand-identity fields (name/logo/colors) to already-existing `Tenant` columns.** _(Recommended)_

- Short/structural strings (nav labels, generic UI copy) stay in locale JSON as pure language translations — these are legitimately language-scoped, not tenant-scoped, and should never contain a brand name.
- Any string containing a tenant name gets refactored to i18next interpolation: `t('footer.copyright', { tenantName: tenant.name })` against a language string like `"© {{tenantName}} {{year}}. All rights reserved."`
- Longer-form tenant-specific copy (tagline, footer "About" paragraph, social links, map center) becomes `Setting` rows scoped by `tenantId` + `key`, mirroring the existing contact-settings precedent (`useContactSettings.ts`, `/api/settings/contact`).
- Consistent with your stated principle: _"DB-backed patterns over hardcoded values... where admin-configurability is needed."_

**D. Add dedicated `TenantContent` Prisma model instead of `Setting` rows.**
More normalized, but duplicates infrastructure that `Setting` already provides, and Prisma/Drizzle dual-ORM changes carry migration overhead your ADVISORY-021 precedent treats as non-trivial. Only justified if the "About" copy needs rich-text/Tiptap editing — flagged as Decision Gate G2 rather than decided here.

## 4. Architecture Before / After

**Before:**

```
Header.tsx ──► literal "Soralia Village" / stale import
Footer.tsx ──► literal copy + i18next t('footer.about') → "...Soralia Village..." baked into common.json
MapContent.tsx ──► center={[HARDCODED_LAT, HARDCODED_LNG]}
```

**After:**

```
Header.tsx ──► useTenant() (Zustand store, hydrated via withTenant()) ──► tenant.name, tenant.logoUrl, tenant.primaryColor
Footer.tsx ──► useTenant() for identity
            ──► useSetting('branding.tagline'), useSetting('branding.social_links') for copy
            ──► i18next t('footer.copyright', { tenantName }) for interpolated strings
MapContent.tsx ──► useSetting('map.center') → { lat, lng, zoom } with tenant-neutral fallback (NOT Soralia's coordinates)
```

## 5. Pre-Execution Discovery Checklist

Agent runs these against the actual repo before writing any code. Do not assume file contents from this advisory — confirm them.

```bash
# 1. Confirm exact hardcoded literals in the three target files
grep -n "Soralia" src/shared/ui/Header.tsx src/shared/ui/Footer.tsx src/shared/ui/MapContent.tsx

# 2. Confirm whether tenant context is even imported in these files today
grep -n "useTenant\|TenantProvider\|tenant\." src/shared/ui/Header.tsx src/shared/ui/Footer.tsx src/shared/ui/MapContent.tsx

# 3. Inventory every locale file mentioning the tenant by name (case-insensitive, all 4 languages)
grep -rni "soralia" public/locales/ --include="*.json"

# 4. Confirm current tenant context shape (Zustand store per ADR-013 — context.tsx may be legacy/renamed)
cat src/entities/tenant/api/context.tsx
cat src/entities/tenant/model/types.ts
cat src/entities/tenant/ui/TenantProvider.tsx
cat src/entities/tenant/ui/TenantStyles.tsx

# 5. Confirm existing Setting-based precedent (contact settings) to mirror
cat src/shared/lib/hooks/useContactSettings.ts
cat src/app/api/settings/contact/route.ts
grep -n "key" prisma/schema.prisma | grep -A5 "model Setting"

# 6. Confirm MapContent's current geo source — hardcoded literal vs prop vs env var
grep -n "center\|lat\|lng\|zoom\|MapContainer" src/shared/ui/MapContent.tsx

# 7. Confirm i18n interpolation is configured (i18next supports {{var}} out of the box, but confirm no escaping override)
cat src/shared/lib/i18n/config.ts

# 8. Confirm onboarding flow — does BrandingStep already collect any of this, to extend rather than duplicate?
cat src/features/onboarding/ui/steps/BrandingStep.tsx

# 9. Confirm which tenant is currently resolving in local dev (LOCAL_TENANT_SLUG) to rule out a resolution bug vs a content bug
grep -n "LOCAL_TENANT_SLUG" src/middleware.ts src/entities/tenant/api/tenant.ts src/shared/lib/tenant-config/tenant.ts

# 10. Full-repo sweep for any other hardcoded tenant-identity strings outside the three named files (informational only — do not act on these without a separate advisory, see G4)
grep -rni "soralia village" src --include="*.tsx" --include="*.ts" -l
```

**Escalate to DavDev before Phase 2 if:**

- Discovery finds the hardcoded values are NOT in the three files/locale JSON assumed above (i.e., a different root cause, such as build-time env var baking).
- `Setting` model's `@@unique([tenantId, key])` would conflict with existing seeded keys for `branding.*` or `map.*` namespaces (check via `check-existing-props.ts` pattern or a direct query).

## 6. Phased Execution Plan

**Phase 0 — Discovery (this advisory's checklist).** Produce an inventory table: file, line, hardcoded value, proposed replacement source (Tenant column / Setting key / i18next interpolation). **Stop here. Do not proceed to Phase 1 without DavDev sign-off on the inventory — this is Decision Gate G1.**

**Phase 1 — Schema/Setting groundwork (post-G1).**

- No `Tenant` migration expected (name/logo/colors already exist as columns).
- Seed new `Setting` keys per tenant for: `branding.tagline`, `branding.footer_copy`, `branding.social_links` (JSON), `map.center` (JSON: `{lat, lng, zoom}`). Use `db.insert().onConflictDoNothing()` per ADR-003, not Prisma `createMany`.
- Both Soralia Village and Soralia Heights need real values seeded before Phase 3 ships, or Phase 3's UI will render empty states — sequence this explicitly.

**Phase 2 — i18n cleanup.**

- Sweep locale JSON (all 4 languages) for tenant-name literals per the Phase 0 inventory.
- Convert brand-bearing strings to interpolated form (`{{tenantName}}`) — this touches every locale file that has an offending key, not just `en`. Do not leave `af`/`xh`/`zu` out of sync with `en`'s key structure.
- Anything too long/rich for interpolation (multi-paragraph "About" copy) moves to a `Setting` value or, if rich-text editing is required, flagged back to Decision Gate G2 for a `ContentItem`-based approach instead.

**Phase 3 — Component refactor.**

- `Header.tsx` / `Footer.tsx`: replace literals with tenant-context reads (`tenant.name`, `tenant.logoUrl`, `tenant.primaryColor`) and the new `Setting`-backed hook(s) for tagline/social links, following the `useContactSettings.ts` pattern (new `useBrandingSettings.ts` or extend existing hook — agent's call, document either way).
- `MapContent.tsx`: replace hardcoded `center`/`zoom` with `Setting`-backed values. Fallback behavior must be tenant-neutral (see G3) — never fall back to Soralia Village's coordinates.

**Phase 4 — Regression verification.**

- Manually verify both tenants render distinct Header/Footer/Map.
- Re-run `scripts/audit-tenant-isolation.ts` to confirm no cross-tenant leakage was introduced by the new `Setting` reads.
- Confirm no locale key is now missing across `en`/`af`/`xh`/`zu` (a partial interpolation rollout that only updates `en` will silently break non-English tenants).

## 7. Risk Register

| Risk                                                                                                                  | Likelihood | Impact                                     | Mitigation                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fallback value for missing `Setting` accidentally reintroduces Soralia Village as a default                           | Medium     | High — recreates the exact bug being fixed | Fallback must be tenant-neutral empty state or platform-generic copy, never a real tenant's data (Gate G3)                                                            |
| i18n key restructuring touches ~4 languages × N namespace files, partial rollout breaks non-English tenants           | Medium     | Medium                                     | Phase 2 must diff all 4 locale trees for key parity before Phase 3 starts consuming them                                                                              |
| `Setting` unique constraint `(tenantId, key)` collides with pre-existing seeded keys                                  | Low        | Medium                                     | Discovery step 5/10 checks for existing `branding.*`/`map.*` keys before insert                                                                                       |
| Map center missing entirely for a tenant with no `Setting` row yet (e.g., a third tenant onboarded before this ships) | Medium     | Low                                        | Onboarding wizard (`BrandingStep.tsx` or new step) should capture `map.center` at tenant creation going forward — flagged as a Phase 1 follow-on, confirm scope in G1 |
| Scope creep into meta tags/email templates/domain suffixes discovered during the full-repo sweep (discovery step 10)  | Medium     | Low                                        | Explicitly deferred per G4 — log as BD issues, do not fold into this advisory's execution                                                                             |

## 8. Done Criteria

- [ ] ⏳ `grep -rni "soralia village" src/shared/ui/Header.tsx src/shared/ui/Footer.tsx src/shared/ui/MapContent.tsx` returns zero hits.
- [ ] ⏳ `grep -rni "soralia" public/locales/**/*.json` returns zero hits for brand-identity strings (excluding any intentionally tenant-neutral sample/seed fixtures, which should be clearly commented as such).
- [ ] ⏳ Soralia Village and Soralia Heights render visibly distinct Header, Footer, and Map on the same build.
- [ ] ⏳ All 4 locale trees (`en`, `af`, `xh`, `zu`) have parity on any restructured keys.
- [ ] ⏳ `scripts/audit-tenant-isolation.ts` passes clean post-change.
- [ ] ⏳ `Setting` rows exist for both tenants for every new key introduced (`branding.tagline`, `branding.footer_copy`, `branding.social_links`, `map.center`).
- [ ] ⏳ No fallback path renders Soralia Village's specific data for a tenant lacking configured `Setting` values.

## 9. Decision Gates

**G1 — Storage strategy confirmation.** Confirm `Setting`-based key/value (recommended, Option C) over a dedicated `TenantContent` model (Option D) for: tagline, footer copy, social links, map center. _Awaiting DavDev confirmation before Phase 1._

**G2 — Rich content handling.** If footer "About" copy needs rich-text/Tiptap editing rather than a plain string `Setting` value, confirm whether to reuse the existing `Content`/`ContentItem` CMS model instead of `Setting` for that one field specifically. _Awaiting DavDev confirmation before Phase 2._

**G3 — Fallback semantics.** Confirm fallback behavior for a tenant with no configured `map.center` or `branding.tagline`: (a) hide the section entirely, (b) show a generic platform-neutral placeholder, or (c) block rendering until onboarding completes the field. Whichever is chosen, it must not resolve to any specific tenant's real data. _Awaiting DavDev confirmation before Phase 3._

**G4 — Scope boundary.** Discovery step 10 will likely surface hardcoded tenant-identity strings outside Header/Footer/Map (meta tags, email templates, `platformAddress` domain assumptions). Confirm these are logged as separate BD issues / a future advisory and explicitly excluded from this execution's blast radius. _Awaiting DavDev confirmation — can be answered now or at Phase 0 handoff._

---

**Agent instruction:** Do not begin Phase 1 until G1 is resolved. Do not begin Phase 3 until G2 and G3 are resolved. Surface the Phase 0 inventory table as the first deliverable, not code.

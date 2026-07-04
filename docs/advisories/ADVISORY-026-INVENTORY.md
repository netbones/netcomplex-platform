# ADVISORY-026 Phase 0 Discovery Inventory

**Generated:** 2026-07-03
**Status:** Awaiting decision gates G1–G4

## A. Direct Hardcoded Strings in Target Components

| #   | File             | Line    | Hardcoded Value                              | Proposed Replacement                                 |
| --- | ---------------- | ------- | -------------------------------------------- | ---------------------------------------------------- |
| 1   | `Header.tsx`     | 342-343 | `src="/logo.png"` alt="Soralia Village Logo" | `tenant.logoUrl` from tenant context                 |
| 2   | `Footer.tsx`     | 50-51   | `src="/logo.png"` alt="Soralia Village Logo" | `tenant.logoUrl` from tenant context                 |
| 3   | `Footer.tsx`     | 124     | `"Cape Town, South Africa"`                  | Setting key `branding.address` or i18n interpolation |
| 4   | `Footer.tsx`     | 132     | `info@soralia.co.za`                         | Setting key `branding.email` or Tenant column        |
| 5   | `MapContent.tsx` | 25      | `setView([-34.09165, 18.483269], 16)`        | Setting key `map.center` → `{lat, lng, zoom}`        |
| 6   | `MapContent.tsx` | 33-40   | 6 hardcoded street names/coords              | Setting key `map.streets` (JSON array)               |
| 7   | `MapContent.tsx` | 43      | popup text `"Soralia Village"`               | `tenant.name` via Setting or prop                    |

## B. Locale JSON — Tenant-Name Literals (All 4 Languages)

| #   | File                | Key                | en Value                                                       | af Value                                                        | xh Value                                                           | zu Value                                                           | Fix                                                                   |
| --- | ------------------- | ------------------ | -------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 8   | `common.json`       | `app.name`         | "Soralia Village"                                              | "Soralia Village"                                               | "Soralia Village"                                                  | "Soralia Village"                                                  | i18n `{{tenantName}}` interpolation                                   |
| 9   | `common.json`       | `footer.copyright` | "Soralia Village Homeowners Association. All rights reserved." | "Soralia Village Huiseienaarsvereniging. Alle regte voorbehou." | "I-Soralia Village Homeowners Association. Onke amagunya agcinwe." | "I-Soralia Village Homeowners Association. Onke amagunya agcinwe." | i18n `{{tenantName}}` interpolation (keep association in translation) |
| 10  | `conservation.json` | `title`            | "Soralia Nature Reserve"                                       | "Soralia Natuurreservaat"                                       | "iNdawo yoKugcina iSoralia"                                        | "INdawo yokugcina iSoralia"                                        | Setting key `branding.conservation_title` or interpolate              |
| 11  | `messages.json`     | `welcome`          | "Welcome to Soralia Village"                                   | "Welkom by Soralia Village"                                     | "Wamkelekile ku Soralia Village"                                   | "Siyakwemukela eSoralia Village"                                   | i18n `{{tenantName}}` interpolation                                   |

## C. Tenant Context / Provider — Fallback Defaults Leaking Soralia

| #   | File                 | Line | Issue                 | Fix |
| --- | -------------------- | ---- | --------------------- | --- | ------------------ | ----------------------------------------- |
| 12  | `TenantProvider.tsx` | 25   | Fallback `tenant.name |     | 'Soralia Village'` | Change fallback to empty string / generic |
| 13  | `TenantProvider.tsx` | 26   | Fallback `tenant.slug |     | 'soralia'`         | Change fallback to empty string / generic |

## D. Tenant Context Not Wired Into Target Components

| #   | File             | Observation                                            |
| --- | ---------------- | ------------------------------------------------------ |
| 14  | `Header.tsx`     | Zero imports of `useTenant`/`TenantProvider`/`tenant.` |
| 15  | `Footer.tsx`     | Zero imports — but already uses `useContactSettings`   |
| 16  | `MapContent.tsx` | Zero imports — pure Leaflet with hardcoded data        |

## E. Supporting Findings

| #   | Finding                                     | Detail                                                                                                                    |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 17  | Setting model exists                        | `Setting(id, tenantId, key, value, ...)` with unique constraint on `(tenantId, key)` — confirmed via `onConflictDoUpdate` |
| 18  | Contact settings precedent confirmed        | `useContactSettings()` fetches `/api/settings/contact` → queries `settings` by tenantId                                   |
| 19  | i18n `{{var}}` interpolation already in use | Existing keys: `{{entity}}`, `{{name}}`, `{{count}}` — `{{tenantName}}` is natively supported                             |
| 20  | BrandingStep doesn't cover tagline/map      | Only collects logoUrl, primaryColor, accentColor, fontFamily — needs extension                                            |
| 21  | `LOCAL_TENANT_SLUG` fallback                | Falls back to `'soralia'` if env var not set (in `tenant-config/tenant.ts:8`)                                             |

## Decision Gate Status

| Gate   | Status                      | Decision                                                                                                                     |
| ------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **G1** | ✅ Resolved (implied by G2) | Option C — `Setting`-based key/value storage                                                                                 |
| **G2** | ✅ Resolved 2026-07-03      | No rich-text/Tiptap required — all tenant content is plain strings                                                           |
| **G3** | ✅ Resolved 2026-07-03      | Generic platform placeholder: "Netcomplex Demo Village" (logo TBD). Tenant-neutral, never resolves to any real tenant's data |
| **G4** | ✅ Resolved 2026-07-03      | Logged as separate BD issues, excluded from this advisory's execution                                                        |

## Escalation Note

All findings match the advisory's assumptions. No unexpected root causes (e.g., build-time env var baking) discovered. The `Setting` model has no pre-existing `branding.*` or `map.*` keys.

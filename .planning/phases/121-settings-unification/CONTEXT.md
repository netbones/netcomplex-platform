# Phase 121: Settings Unification & Integration Testing

## Background

The settings architecture spans 5 loosely-coupled modules across 3 FSD layers:

- `shared/lib/settings/types.ts` — `SettingValueMap` type (25 keys, partial coverage)
- `shared/lib/settings/validation.ts` — Zod schemas (31 keys, hardcoded list)
- `shared/lib/settings/defaults.ts` — `DEFAULT_PAGE_FLAGS` defaults
- `entities/tenant/api/settings.ts` — `SETTINGS_KEYS` enum (40+ constants)
- `entities/tenant/api/flags/platform-flags.ts` — `FLAG_DEFS` data structure + getters/setters

After the phase 6 data-driven refactor (`soralia-village-7dfv`), `platform-flags.ts` uses `FLAG_DEFS` as its source of truth, but the underlying key list, validators, types, and defaults still live in separate files with partial overlap.

## Related Artifacts

- `SETTINGS_REPORT.md` — Full architecture review (findings 7.4-7.12, items 10/14/15)
- `src/entities/tenant/api/flags/platform-flags.ts` — Current FLAG_DEFS (post-refactor)
- `src/shared/lib/settings/validation.ts` — SETTINGS_VALUE_SCHEMAS
- `src/shared/lib/settings/types.ts` — SettingValueMap + getTypedSetting()
- `src/shared/lib/settings/defaults.ts` — DEFAULT_PAGE_FLAGS
- `src/entities/tenant/api/settings.ts` — SETTINGS_KEYS

## Scope

Three related objectives, delivered as one phase with 3 plans:

### Plan 1: Single Source of Truth (SSOT)

Merge the 5 settings definition files into one data-driven SSOT. Define settings as a typed array/record that generates: key constants, Zod validators, TypeScript types, and defaults. Eliminate partial coverage and manual sync between files.

### Plan 2: Integration Test Suite

Add integration tests verifying the full settings lifecycle: REST mutation → cache invalidation → ISR re-render → client reads fresh data. Cover all 6 mutation endpoints and the 2 read endpoints.

### Plan 3: REST/tRPC Surface Assessment

Audit the current dual-surface state (REST + tRPC) and produce a migration roadmap. Document which surface is canonical for each operation, identify gaps, and produce a phased migration plan (or a decision to consolidate on one surface).

## Stakeholders

- Admin users changing settings via PageSettingsWidget
- Admin users changing settings via REST API
- Platform gate (useGateContext → usePageFlags → /api/flags)
- ISR-cached pages (dashboard, admin, public pages)

## Decisions Made

- Phase 3 (REST/tRPC assessment) is a research/planning deliverable, not implementation. Full migration is too large for this phase.
- The SSOT design must be backward-compatible — no consumer breakage.
- Integration tests use Vitest with mocked `next/cache` for ISR verification.

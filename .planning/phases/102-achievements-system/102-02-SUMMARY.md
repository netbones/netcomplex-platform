# Plan 102-02: API + Admin Configuration — SUMMARY

**Status:** Complete
**Completed:** 2026-06-23

## What Was Built

### Resident API Routes

**GET /api/achievements** — List all enabled achievements with unlock status

- Queries AchievementDefinition LEFT JOIN TenantAchievement (tenant-scoped)
- Treats missing TenantAchievement as "enabled by default" (per Pitfall 2)
- Filters out disabled achievements (TenantAchievement.enabled = false)
- LEFT JOIN UserAchievement for unlock status
- Returns: `{ id, key, label, description, icon, category, threshold, unlocked, unlockedAt }`
- Uses getRLSContext + runWithRLS for tenant isolation

**GET /api/achievements/progress** — Current user's progress counters

- Queries UserAchievementProgress JOIN AchievementDefinition
- Respects TenantAchievement.enabled filter
- Returns: `{ definitionKey, label, count, threshold, percentage }`
- percentage = Math.min(100, Math.round(count/threshold \* 100))

### Admin API Route

**PATCH /api/admin/achievements/[id]** — Configure achievement per tenant

- Auth: getSessionAndRole + hasPermission('admin')
- Rate limit: 20 requests per 60s window
- Body: `{ enabled?, customThreshold?, icon?, category? }`
- Upserts TenantAchievement using onConflictDoUpdate pattern
- Updates AchievementDefinition for icon/category changes
- Does NOT delete UserAchievement rows when disabling (per D-11)
- Writes audit log: ACHIEVEMENT_CONFIG_CHANGED
- Zod validation on body

### Supporting Changes

- Added `ACHIEVEMENT_CONFIG_CHANGED` to `AuditAction` type in `src/shared/api/audit-log.ts`

## Verification

- TypeScript compiles clean on all 3 route files
- ESLint passes

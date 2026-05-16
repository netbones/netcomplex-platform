# Phase 22 Verification: Page Flag Expansion

## VERIFICATION FAILED (ISSUES FOUND)

**Phase:** 22-page-flag-expansion
**Plans checked:** 3
**Issues:** 2 blocker(s), 1 warning(s)

### Blockers (must fix)

**1. [task_completeness] Public Surveys page is missing**
- **Plan:** 22-03
- **Task:** 1
- **Description:** Task 1 intends to add "surveys" to `BASE_NAV`, but there is currently no public surveys page in `src/app` (only admin pages exist). Adding this link will result in a 404 for users.
- **Fix:** Either add a task to create a basic `src/app/surveys/page.tsx` stub, or remove "surveys" from the navigation expansion until the page is implemented.

**2. [nyquist_compliance] Incorrect automated verification command and missing test updates**
- **Plan:** 22-01
- **Task:** 1
- **Description:** The automated verify command `npx vitest src/entities/tenant/api/flags/platform-flags.ts` points to the implementation file instead of the existing test file `src/test/platform-flags.test.ts`. Additionally, the plan does not include a task to update the existing tests to cover the 6 new flags.
- **Fix:** Update the command to point to `src/test/platform-flags.test.ts` and add an action step to Task 1 to update the test file with the new flag keys and expected structure.

### Warnings (should fix)

**1. [correctness] Potential href mismatch for Competitions**
- **Plan:** 22-03
- **Task:** 1
- **Description:** The existing competition page is located at `/competition` (singular), but the plan refers to it as "competitions" (plural), which may lead to an incorrect href being used in `BASE_NAV`.
- **Fix:** Explicitly specify `href: '/competition'` and `label: 'competitions'` for the competition entry in `BASE_NAV`.

## Structured Issues

```yaml
issues:
  - plan: "22-03"
    dimension: "task_completeness"
    severity: "blocker"
    description: "Public /surveys page does not exist; adding it to BASE_NAV will cause 404"
    task: 1
    fix_hint: "Create a public survey page stub or defer navigation entry"

  - plan: "22-01"
    dimension: "nyquist_compliance"
    severity: "blocker"
    description: "Automated verify command points to implementation file; missing test updates for new flags"
    task: 1
    fix_hint: "Point vitest to src/test/platform-flags.test.ts and include test updates in action"

  - plan: "22-03"
    dimension: "correctness"
    severity: "warning"
    description: "Existing competition page is singular (/competition), plan uses plural"
    task: 1
    fix_hint: "Use href: '/competition' in BASE_NAV"
```

## Dimension 8: Nyquist Compliance

### Automated Verify Coverage
| Task | Plan | Wave | Automated Command | Latency | Status |
|------|------|------|-------------------|---------|--------|
| Expand Settings and Flag Logic | 22-01 | 1 | `npx vitest src/entities/tenant/api/flags/platform-flags.ts` | ~2s | ❌ FAIL (Points to impl) |
| Update Flag APIs and Hook | 22-01 | 1 | `curl -s http://localhost:3000/api/flags \| jq '.flags'` | ~1s | ✅ PASS |
| Update Admin Page Settings Widget | 22-02 | 2 | `grep -E "groups\|services\|resources\|maintenance\|surveys\|competitions" src/widgets/admin/ui/PageSettingsWidget.tsx` | ~1s | ✅ PASS |
| Update Localizations | 22-02 | 2 | `grep -r "surveys" public/locales/` | ~1s | ✅ PASS |
| Update Header and MobileMenu | 22-03 | 3 | `grep -E "groups\|services\|resources\|maintenance\|surveys\|competitions" src/shared/ui/Header.tsx` | ~1s | ✅ PASS |
| Update Footer Navigation | 22-03 | 3 | `grep "usePageFlags" src/shared/ui/Footer.tsx` | ~1s | ✅ PASS |

### Sampling Continuity Check
Wave 1: 2/2 tasks verified → ✅ PASS
Wave 2: 2/2 tasks verified → ✅ PASS
Wave 3: 2/2 tasks verified → ✅ PASS

### Wave 0 Completeness
- N/A (Tests already exist but need update)

### Overall Nyquist Status: ❌ FAIL

### Revision Instructions
1. Update Plan 22-01 Task 1 to include updating `src/test/platform-flags.test.ts` with the 6 new flags.
2. Update Plan 22-01 Task 1 verify command to `npx vitest src/test/platform-flags.test.ts`.


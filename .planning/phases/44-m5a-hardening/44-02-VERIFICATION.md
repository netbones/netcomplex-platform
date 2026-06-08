# Plan 44-02: PostHog Observability Stack — Verification

**Verified:** 2026-06-08
**Plan:** 44-02-PLAN.md (adapted — PostHog stack)
**Branch:** phase-44-02-monitoring (commit 604f3ab)

---

## VERIFICATION PASSED

All checks pass. No blockers. All prior revision issues confirmed fixed.

---

## Prior Fixes Verified

| Issue | Status | Detail |
|-------|--------|--------|
| **B1** — Stale "Check Sentry" in signal set | ✅ **FIXED** | Line 192 now reads: `Check Vercel Monitoring 5xx` |
| **W1** — `next.config.mjs` missing from `files_modified` | ✅ **FIXED** | Line 16 includes `next.config.mjs` |
| **W2** — `/ingest` rewrite rule missing from Task 3 | ✅ **FIXED** | Task 3 action includes both `instrumentationHook: true` and `/ingest` rewrite. Verify (lines 403-404) and acceptance criteria (lines 420-423) check both. |
| **W3** — UI-SPEC.md D4 not documented as superseded | ✅ **FIXED** | Line 100 explicitly declares `UI-SPEC.md D4 (Observability Surfaces) is superseded` |

---

## Dimension Checks

### 1. PostHog correctness
| Setting | Present? | Location |
|---------|----------|----------|
| `defaults: '2026-01-30'` | ✅ | Lines 173, 234, 347, 362 |
| `autocapture: true` | ✅ | Lines 175, 349, 364, 398 |
| `capture_pageview: false` | ✅ | Lines 174, 348, 361, 363, 402 |
| `api_host: '/ingest'` | ✅ | Lines 90, 172, 346, 362, 401, 484, 507, 519 |
| `maskAllInputs: true` | ✅ | Lines 177, 351, 365, 397 |
| `maskTextSelector: '*'` | ✅ | Lines 178, 352, 365, 398 |
| PostHogProvider | ✅ | Lines 483-495 (Task 4), verify at 515 |
| PostHogPageView | ✅ | Lines 488, 506, 516, 528 |
| Inside `<Suspense fallback={null}>` | ✅ | Line 487-489, 520 |
| No hardcoded API keys | ✅ | Env var `NEXT_PUBLIC_POSTHOG_PROJECT_KEY` |

### 2. Sentry references (plan tasks only)
All 6 Sentry references are in **legitimate** contexts:
- **Line 80**: Explains PostHog replaces Sentry (rejected alternative)
- **Line 100**: Explains D4 was written for Sentry stack and is now superseded
- **Line 141**: Instructs executor to recompute for PostHog instead of Sentry
- **Line 157**: Lists Sentry as rejected alternative in decision doc §1
- **Lines 238, 572**: Says decision doc explains Sentry replacement

**Zero stale Sentry references in task actions, verify blocks, or acceptance criteria.**

### 3. Rewrite rule completeness (Task 3)
| Aspect | Present? | Location |
|--------|----------|----------|
| `instrumentationHook: true` add | ✅ | Lines 367-372 (action), 403 (verify), 420 (acceptance) |
| `/ingest` rewrite rule | ✅ | Lines 374-385 (action), 404 (verify), 421-423 (acceptance) |
| Merge with existing rewrites | ✅ | Line 387 (merge instruction) |

### 4. Task completeness
| Task | Type | Files | Action | Verify | Done | Acceptance | 
|------|------|-------|--------|--------|------|------------|
| 1 | auto | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | auto | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | auto | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | auto | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | checkpoint | ✅ | ✅ | ✅ | ✅ | ✅ |

### 5. Scope sanity
- 4 auto tasks (warning threshold but acceptable — documentation-heavy, low complexity)
- 1 checkpoint task (human-verify gate)
- 5 files total (4 new, 1 modified) — within budget

### 6. Context compliance (44-CONTEXT.md)
- **Acceptance criterion**: `.planning/observability-soak-M5.md` documents the monitoring stack for the 7-day soak — ✅ Task 1 creates this
- **No locked decisions contradicted**: ✅
- **No deferred ideas included**: ✅
- **Scope properly defined**: ✅

### 7. Dependency correctness
- Wave 1, `depends_on: []` — ✅ valid
- Plan is standalone, no forward references to non-existent plans

### 8. Others
- **Dimension 7c** (Architectural tier): SKIPPED — no `## Architectural Responsibility Map` in RESEARCH.md (RESEARCH.md is Sentry-era; plan overrides it)
- **Dimension 8** (Nyquist): SKIPPED — no VALIDATION.md (not applicable for documentation/config plan)
- **Dimension 11** (Research resolution): SKIPPED — no `## Open Questions` H2 in RESEARCH.md (H3 text is Sentry-specific and resolved by stack change)
- **Dimension 12** (Pattern compliance): SKIPPED — no PATTERNS.md

---

## Verdict

```json
{
  "overall": "PASS",
  "prior_fixes_verified": {
    "B1_sentry_leak": "FIXED",
    "W1_files_modified": "FIXED",
    "W2_rewrite_rule": "FIXED",
    "W3_ui_spec_d4": "FIXED"
  },
  "new_findings": [],
  "next_action": "merge"
}
```

Plans verified. Proceed to execute plan 44-02.

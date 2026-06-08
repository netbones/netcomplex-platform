# Plan 44-02 Verification Report

**Phase:** 44 (m5a-hardening)
**Plan:** 44-02 — PostHog Observability Stack + Soak Decision Doc
**Adapted from:** Original Sentry + @vercel/otel plan → PostHog
**Verified:** 2026-06-08
**Verdict:** ISSUES FOUND — 1 blocker, 3 warnings, 1 info

---

## Summary

The plan is well-structured and the PostHog adaptation is 95% coherent. However, one Sentry reference survived the adaptation in a critical location (the soak signal set table), which would confuse the M5b launch team and contradict the ratified stack. Additionally, the frontmatter is inconsistent about `next.config.mjs` modifications, the reverse-proxy implementation has no code path, and the UI-SPEC D4 contract is stale.

---

## Dimension 1: Goal-Backward Alignment

**Verdict: PASS**

The plan's goal ("Ratify the Pino + PostHog observability stack...") derives correctly from Phase 44's acceptance criterion: "`.planning/observability-soak-M5.md` documents the monitoring stack for the 7-day soak" (44-CONTEXT.md line 76).

- The decision doc §1 explains WHY PostHog was chosen over Sentry (lines 155-156: "all-in-one platform", "simpler setup", "autocapture means zero instrumentation", "open-source friendly and cheaper"). This ratifies the user's decision without re-litigating. ✓
- `must_haves` are all user-observable truths, not implementation details. ✓
- Scope (decision doc + runbook + PostHog code) correctly matches the acceptance criterion. ✓

---

## Dimension 2: Frontmatter Validity

**Verdict: WARNING**

All required fields present: phase, plan, type, title, status, created, updated, wave, depends_on, files_modified, autonomous, schema_push_required, requirements. ✓

| Field | Value | Status |
|-------|-------|--------|
| phase | 44-m5a-hardening | ✓ |
| plan | 44-02 | ✓ |
| type | execute | ✓ |
| wave | 1 | ✓ |
| depends_on | [] | ✓ |
| autonomous | false | ✓ (Task 5 human-verify justifies) |
| schema_push_required | false | ✓ (no schema changes) |

**⚠️ `next.config.mjs` missing from `files_modified`:** Task 3's action (line 369) says: *"if `instrumentationHook: true` is not already present, add it to the Next.js config."* This modifies `next.config.mjs`, but the file is NOT listed in the frontmatter `files_modified` field (lines 11-15). The plan may modify 5 files but declares only 4. Fix: add `next.config.mjs` to `files_modified`.

---

## Dimension 3: PostHog-Specific Correctness

**Verdict: PASS (with warnings — see other dimensions)**

### Code correctness checks:

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `defaults: '2026-01-30'` | Present in instrumentation-client.ts | Yes (line 345) | ✓ |
| `capture_pageview: false` | Present | Yes — prevents double-count with PostHogPageView | ✓ |
| `api_host: '/ingest'` | Default in init + matching in layout | Yes (lines 343-344, 463) | ✓ |
| `session_recording.maskAllInputs` | `true` | Yes (line 349) | ✓ |
| `session_recording.maskTextSelector` | `'*'` | Yes (line 350) | ✓ |
| `autocapture` | `true` | Yes (line 347) | ✓ |
| `register()` export | Correct function name for instrumentation-client.ts | Yes (line 340) | ✓ |
| `PostHogProvider` from `@posthog/next` | Imported | Yes (line 444) | ✓ |
| `PostHogPageView` inside `<Suspense>` | Inside Suspense boundary | Yes (lines 466-468) | ✓ |
| `bootstrapFlags` on Provider | Passed to PostHogProvider | Yes (line 464) | ✓ |
| `api_host` consistency | Same value in init + layout | Both `/ingest` | ✓ |
| No hardcoded API keys | Uses `process.env.NEXT_PUBLIC_POSTHOG_PROJECT_KEY` | Yes (lines 343, 487) | ✓ |
| `typeof window !== 'undefined'` guard | Prevents SSR errors | Yes (line 341) | ✓ |
| `instrumentationHook: true` in next.config.mjs | Task 3 checks and adds if missing | Mentioned in action (line 369) | ✓ |

### Recommended mkdocs consistency improvements (above threshold — see Dimension 6 for the critical one):

None beyond what's flagged in Dimension 6.

---

## Dimension 4: Task Quality

**Verdict: BLOCKER**

All 5 tasks have `<read_first>`, `<action>`, `<verify>`, `<acceptance_criteria>`, and `<done>` elements. Task 5 is correctly typed `checkpoint:human-verify` with `gate="blocking"`.

**❌ BLOCKER — Task 1 action contains stale Sentry reference in signal set table (line 190):**

```
| Server error rate | < 1% | > 1% for 5 min | Check Sentry (post-migration) or Vercel Monitoring 5xx | Vercel Monitoring |
```

This row references **Sentry**, which no longer exists in the stack. The PostHog adaptation replaced Sentry with PostHog Errors (client-side) and Vercel Monitoring (server-side). The `"post-migration"` parenthetical also implies an in-progress migration that doesn't apply. The "Client JS error rate" row correctly references PostHog, but this server-side row was not updated.

**Impact:** The decision document §6 will be written with a non-existent tool reference. The M5b launch team will search for "Sentry" when responding to a server error alert and find nothing. This contradicts the ratified stack (Pino + PostHog).

**Fix:** Change to: `"Check Vercel Monitoring 5xx"` (remove all Sentry references).

### Other task quality observations:

- **Task 1 action** — well-structured with 11 explicit sections, concrete requirements per section. ✓
- **Task 1 action §6 signal set** — the "Check Sentry (post-migration)" is the only stale reference in an otherwise correct table (6/7 rows correctly reference PostHog/Vercel). ❌
- **Task 3 action** — provides exact code, explains each init option. ✓
- **Task 3 verify** — does NOT check for `instrumentationHook: true` in `next.config.mjs`. The acceptance criteria (line 401) lists it but the verify block (lines 376-387) doesn't check for it. ⚠️
- **Task 5** — comprehensive `<how-to-verify>` with 5 clear steps. ✓

---

## Dimension 5: Threat Model (ASVS L1)

**Verdict: PASS**

The plan has a dedicated threat model section (lines 109-121) with a 5-row table covering PostHog-specific threats:

| Threat | Mitigation | Status |
|--------|-----------|--------|
| PII leakage via autocapture | `maskAllInputs: true`, `maskTextSelector: '*'`, `.ph-no-capture` | ✓ |
| Reverse-proxy misconfig | Env var verification | ✓ |
| Unauthorized dashboard access | PostHog RBAC, no external links | ✓ |
| PII in alert text | `$event_type` only alerts | ✓ |
| CDN compromise | npm bundle, not CDN | ✓ |

All mitigations are concrete, code-level (Tasks 3-4), and documented in decision doc §5. No high-severity blockers. The threat model was clearly adapted for PostHog (not a copy of a Sentry model) — it references `maskAllInputs`, `maskTextSelector`, `.ph-no-capture` which are PostHog-specific.

---

## Dimension 6: PostHog vs Sentry Migration Completeness

**Verdict: BLOCKER**

The adaptation from Sentry + @vercel/otel to PostHog is 97% complete. Here is the audit:

| Artifact | Sentry references before fix | Status |
|----------|------------------------------|--------|
| Plan "Why this plan exists" | 1 (contextual — "PostHog replaces Sentry") | ✓ (correct — explains the switch) |
| Plan §1 Decision Summary instructions | 1 (contextual — "rejected alternatives") | ✓ (correct — lists as rejected) |
| **Task 1 signal set table** | **1 (operational — "Check Sentry")** | **❌ STALE** |
| Task 2 runbook instructions | 0 | ✓ |
| Task 3 code | 0 | ✓ |
| Task 4 layout code | 0 | ✓ |
| Threat model | 0 | ✓ (adapted for PostHog) |

**❌ BLOCKER — Signal set table (line 190):** `"Check Sentry (post-migration)"` must be removed and replaced with the PostHog-equivalent or Vercel Monitoring-only reference.

The RESEARCH.md §3 recommended Sentry + @vercel/otel — the plan acknowledges this is overridden (line 79: "PostHog replaces Sentry + @vercel/otel from the original 44-RESEARCH.md §3 research"). ✓

---

## Dimension 7: Context Compliance (44-CONTEXT.md)

**Verdict: PASS**

The locked decision from CONTEXT.md is: "`.planning/observability-soak-M5.md` documents the monitoring stack for the 7-day soak" (line 76). The plan directly delivers this. ✓

No deferred ideas are included. ✓
Discretion areas handled appropriately (monitoring stack choice → PostHog with rationale). ✓

---

## Dimension 7b: Scope Reduction Detection

**Verdict: PASS**

No scope reduction language detected. The plan does not use "v1", "simplified", "static for now", etc., to deliver a reduced version of any requirement. Deferred items (group analytics, feature flags) are properly listed in "Out of scope" and tagged as deferred/not needed for M5b.

---

## Dimension 7c: Architectural Tier Compliance

**Verdict: PASS** (no Architectural Responsibility Map found in RESEARCH.md — original map from §3.1 was Sentry-specific and is overridden by the stack change)

The plan correctly places PostHog in the Browser/Client tier (client-side analytics, session recording, autocapture) and acknowledges server-side gaps (server errors → Vercel Monitoring, server logs → Pino). This is consistent with the implicit tier mapping from the signal set.

---

## Dimension 8: Nyquist Compliance

**Verdict: INFO**

The plan has `<verify>` blocks with shell commands (`test -f`, `wc -l`, `grep -q`) but no `<automated>` test commands. The strategy is appropriate for configuration/documentation work — there's no application logic to unit test.

- No Wave 0 test files needed (config-only deliverables). ✓
- `pnpm typecheck` is listed as a plan-level quality gate. ✓
- The grep-based verification is sufficient for code that is essentially initialization configuration.

**Note:** If the project requires Nyquist Wave 0 test scaffolding for all plans, this plan would need a Wave 0 task for a PostHog init smoke test (`pnpm test` that verifies `posthog.init()` accepts the config). However, this is config wiring, not application logic.

---

## Dimension 9: Cross-Plan Data Contracts

**Verdict: PASS** (N/A — no shared data pipelines with other plans in this phase)

---

## Dimension 10: AGENTS.md Compliance

**Verdict: PASS**

| Check | Status |
|-------|--------|
| pnpm commands (not npm) | ✓ |
| No hardcoded API keys/secrets | ✓ (uses env vars) |
| FSD file structure respected | ✓ (instrumentation-client.ts at src root, layout.tsx in app dir) |
| Error boundaries referenced | ✓ (PostHogPageView in Suspense, prevents useSearchParams errors) |
| TypeScript strict | ✓ (code shows full typing) |
| Session completion protocol | ✓ (SUMMARY.md, merge, push per worktree lifecycle) |

The plan uses `pnpm typecheck` while AGENTS.md quality gates section (line 861) says `npm run typecheck` — this is a pre-existing AGENTS.md inconsistency, not a plan issue. The plan correctly uses pnpm which is the project standard.

---

## Dimension 11: Research Resolution

**Verdict: PASS**

RESEARCH.md §10.3 has "Open questions for discuss-phase" — not a `## Open Questions` section with `(RESOLVED)` suffix. The section title differs from what the dimension checks for, so it's technically N/A. Practically, the Sentry-related questions (Sentry org setup, Vercel plan tier) are resolved by the stack change to PostHog, and the plan documents this.

---

## Dimension 12: Pattern Compliance

**Verdict: SKIPPED** (no PATTERNS.md exists for this phase)

---

## Blocking Findings

### B1: Stale Sentry reference in soak signal set (Dimensions 4, 6)
- **Location:** Plan line 190, Task 1 action §6 signal set table
- **Text:** `"Check Sentry (post-migration) or Vercel Monitoring 5xx"`
- **Severity:** BLOCKER
- **Why:** The plan replaces Sentry with PostHog, but this server-error signal row still references Sentry. The decision document will be written with a non-existent tool. When a server error alert fires during the soak, the M5b launch team will look for a Sentry dashboard that doesn't exist. Contradicts the ratified stack (Pino + PostHog).
- **Fix:** Change to `"Check Vercel Monitoring 5xx"`. Remove the Sentry + parenthetical entirely.

---

## Warning Findings

### W1: `next.config.mjs` not in `files_modified` (Dimension 2)
- **Location:** Plan frontmatter lines 11-15
- **Severity:** WARNING
- **Why:** Task 3 action (line 369) says to add `instrumentationHook: true` to `next.config.mjs` if missing, but this file is not listed in `files_modified`. The plan may modify 5 files but declares only 4.
- **Fix:** Add `next.config.mjs` to the `files_modified` list.

### W2: Reverse proxy implementation gap (Dimension 3)
- **Location:** Plan must_haves line 34 + Task 3 action + decision doc §10 Open Question #1
- **Severity:** WARNING
- **Why:** The must_have says "PostHog reverse proxy is configured (api_host: '/ingest')" but no task implements the `next.config.mjs` rewrite rule for `/ingest` → PostHog cloud. The issue is deferred to Open Question #1 with no code path. If the human doesn't resolve it, events will fail to send when `NEXT_PUBLIC_POSTHOG_HOST` is unset and no rewrite exists.
- **Fix:** Either (a) add a Task 3 sub-step to create the `/ingest` rewrite rule in `next.config.mjs`, or (b) document that the env var fallback (`NEXT_PUBLIC_POSTHOG_HOST`) is the primary path and `/ingest` is optional.

### W3: UI-SPEC D4 observability section is stale (Dimension 7)
- **Location:** 44-UI-SPEC.md lines 196-221 (Observability Surfaces table)
- **Severity:** WARNING
- **Why:** The approved UI design contract references Sentry + @vercel/otel as the 44-02 stack. The D4 dimension lists `skipOpenTelemetrySetup` and `sendDefaultPii: false` as critical config — both Sentry-specific. The plan should document that D4 is superseded by the PostHog stack choice.
- **Fix:** Add a note in the plan's "Why this plan exists" section: "The approved UI-SPEC.md §D4 references the original Sentry + @vercel/otel stack; this plan supersedes that section. See 44-02-PLAN.md for the ratified stack (Pino + PostHog)."

---

## Info Findings

### I1: Verify blocks lack `<automated>` commands (Dimension 8)
- **Location:** All task `<verify>` blocks use shell commands, not `<automated>` test commands
- **Severity:** INFO
- **Why:** Appropriate for config-only work (no application logic to unit test), but technically fails Nyquist Check 8a. If Wave 0 test scaffolding is a project requirement, add a Task 0 to create a PostHog init smoke test.
- **Fix (optional):** Add Wave 0 task for `pnpm test` that verifies `posthog.init()` accepts the config object without throwing.

---

## Structured Issues

```yaml
issues:
  - dimension: posthog_migration_completeness
    severity: blocker
    description: "Signal set table in Task 1 action (line 190) references Sentry: 'Check Sentry (post-migration) or Vercel Monitoring 5xx'. Stack is Pino + PostHog — Sentry does not exist in the plan."
    plan: "44-02"
    task: 1
    fix_hint: "Change to 'Check Vercel Monitoring 5xx'. Remove Sentry reference entirely."

  - dimension: frontmatter_validity
    severity: warning
    description: "next.config.mjs is modified by Task 3 (add instrumentationHook: true) but is not listed in files_modified frontmatter."
    plan: "44-02"
    fix_hint: "Add next.config.mjs to files_modified list."

  - dimension: posthog_correctness
    severity: warning
    description: "Must_have claims 'PostHog reverse proxy is configured (api_host: /ingest)' but no task implements the next.config.mjs rewrite rule for /ingest → PostHog cloud. Defers to Open Question #1 with no code path."
    plan: "44-02"
    fix_hint: "Add /ingest rewrite to Task 3 action, or document env var fallback as primary path."

  - dimension: context_compliance
    severity: warning
    description: "44-UI-SPEC.md §D4 Observability Surfaces table references the original Sentry + @vercel/otel stack (skipOpenTelemetrySetup, sendDefaultPii). This plan replaces that stack with PostHog but doesn't document the override."
    plan: "44-02"
    fix_hint: "Add note in plan that UI-SPEC D4 is superseded by the PostHog stack choice."

  - dimension: nyquist_compliance
    severity: info
    description: "Verify blocks use shell commands (grep/wc) not <automated> test commands. Appropriate for config-only work but technically fails Nyquist Check 8a."
    plan: "44-02"
    fix_hint: "Optional: add Wave 0 task for a PostHog init smoke test."
```

---

## Recommendation

**REVISE** — 1 BLOCKER must be fixed before execution.

The Sentry reference leak (B1) is a single-line fix: change `"Check Sentry (post-migration) or Vercel Monitoring 5xx"` to `"Check Vercel Monitoring 5xx"` on line 190 of the plan.

The three warnings (W1-W3) should also be addressed:
1. Add `next.config.mjs` to `files_modified`
2. Either add the `/ingest` rewrite task or document the env var primary path
3. Add a note about UI-SPEC D4 being superseded

After these fixes, re-verify. Expected time: ~5 minutes for the planner to apply the fixes.

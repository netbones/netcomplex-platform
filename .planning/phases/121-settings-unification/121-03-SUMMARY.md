# 121-03 Summary: REST/tRPC Surface Assessment

**Status:** Complete
**Date:** 2026-06-30

## Result

Produced `REST-TRPC-ASSESSMENT.md` — a comprehensive audit of the dual REST/tRPC settings surface with a 3-phase consolidation roadmap.

### Key Findings

- **13 REST endpoints** vs **5 tRPC procedures** — 3 operations duplicated across surfaces
- **tRPC gaps:** No rate limiting, no AssistScope guards, no RLS support — all present in REST
- **REST gaps:** No soft-delete, no OpenAPI metadata — both only in tRPC

### Decision

**Recommend consolidating on REST as canonical surface, deprecating tRPC.**

Reasons:

1. Page-flags, services-config, and provider-registration-mode are REST-only (most active admin features)
2. REST has richer guarantees (rate limiting, AssistScope, tag-based ISR revalidation)
3. Admin UI already calls REST directly — no tRPC consumers for settings

### Migration Roadmap

| Phase              | Scope                                                       | Effort |
| ------------------ | ----------------------------------------------------------- | ------ |
| A — Feature Parity | Add `DELETE /api/settings/[key]`, add rate limiting to tRPC | 2-3h   |
| B — Deprecate tRPC | Mark procedures `@deprecated`, add REST migration comments  | 1-2h   |
| C — Remove tRPC    | Remove router, migrate callers                              | 1-2h   |

**Deferred to follow-up BD issue.** Phase 121 only includes assessment.

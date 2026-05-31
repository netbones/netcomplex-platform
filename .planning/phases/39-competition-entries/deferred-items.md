# Deferred Items — Phase 39

## Pre-existing Build Error

- **File:** `docs/prompts/trpc_caller_test_template.ts:16`
- **Error:** `Module '"@trpc/server"' has no exported member 'createCallerFactory'`
- **Root cause:** `createCallerFactory` was removed/renamed in tRPC v11 — this template file hasn't been updated
- **First observed:** Pre-dates Phase 39 (not in our diff)
- **Blocks:** `pnpm build`
- **Recommendation:** Update or remove this template file as its own fix task

# Taste

- Uses handoff / blame files (e.g. `BLAME.md`) to pass context between agent sessions and expects new agents to read them for continuity before proceeding. Confidence: 0.8
- Prefers verifying assumptions against actual system state (DB queries, migration records, git history) before making code changes or fixes — explicitly directs agents to "verify and check the state" rather than jumping straight to a fix. Confidence: 0.7
- Does scoped typechecks (`tsc --noEmit` on just the changed file) before committing a change. Confidence: 0.6
- Prefers surgical git commits — uses `git commit -o` with explicit file paths to avoid sweeping in unrelated staged files, then verifies the excluded files are still staged. Confidence: 0.6
- Holds off on shared-state actions (git push, mutating a shared dev DB) unless explicitly asked — even when project conventions (e.g. AGENTS.md) treat push as mandatory at session end. Confidence: 0.6
- Works on a Next.js App Router codebase using Better Auth for authentication and Drizzle ORM against Postgres, with a multi-tenant schema (`tenantId` on user) and FSD-style layering (`src/entities/<entity>/api/`, `src/app/api/` route handlers). Confidence: 0.65
- Expects replies in English (re-asked the question after receiving a Chinese-language reply). Confidence: 0.65
- Prefers persistent visual depth on UI cards — shadows should be visible at rest (`shadow-md`), not only on hover/motion, so elements clearly sit above the background. Confidence: 0.7
- Expects visual consistency across parallel/sibling components — when a treatment (background, shadow, layout) is applied to one dashboard layer, the same treatment should be replicated on the others. Confidence: 0.6

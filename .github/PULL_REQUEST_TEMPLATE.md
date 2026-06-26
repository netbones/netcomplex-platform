## Description

<!-- Briefly describe what this PR does -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] CI/Infrastructure

## TDD Verification

- [ ] Tests were written **before** implementation (Red → Green → Refactor)
- [ ] Tests cover: business logic / validation / query layer / API route (circle applicable)
- [ ] All existing tests pass (`pnpm vitest run`)
- [ ] Coverage has not regressed (`pnpm vitest run --coverage`)

## TDD Commit Pattern

If this PR implements new behavior, it should contain at minimum two commits:

1. `test: add failing tests for <feature>` — the Red phase
2. `feat: implement <feature>` — the Green phase

See `docs/STEERING/TDD.md` for the full workflow.

## Quality Gates

- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm run build` passes
- [ ] Schema drift check passes (`pnpm db:generate && git diff --exit-code src/db/schema/`)

## Related Issues

<!-- Link any related BD issues -->

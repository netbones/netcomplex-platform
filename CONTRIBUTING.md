# Contributing

## TDD Protocol

This project enforces **Test-Driven Development** for all new behavior.

### Commit Pattern

Every feature PR must contain at minimum these two commits:

```
test: add failing tests for <feature>   ← Red phase
feat: implement <feature>               ← Green phase
```

Optionally followed by a refactor commit:

```
refactor: clean up <feature>            ← Refactor phase
```

This pattern ensures tests define behavior before implementation — the core TDD cycle.

### When TDD is Required

| Area                         | Required    |
| ---------------------------- | ----------- |
| Business logic               | Yes         |
| Validation logic             | Yes         |
| Database query layers        | Yes         |
| Multi-tenant isolation       | Yes         |
| API route handlers           | Yes         |
| Utility functions            | Yes         |
| Custom hooks                 | Yes         |
| UI interactions              | Yes         |
| Pure presentation components | Recommended |

### Coverage Gates

Run before pushing:

```bash
pnpm vitest run --coverage
```

Coverage thresholds are enforced in `vitest.config.ts`. If coverage drops below threshold, the run fails.

### Full CI Pipeline

Every PR runs:

1. Schema drift check
2. OpenAPI lint
3. API tests
4. Full test suite with coverage

See `docs/STEERING/TDD.md` for the complete workflow reference.

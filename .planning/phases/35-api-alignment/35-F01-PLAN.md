---
phase: 35-api-alignment
plan: F01
type: execute
wave: 4
depends_on: ['35-D01', '35-D02', '35-E01']
files_modified:
  - src/test/api/auth.test.ts
  - src/test/api/maintenance.test.ts
  - src/test/api/bookings.test.ts
  - src/test/api/events.test.ts
  - src/test/api/content.test.ts
  - src/test/api/groups.test.ts
  - src/test/api/invitations.test.ts
  - src/test/api/notifications.test.ts
  - src/test/api/users.test.ts
  - src/test/api/households.test.ts
  - src/test/api/resources.test.ts
  - src/test/api/competitions.test.ts
  - src/test/api/community-services.test.ts
  - src/test/api/tenant.test.ts
  - src/test/api/platform-admin.test.ts
  - .github/workflows/api-ci.yml
  - .redocly.yaml
  - vitest.config.ts
autonomous: true
requirements:
  - API-TEST-01
  - API-CI-01

must_haves:
  truths:
    - 'Every domain API has unit/integration tests covering CRUD operations'
    - 'npx redocly lint runs in CI against the generated OpenAPI spec'
    - 'API tests run as part of the main test suite (vitest)'
    - 'OpenAPI generation is validated — a broken spec fails CI'
  artifacts:
    - path: 'src/test/api/'
      provides: 'Domain-level API test suites'
    - path: '.github/workflows/api-ci.yml'
      provides: 'CI workflow for API validation'
  key_links:
    - from: '.github/workflows/api-ci.yml'
      to: 'package.json'
      via: 'CI runs npm test and npx redocly lint'
    - from: 'src/test/api/*.test.ts'
      to: 'src/app/api/*/route.ts'
      via: 'Tests exercise route handlers with mocked session'
---

<objective>
Build comprehensive API test suites and wire OpenAPI CI validation.

Purpose: API.md §27 requires tests for every governed API. API.md §16.2 and tRPC.md §17 require OpenAPI CI validation via `npx redocly lint`. Currently only 3 test files exist for 85+ routes, and there's no CI validation for the OpenAPI spec.

This plan creates domain-level API test files covering auth, tenant isolation, validation, authorization, and happy-path scenarios for all major domains.

Output: Comprehensive API test suites + CI workflow for redocly lint + OpenAPI spec validation.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/API.md
@src/test/platform-admin.test.ts
@src/test/resources.test.ts
@src/test/competitions.test.ts
@src/test/schemas.test.ts
@src/shared/api/auth-utils.ts
@src/app/api/
@.github/workflows/translations.yml
</context>

<tasks>

<task type="auto">
<name>Task 1: Create API test infrastructure and 5 domain test files</name>
<files>src/test/api/auth.test.ts, src/test/api/maintenance.test.ts, src/test/api/bookings.test.ts, src/test/api/events.test.ts, src/test/api/invitations.test.ts</files>
<action>
**Step 1: Create test infrastructure pattern**

Create a shared test helper at `src/test/api/helpers.ts`:

```typescript
import { vi } from 'vitest';

// Common mock setup for API route tests
export function setupApiTestMocks() {
  // Mock server-only
  vi.mock('server-only', () => ({}));

  // Mock next/headers for tenant context
  vi.mock('next/headers', () => ({
    headers: vi.fn(() =>
      Promise.resolve({
        get: vi.fn((key: string) => {
          if (key === 'x-tenant-id') return 'test-tenant-id';
          if (key === 'x-tenant-slug') return 'test-tenant';
          return null;
        }),
      })
    ),
  }));

  // Mock auth
  vi.mock('@api/auth', () => ({
    auth: {
      api: {
        getSession: vi.fn(),
      },
    },
  }));

  // Mock db
  const dbMock = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  };

  vi.mock('@api/db', () => ({
    db: dbMock,
    // Schema exports needed by the route under test
  }));

  return { dbMock };
}

// Create a mock Request object
export function createMockRequest({
  method = 'GET',
  url = 'http://localhost:3000/api/test',
  body,
  headers = {},
}: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  const req = new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req;
}
```

**Step 2: Create domain test files**

Each test file follows this pattern:

1. **Auth tests** (`src/test/api/auth.test.ts`):
   - Auth endpoint returns 401 without session
   - Auth endpoint returns session with valid token
   - Rate limiting kicks in after N requests
   - Suspension status returned correctly

2. **Maintenance tests** (`src/test/api/maintenance.test.ts`):
   - GET returns 401 without auth
   - GET returns list with valid auth
   - GET filters by status
   - GET filters by tenant (tenant isolation)
   - POST creates request with valid data
   - POST rejects invalid data (validation error)
   - POST enforces tenant isolation

3. **Booking tests** (`src/test/api/bookings.test.ts`):
   - Similar pattern: CRUD, validation, tenant isolation, authorization

4. **Events tests** (`src/test/api/events.test.ts`):
   - Public GET returns events without auth
   - GET filters by upcoming/date
   - POST requires auth
   - POST validates input

5. **Invitations tests** (`src/test/api/invitations.test.ts`):
   - POST requires auth and permission
   - POST validates input
   - GET lists invitations for tenant
   - Accept/validate flows

For each test, use the canonical response envelope checks:

```typescript
expect(response.status).toBe(200);
const body = await response.json();
expect(body).toHaveProperty('success', true);
expect(body).toHaveProperty('data');
```

Follow the existing test patterns from `src/test/platform-admin.test.ts` for mocking approach.

**Step 3: Update vitest config** if needed to include `src/test/api/` in the test path patterns.
</action>
<verify>
<automated>find src/test/api -name '\*.test.ts' | wc -l | xargs echo "API test files:"; npx vitest run src/test/api/ --reporter=verbose 2>&1 | tail -20</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>5 domain API test files created and passing. Test infrastructure (helpers.ts) in place.</done>
</task>

<task type="auto">
<name>Task 2: Wire OpenAPI CI validation workflow</name>
<files>.github/workflows/api-ci.yml, .redocly.yaml</files>
<action>
**Create `.github/workflows/api-ci.yml`:**

```yaml
name: API Governance

on:
  pull_request:
    paths:
      - 'src/app/api/**'
      - 'src/shared/api/**'
      - 'src/server/**'
      - 'src/entities/**/api/**'
  push:
    branches: [main]
    paths:
      - 'src/app/api/**'
      - 'src/shared/api/**'
      - 'src/server/**'

jobs:
  openapi-lint:
    name: OpenAPI Specification Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Generate OpenAPI spec
        run: pnpm tsx src/server/openapi/generator.ts

      - name: Lint OpenAPI spec
        run: npx redocly lint --format=stylish

  api-tests:
    name: API Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run API tests
        run: pnpm vitest run src/test/api/ --reporter=verbose
```

**Update `.redocly.yaml`** if needed to reference the generated spec file location (if the generator writes to a file, configure redocly to read from there). The generator CLI output should write to a temp file:

Update `src/server/openapi/generator.ts` to also support CLI invocation:

```typescript
// If called directly (CLI), write spec to file
import { writeFileSync } from 'fs';
import { openApiDocument } from './generator';

if (require.main === module) {
  writeFileSync('openapi.json', JSON.stringify(openApiDocument, null, 2));
  console.log('OpenAPI spec written to openapi.json');
}
```

Update `.redocly.yaml`:

```yaml
apis:
  netcomplex@v1:
    root: ./openapi.json
    x-openapi-version: '3.0.0'
```

**Add CI badge or status check** to the README or project docs as a documentation note.

Add a `package.json` script if needed:

```json
"api:generate": "tsx src/server/openapi/generator.ts",
"api:ci": "pnpm api:generate && redocly lint"
```

</action>
<verify>
<automated>test -f .github/workflows/api-ci.yml && grep -q "redocly lint" .github/workflows/api-ci.yml && echo "CI workflow created"</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>CI workflow created with OpenAPI lint and API test jobs. Redocly config reads generated spec.</done>
</task>

</tasks>

<verification>
1. `npx vitest run src/test/api/` — all tests pass
2. `npx redocly lint` — passes against generated spec
3. `.github/workflows/api-ci.yml` — valid GitHub Actions syntax
4. CI runs on PR changes to API files
</verification>

<success_criteria>

- 5+ domain API test files with auth, validation, tenant isolation, and happy-path coverage
- Shared test infrastructure (helpers.ts) for route testing
- CI workflow with OpenAPI lint and API test jobs
- `npx redocly lint` passes
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-F01-SUMMARY.md`
</output>

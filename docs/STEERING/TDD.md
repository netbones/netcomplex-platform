# Test-Driven Development (TDD) Workflow

This document describes the TDD approach for Netcomplex and Soralia Village multi-tenant — a Next.js + TypeScript platform using Prisma for schema development and Drizzle ORM for runtime querying.

---

# Core Principles

1. **Write the test first**
   Tests define desired behavior before implementation.

2. **Red → Green → Refactor**
   - Red: failing test
   - Green: minimal passing implementation
   - Refactor: improve structure without changing behavior

3. **Test behavior, not implementation**
   Focus on public APIs, observable outputs, and domain guarantees.

4. **Database contracts are part of the domain**
   Schema integrity, tenant isolation, and relation consistency must be tested.

5. **Prisma is the schema authority**
   All database structures originate from `prisma/schema.prisma`.

6. **Drizzle is the runtime query layer**
   All application queries use Drizzle for edge compatibility and typed execution.

---

# Architecture-Aware TDD

## ORM Workflow

This project uses a hybrid ORM architecture:

| Concern            | Technology       |
| ------------------ | ---------------- |
| Schema definition  | Prisma           |
| Migrations         | Prisma Migrate   |
| Runtime querying   | Drizzle ORM      |
| Edge compatibility | Drizzle          |
| Type generation    | Prisma → Drizzle |

### Rules

- Define all models in `prisma/schema.prisma`
- Never manually edit generated Drizzle schema artifacts
- Use Drizzle for all application queries
- Validate generated schema contracts with tests
- Treat migrations as testable artifacts

---

# When to Use TDD

TDD is strongly recommended for:

| Area                         | Priority |
| ---------------------------- | -------- |
| Business logic               | High     |
| Validation logic             | High     |
| Database query layers        | High     |
| Multi-tenant isolation       | Critical |
| API route handlers           | High     |
| Utility functions            | High     |
| Custom hooks                 | Medium   |
| UI interactions              | Medium   |
| Pure presentation components | Lower    |

---

# Full Workflow

---

# 1. Identify the Behavior

Before writing code:

- What should the system do?
- What tenant constraints exist?
- What database guarantees are required?
- What edge cases exist?
- What permissions are involved?

Example:

```txt
A resident should only see maintenance requests for their tenant.
```

---

# 2. Write a Failing Test

## Business Logic Example

```ts
describe('calculateInvoiceTotal', () => {
  it('should apply VAT correctly', () => {
    expect(calculateInvoiceTotal(100, 0.15)).toBe(115);
  });
});
```

## Query Layer Example

```ts
describe('maintenance queries', () => {
  it('should only return requests for active tenant', async () => {
    const results = await getMaintenanceRequests(tenantId);

    expect(results.every(r => r.tenantId === tenantId)).toBe(true);
  });
});
```

## Schema Contract Example

```ts
describe('schema contracts', () => {
  it('should expose tenantId on tenant-bound tables', () => {
    expect(users.tenantId).toBeDefined();
    expect(groups.tenantId).toBeDefined();
    expect(events.tenantId).toBeDefined();
  });
});
```

---

# 3. Verify Failure (Red)

Run tests and confirm failure:

```bash
pnpm run test
pnpm run test:watch
```

The failure must clearly describe missing behavior.

---

# 4. Implement Minimal Code (Green)

## Schema Changes

1. Update Prisma schema

```prisma
model Event {
  id       String @id @default(cuid())
  tenantId String
}
```

2. Generate migration

```bash
pnpm prisma migrate dev
```

3. Generate Drizzle schema artifacts

```bash
pnpm prisma generate
```

---

## Query Implementation

Use Drizzle exclusively:

```ts
export async function getEvents(tenantId: string) {
  return db.select().from(events).where(eq(events.tenantId, tenantId));
}
```

---

# 5. Run Tests Again

```bash
pnpm run test
```

All tests must pass before refactoring.

---

# 6. Refactor

Allowed refactors:

- Query extraction
- Type improvements
- Relation simplification
- Performance optimization
- Transaction consolidation
- Hook extraction
- Component decomposition

Refactoring must NOT:

- Change tenant guarantees
- Alter schema behavior
- Break migrations
- Introduce untested query behavior

---

# 7. Validate Database Contracts

After schema changes:

```bash
pnpm prisma migrate deploy
pnpm prisma generate
pnpm run test
pnpm run lint
pnpm run typecheck
```

---

# Database Schema TDD

---

# Prisma-First Schema Development

All database changes begin in:

```txt
prisma/schema.prisma
```

Never:

- modify generated Drizzle schema manually
- bypass migrations
- add ad-hoc runtime tables

---

# Schema Contract Testing

Every major schema change should include:

| Test Type            | Purpose                      |
| -------------------- | ---------------------------- |
| Enum synchronization | Prevent Prisma/Drizzle drift |
| Nullable consistency | Prevent runtime mismatches   |
| Relation integrity   | Validate joins               |
| Tenant guarantees    | Enforce isolation            |
| Cascade behavior     | Prevent orphaned data        |

---

## Example Enum Test

```ts
describe('role enum', () => {
  it('should include platform_admin role', () => {
    expect(roleEnum.enumValues).toContain('platform_admin');
  });
});
```

---

## Example Relation Test

```ts
describe('user relations', () => {
  it('should associate profiles with users', async () => {
    const result = await db.query.users.findFirst({
      with: {
        profile: true,
      },
    });

    expect(result?.profile).toBeDefined();
  });
});
```

---

# Migration Testing

Every migration must be testable.

## Required Validation

```bash
pnpm prisma migrate reset --force
pnpm prisma generate
pnpm run test
```

CI should verify:

- migrations execute cleanly
- schema generates correctly
- Drizzle types compile
- relations remain valid

---

# Multi-Tenant Testing

Tenant isolation is a first-class invariant.

Every tenant-aware query should have tests.

---

## Example Tenant Isolation Test

```ts
describe('tenant isolation', () => {
  it('should never leak cross-tenant data', async () => {
    const tenantAResults = await getUsers(tenantA);
    const tenantBResults = await getUsers(tenantB);

    expect(tenantAResults.some(u => u.tenantId === tenantB)).toBe(false);
  });
});
```

---

# Query Layer Testing

Do NOT test Prisma clients directly.

Test Drizzle query behavior instead.

Preferred targets:

- repositories
- query builders
- service functions
- API handlers

Avoid:

- mocking Drizzle internals
- testing generated code directly

---

# API Route Testing

API routes should test:

- authentication
- authorization
- tenant isolation
- validation
- response shape
- cache invalidation

---

## Example API Test

```ts
describe('GET /api/events', () => {
  it('should return only tenant events', async () => {
    const response = await request(app).get('/api/events').set('Authorization', token);

    expect(response.status).toBe(200);

    expect(response.body.every((e: Event) => e.tenantId === tenantId)).toBe(true);
  });
});
```

---

# ISR & Cache Testing

When using ISR or revalidation:

Test:

- cache invalidation
- stale data replacement
- tag revalidation
- tenant-specific cache separation

---

## Example

```ts
describe('dashboard revalidation', () => {
  it('should invalidate dashboard cache after mutation', async () => {
    await createMaintenanceRequest(data);

    const cache = await getDashboardCache();

    expect(cache.invalidated).toBe(true);
  });
});
```

---

# Component Testing

Prefer behavior testing over snapshot testing.

Focus on:

- user interaction
- accessibility
- loading states
- error handling
- permission rendering

---

# Test Organization

---

# File Placement

```txt
src/
├── lib/
│   ├── validation.ts
│   └── validation.test.ts

├── db/
│   ├── queries/
│   │   ├── users.ts
│   │   └── users.test.ts

├── app/api/
│   ├── events/
│   │   ├── route.ts
│   │   └── route.test.ts
```

---

# Naming Conventions

```ts
describe('getTenantUsers', () => {
  it('should return only active tenant users', () => {});
});
```

---

# AAA Pattern

```ts
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

---

# Mocking Strategy

Mock only external systems:

- email providers
- payment providers
- Supabase realtime
- external APIs

Avoid mocking:

- business logic
- query composition
- validation logic

---

# Fixtures

```ts
export const mockTenant = {
  id: 'tenant-1',
  slug: 'soralia',
};

export const mockUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
};
```

---

# Coverage Targets

| Category       | Target |
| -------------- | ------ |
| Business logic | 90%+   |
| Query layer    | 90%+   |
| API routes     | 85%+   |
| Hooks          | 80%+   |
| Components     | 70%+   |
| Utilities      | 85%+   |

Coverage is not the goal.
Correctness and domain guarantees are the goal.

---

# CI Requirements

Every PR should run:

```bash
pnpm prisma generate
pnpm prisma migrate deploy
pnpm run lint
pnpm run typecheck
pnpm run test
```

---

# Common Pitfalls

---

## ❌ Testing Prisma Instead of Queries

Bad:

```ts
expect(prisma.user.findMany).toHaveBeenCalled();
```

Good:

```ts
expect(results).toHaveLength(3);
```

---

## ❌ Manual Drizzle Schema Edits

Generated schema files must never become source-of-truth.

Prisma owns the schema definition.

---

## ❌ Missing Tenant Tests

Every tenant-aware query requires isolation tests.

---

## ❌ Over-Mocking

Mock infrastructure boundaries, not domain behavior.

---

# Recommended Database Structure

As schema grows:

```txt
src/db/
├── schema/
│   ├── generated/
│   ├── relations/
│   ├── enums/
│   └── queries/
```

---

# Recommended Testing Stack

| Concern           | Tool                    |
| ----------------- | ----------------------- |
| Unit testing      | Vitest                  |
| Component testing | Testing Library         |
| API testing       | Supertest               |
| Mocking           | Vitest mocks            |
| E2E               | Playwright              |
| Database testing  | Testcontainers/Postgres |

---

# Development Commands

```bash
# Run tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:coverage

# Type checking
pnpm run typecheck

# Generate Prisma artifacts
pnpm prisma generate

# Apply migrations
pnpm prisma migrate dev

# Reset database
pnpm prisma migrate reset --force
```

---

# Final Principle

The database layer is part of the domain model.

In a multi-tenant architecture:

- schema integrity
- tenant isolation
- query correctness
- migration safety

are business requirements — not implementation details.

```

```

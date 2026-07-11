# BLUEPRINT: Dual ORM Strategy (Prisma Schema + Drizzle Query)

This project uses **Prisma for schema definition and migrations** + **Drizzle for all runtime queries**. The bridge is `prisma-generator-drizzle`, which auto-generates Drizzle table definitions from the Prisma schema.

## Why Two ORMs?

| Concern           | Handled By         | Rationale                                    |
| ----------------- | ------------------ | -------------------------------------------- |
| Schema definition | Prisma             | Best-in-class DX for schema design           |
| Migrations        | Prisma             | Mature, auditable migration files            |
| Runtime queries   | Drizzle            | Edge-compatible, lighter, faster             |
| DB browser        | Drizzle Kit Studio | Modern studio tooling                        |
| Auth adapter      | Drizzle            | Better Auth's `@better-auth/drizzle-adapter` |
| Seed scripts      | Drizzle            | Same runtime query engine                    |

**ADR-003** (see `docs/STEERING/ADR.md`) records this decision.

---

## Architecture

```
prisma/schema/
├── schema.prisma       ← SOURCE OF TRUTH: all models (except Tenant)
└── tenant.prisma       ← Tenant model + back-relations
        │
        ▼  pnpm db:generate  (runs prisma generate)
        │
src/db/schema/
├── *.ts                ← 309 auto-generated Drizzle tables + relations
├── *-relations.ts      ← Relations definitions
└── *-enum.ts           ← Enum definitions (81 files)
        │
        ▼  Imported by
        │
src/shared/api/db.ts    ← The bridge: connection pools, RLS helpers, re-exports
```

### Schema Change Flow

```
1. Edit prisma/schema/schema.prisma (or tenant.prisma)
2. pnpm db:generate      → prisma generate
   a. Generates Prisma Client
   b. Runs prisma-generator-drizzle → writes 300+ files to src/db/schema/
3. npx prisma migrate dev --name <description>
   → Creates a timestamped migration in prisma/migrations/
4. pnpm db:check         → verifies generated src/db/schema/ is committed
5. Commit everything: schema changes + generated files + migration
```

### Query Flow (Runtime)

```
src/shared/api/db.ts
├── db                   ← Main Drizzle instance (lazy Proxy singleton)
├── authDb               ← Separate pool for Better Auth (avoids concurrent-query warnings)
├── runWithRLS()         ← RLS-aware transaction wrapper
└── notDeleted()         ← Soft-delete filter helper
        │
        ▼  Used in application code
        │
import { db } from '@shared/api/db';
import { users } from '@schema/users';

const result = await db.select().from(users).where(eq(users.id, id));
```

---

## Setup (for other projects)

### 1. Install Dependencies

```bash
# Prisma (schema + migrations)
pnpm add -D prisma
pnpm add @prisma/client

# Drizzle (runtime queries)
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit

# The bridge
pnpm add -D prisma-generator-drizzle

# Re-exports / utilities
pnpm add drizzle-zod             # Zod schemas from Drizzle
pnpm add @better-auth/drizzle-adapter  # If using Better Auth
```

### 2. Configure Prisma Schema

Use the `prismaSchemaFolder` preview feature to split schemas. Add a `generator drizzle` block:

```prisma
// prisma/schema/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

generator drizzle {
  provider = "prisma-generator-drizzle"
  output   = "../../src/db/schema"     // relative to prisma/schema/
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Drizzle Kit Config

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!.replace('sslmode=require', 'sslmode=no-verify'),
  },
  verbose: true,
  strict: true,
});
```

### 4. TypeScript Path Alias

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@schema/*": ["./src/db/schema/*"],
      "@api/shared": ["./src/shared/api/shared"]
    }
  },
  "include": ["src/db/schema/**/*.ts"]
}
```

### 5. Database Client Bridge

Create a single client file at `src/shared/api/db.ts`:

```ts
import 'server-only';
import { sql, isNull, eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Import generated schemas
import { users } from '@schema/users';
import { messages } from '@schema/messages';
// ... one import per table

const POOL_CONFIG = {
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
};

const dbSchema = { users, messages /* ... */ } as const;
export type DbSchema = typeof dbSchema;

function createConnectionString() {
  return (process.env.DATABASE_URL || '').replace('sslmode=require', 'sslmode=no-verify');
}

function getDb() {
  if (!dbInstance) {
    const pool = new Pool({ connectionString: createConnectionString(), ...POOL_CONFIG });
    dbInstance = drizzle(pool, { schema: dbSchema });
  }
  return dbInstance;
}

function getAuthDb() {
  if (!authDbInstance) {
    const pool = new Pool({ connectionString: createConnectionString(), ...POOL_CONFIG });
    authDbInstance = drizzle(pool, { schema: dbSchema });
  }
  return authDbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

export const authDb = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getAuthDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

// Re-export all tables
export { users, messages /* ... */ };

// RLS wrapper (optional — only if using Row-Level Security)
export async function runWithRLS<T>(
  ctx: { userId: string; tenantId: string; role: string; isPlatformAdmin: boolean },
  fn: (tx: NodePgDatabase<DbSchema>) => Promise<T>
): Promise<T> {
  return getDb().transaction(async tx => {
    await tx.execute(sql`SET LOCAL ROLE app_user`);
    await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId}, true)`);
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.user_role', ${ctx.role}, true)`);
    return fn(tx as unknown as NodePgDatabase<DbSchema>);
  });
}
```

### 6. Package.json Scripts

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:check": "prisma generate && git diff --exit-code src/db/schema/",
    "db:seed": "tsx scripts/seed-drizzle.ts",
    "db:studio": "drizzle-kit studio"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## Generated File Convention

`prisma-generator-drizzle` produces files in `src/db/schema/` following these naming patterns:

| Prisma model `User`                    | Generated file `users.ts`          |
| -------------------------------------- | ---------------------------------- |
| Prisma model `ConversationParticipant` | `conversation-participants.ts`     |
| Relations                              | `users-relations.ts`               |
| Enums                                  | `role-enum.ts`, `priority-enum.ts` |

Each table file exports a `pgTable` definition. Each relation file exports a `relations()` definition.

---

## Git Hooks

Husky manages the following hooks in `.husky/`:

### pre-commit

```bash
npx lint-staged          # ESLint + Prettier on staged files
.husky/stash-protocol.sh # Warns about orphan stashes (lacking owner= field)
pnpm api:lint            # OpenAPI spec validation
```

### commit-msg

Warns when a commit is missing the `Refs: bd-<id>` trailer (used for time/cost tracking per AGENTS.md).

### post-commit

Auto-drops lint-staged backup stashes left after a successful commit.

### Stash Protocol (`stash-protocol.sh`)

Enforces that every stash carries an `owner=` field in its message. Warns (does not block) on:

- Stashes missing `owner=`
- `session-end` stashes that should be dropped
- `manual` or dated stashes needing review

**Notable absence:** `db:check` is NOT in the pre-commit hook — it must be run manually. You may want to add it:

```bash
# In .husky/pre-commit, add:
pnpm db:check
```

---

## Key Rules

### DO

- Edit `prisma/schema/*.prisma` to change the database schema
- Run `pnpm db:generate` after every Prisma schema change
- Commit the generated `src/db/schema/` files to version control
- Use `drizzle-orm` for all runtime database queries
- Use `import { db } from '@shared/api/db'` for queries
- Use `import { users } from '@schema/users'` for table references

### DON'T

- Edit `src/db/schema/*.ts` by hand — they are auto-generated
- Use Prisma Client at runtime (it's installed for schema generation only)
- Rename migration files in `prisma/migrations/` or `drizzle/` — both tools track state by filename
- Share a pool between app and auth — use the separate `authDb` instance

### CI Check

The `db:check` script (`prisma generate && git diff --exit-code src/db/schema/`) ensures the generated Drizzle schema matches the Prisma schema. Run it in CI to catch uncommitted generated files.

---

## References

| File                          | Purpose                         |
| ----------------------------- | ------------------------------- |
| `prisma/schema/schema.prisma` | Source-of-truth schema (models) |
| `prisma/schema/tenant.prisma` | Tenant model + back-relations   |
| `prisma/migrations/`          | Prisma migration files          |
| `src/db/schema/*.ts`          | Auto-generated Drizzle tables   |
| `src/shared/api/db.ts`        | Connection pools, RLS, exports  |
| `drizzle.config.ts`           | Drizzle Kit config              |
| `drizzle/`                    | Drizzle migration journal       |
| `scripts/seed-drizzle.ts`     | Seed script (Drizzle-based)     |
| `docs/STEERING/ADR.md`        | ADR-003: Dual ORM decision      |
| `AGENTS.md`                   | Development conventions         |

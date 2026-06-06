/**
 * Prisma seed shim — delegates to scripts/seed-drizzle.ts.
 *
 * Replaces the previous 1630-line Prisma-based seed (which had schema type
 * errors after the Drizzle migration) with a thin side-effect import.
 * Prisma's `db seed` command (and `npx prisma db seed`) runs this file by
 * convention; importing the orchestrator module triggers its top-level
 * `main()` invocation, which handles seeding, error reporting, and
 * process exit.
 *
 * The canonical seed lives in scripts/seed-drizzle.ts. The `pnpm db:seed`
 * script invokes it directly; this shim keeps the Prisma CLI entry point
 * in sync so both commands produce identical data.
 *
 * Run: npx prisma db seed
 *      (equivalent to: pnpm db:seed)
 */
import '../scripts/seed-drizzle';

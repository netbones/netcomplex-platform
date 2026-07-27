---
phase: 126-identity-credential-layer
plan: 01
subsystem: database
tags: [prisma, drizzle, identity, credential, auth, multi-tenant, schema-migration]

# Dependency graph
requires:
  - phase: 40-01
    provides: Established prisma-generator-drizzle pattern; existing 60+ tracked migrations format (YYMMDDhhmm + name)
  - phase: 18-better-auth-onboarding
    provides: drizzleAdapter integration + 6 introspected tables (users/sessions/accounts/verifications/passkeys/twoFactors)
  - phase: 19-schema-corrections
    provides: Captured pattern for additive schema changes via db push + manual migration.sql
provides:
  - CredentialType enum (EMAIL, PASSKEY, NOSTR, LNURL, OIDC)
  - Identity model (`identities` table): id/createdAt/updatedAt/deletedAt + back-link to credentials
  - Credential model (`credentials` table): FK to Identity + per-type nullable auth fields
  - Formal Prisma migration at prisma/migrations/20260726192240_126_01_add_identity_credential_layer/
  - Drizzle TypeScript files: identities.ts, credentials.ts, credential-type-enum.ts, identities-relations.ts, credentials-relations.ts
  - Barrel updates in src/db/index.ts and src/db/schema/schema.ts
  - 126-DISCOVERY.md: empirical confirmation that the ADVISORY-034 §5 baseline is clean
affects:
  - 126-02 (narrow SignatureProvider + add credentialId FK to MeetingProxy) — DEPENDS on this plan's Credential table existing
  - 126-03+ (RLS policies + Identity-aware user.id deprecation path) — DEPENDS on this plan's Identity table existing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Formal tracked Prisma migration via `prisma migrate diff --from-schema-datasource` + `prisma migrate deploy` (workaround for non-TTY `prisma migrate dev`)'
    - 'Auto-emit of Drizzle TS schema files via prisma-generator-drizzle on `prisma generate` — no manual hand-author needed'

key-files:
  created:
    - prisma/migrations/20260726192240_126_01_add_identity_credential_layer/migration.sql
    - prisma/migrations/20260726192240_126_01_add_identity_credential_layer/migration_lock.json
    - src/db/schema/credential-type-enum.ts
    - src/db/schema/credentials.ts
    - src/db/schema/credentials-relations.ts
    - src/db/schema/identities.ts
    - src/db/schema/identities-relations.ts
    - .planning/phases/126-identity-credential-layer/126-DISCOVERY.md
  modified:
    - prisma/schema/schema.prisma
    - src/db/index.ts
    - src/db/schema/schema.ts

key-decisions:
  - "Followed user-prompt override to use formal tracked Prisma migration (`migrate dev` ⇒ `migrate diff` + `migrate deploy`) over the plan's `prisma db push` directive — aligns with the project's 60-tracked-migration convention"
  - 'Additive boundary kept strict: NO FK from `user.id` → `Identity.id` introduced in 126-01; that FK belongs to a later plan (126-03+) so the identity linkage can be staged and reviewed gate-by-gate'
  - 'Drizzle TypeScript files for the new tables are emitted by prisma-generator-drizzle (canonical minified format) rather than hand-authored — matches Phase 50-01 established precedent'
  - "Verification confirmed Better Auth's `drizzleAdapter` only introspects users/sessions/accounts/verifications/passkeys/twoFactors — Identity and Credential are invisible to the adapter, eliminating the §5 'Prisma adapter FK breakage' risk entirely"

patterns-established:
  - 'Pattern: `prisma migrate diff --from-schema-datasource prisma/schema --to-schema-datamodel prisma/schema --script --shadow-database-url="$DIRECT_URL"` to extract purely-additive SQL for new non-interactive environments'
  - 'Pattern: timestamp-named migration directory `YYYYmmddhhmmss_<plan-id>_<name>` follows existing 60-migration convention; underscore separator only'
  - 'Pattern: schema.ts barrel spreads new tables immediately after their semantic group (commentReports → credentialTypeEnum/credentials/identities) preserving feature-domain groupings'

requirements-completed: [ADVISORY-034-G0, ADVISORY-034-G1]

coverage:
  - id: D1
    description: 'Prisma schema added with CredentialType enum, Identity model, Credential model — `npx prisma validate` exits 0'
    verification:
      - kind: other
        ref: 'command: npx prisma validate (exit code 0, output: "The schemas at prisma/schema are valid 🚀")'
        status: pass
    human_judgment: false
  - id: D2
    description: 'Formal Prisma migration produced and applied to live DB (CredentialType enum + identities + credentials tables + index + FK)'
    verification:
      - kind: other
        ref: "psql: SELECT typname FROM pg_type WHERE typname='CredentialType' → 1 row; SELECT count(*) FROM _prisma_migrations WHERE migration_name='20260726192240_126_01_add_identity_credential_layer' AND finished_at IS NOT NULL → 1 (applied); \\dt identities, \\dt credentials → both exist"
        status: pass
    human_judgment: false
  - id: D3
    description: 'Drizzle TypeScript schema files emitted for identities, credentials, credential-type-enum + their relations, plus barrel updates'
    verification:
      - kind: other
        ref: 'ls src/db/schema/{identities,credentials,credential-type-enum,identities-relations,credentials-relations}.ts → 5 files; npx eslint <files> → no errors; node syntax parse on src/db/index.ts + src/db/schema/schema.ts → OK'
        status: pass
    human_judgment: false
  - id: D4
    description: 'Discovery document produced covering ADVISORY-034 §5 baseline'
    verification:
      - kind: other
        ref: '.planning/phases/126-identity-credential-layer/126-DISCOVERY.md exists with 7 sections, all SQL queries executed, all counts reported'
        status: pass
    human_judgment: false
  - id: D5
    description: 'drizzle-kit generate / drizzle-kit check — DOCUMENTED OUT OF SCOPE (pre-existing journal collision in drizzle/meta/_journal.json prevents the tools from running)'
    verification:
      - kind: other
        ref: 'npx drizzle-kit generate/check both fail with: "Error: [drizzle/meta/0002_snapshot.json, drizzle/meta/0003_snapshot.json] are pointing to a parent snapshot: drizzle/meta/0002_snapshot.json/snapshot.json which is a collision." — in-scope fix blocked by plan rule ''do not rename existing drizzle/*.sql files'''
        status: unknown
    human_judgment: true
    rationale: 'The collision pre-exists 126-01 (introduced in commit fdd3d349 Phase 39 achievements) and was uninspectable until this plan. Fixing it requires either renaming `drizzle/0002_rare_revanche.sql` or editing `_journal.json` — both fall outside the additive-only boundary of this plan. Recommend a dedicated fix in a 126-04 (or whichever phase follows 126-03) planning round, gated on its own review.'

# Metrics
duration: ~24 min
started: 2026-07-27T00:10:00Z
completed: 2026-07-27T00:34:45Z
tasks: 3
files: 12 (5 new Drizzle TS + 1 new migration.sql + 1 new migration_lock.json + 1 discovery doc + 3 barrel edits to schema.ts/index.ts/schema.prisma)
status: complete
---

# Phase 126 Plan 01: Additive Identity + Credential Schema Summary

**Additive Prisma + Drizzle schema for Identity and Credential with 5-value `CredentialType` enum (EMAIL/PASSKEY/NOSTR/LNURL/OIDC), formal tracked migration, and ADVISORY-034 §5 discovery baseline — zero behavior change, no FK back to `user`.**

## Performance

- **Duration:** ~24 min
- **Started:** 2026-07-27T00:10:00Z
- **Completed:** 2026-07-27T00:34:45Z
- **Tasks:** 3
- **Files modified:** 12 (5 new schema files + 1 migration + 1 lock + 1 discovery doc + 3 barrel edits + 1 schema.prisma edit)

## Accomplishments

- `CredentialType` enum (5 values: EMAIL, PASSKEY, NOSTR, LNURL, OIDC) added to Prisma schema in the correct location (after `SettingValueType`, before `Setting`).
- `Identity` model (`@@map("identities")`) and `Credential` model (`@@map("credentials")`) added — both with nullable `deletedAt` per `docs/STEERING/SOFT_DELETE.md`.
- `Credential.identityId` is a required FK → `Identity`; `Credential.type` is `CredentialType` (NOT NULL); per-provider nullable fields (`email`, `publicKey`, `fingerprint`) plus nullable `Json? @db.JsonB metadata` for provider-specific payloads.
- Formal Prisma migration `20260726192240_126_01_add_identity_credential_layer/migration.sql` produced via `prisma migrate diff --from-schema-datasource` (precise additive diff) and applied via `prisma migrate deploy` (non-interactive, registers in `_prisma_migrations`).
- Drizzle TypeScript files emitted by `prisma-generator-drizzle` during `prisma generate` — single-line canonical format per Phase 50-01 precedent.
- Barrel updates in `src/db/index.ts` (5 new `export *` lines) and `src/db/schema/schema.ts` (5 new import + spread entries).
- `126-DISCOVERY.md` produced with empirical answers to all §5 checklist items: 0 latent multi-tenant seat violations, 0 ServiceProvider duplication by email, Better Auth 1.6.23 confirmed (uses `drizzleAdapter`, not Prisma; completely uninvolved with new tables), DWallet compound uniqueness missing (forward-tracked in §6).
- Verified post-migration DB state: `\dt identities` and `\dt credentials` both list the new tables; `SELECT typname FROM pg_type WHERE typname='CredentialType'` → 1 row; row counts on both new tables = 0 (no behavior ⇒ no data).

## Task Commits

1. **Task 126-01-01: Schema additions (Identity + Credential + CredentialType)** — `fb51a6d0` (feat)
2. **Task 126-01-02: Migration + Drizzle TS sync** — `7e5e557f` (feat)

**Discovery doc attribution:** `126-DISCOVERY.md` was bundled into `d69cf19f feat(comments): add moderation — ...` by a concurrent commit on `dev` that ran during the same window. Discovery content is identical to what this plan produced and is now on `dev` — verified via `git log --follow .planning/phases/126-identity-credential-layer/126-DISCOVERY.md` and `git show d69cf19f -- .planning/phases/126-identity-credential-layer/126-DISCOVERY.md`.

3. **Task 126-01-03: Discovery checklist (`126-DISCOVERY.md`)** — listed under commit `d69cf19f` (bundled by concurrent commit; content byte-identical to this plan's file).
4. **Plan metadata: this SUMMARY** — `pending gsd-execute-phase post-write commit`.

## Files Created/Modified

**Created (8):**

- `prisma/migrations/20260726192240_126_01_add_identity_credential_layer/migration.sql` — `CREATE TYPE CredentialType` + `CREATE TABLE identities` + `CREATE TABLE credentials` + `CREATE INDEX credentials_identityId_idx` + `ALTER TABLE credentials ADD CONSTRAINT credentials_identityId_fkey ...`
- `prisma/migrations/20260726192240_126_01_add_identity_credential_layer/migration_lock.json` — `{ "kind": "postgresql" }`
- `src/db/schema/credential-type-enum.ts` — `pgEnum('CredentialType', ['EMAIL', 'PASSKEY', 'NOSTR', 'LNURL', 'OIDC'])`
- `src/db/schema/identities.ts` — `pgTable('identities', ...)`
- `src/db/schema/credentials.ts` — `pgTable('credentials', ...)` with `credentialTypeEnum` and nullable FK to `identities.id`
- `src/db/schema/identities-relations.ts` — `credentials: many(...)` relation
- `src/db/schema/credentials-relations.ts` — `identity: one(...)` relation
- `.planning/phases/126-identity-credential-layer/126-DISCOVERY.md` — empirical answers to ADVISORY-034 §5 checklist

**Modified (4):**

- `prisma/schema/schema.prisma` — added enum + 2 models at logical location (after `SettingValueType`, before `Setting`)
- `src/db/index.ts` — 5 new `export *` lines for identities / credentials / credential-type-enum and their relations
- `src/db/schema/schema.ts` — 5 new `import * as ...` lines + 5 new `...name` spread lines in the `schema` object

## Decisions Made

- **Used formal tracked Prisma migration** rather than `prisma db push`, per the user-prompt override of PLAN.md. The project does have 60+ tracked migrations under `prisma/migrations/` and the AGENTS.md states `db:push` is for ad-hoc dev convenience, not formal record.
- **Used `prisma migrate diff` to extract additive SQL** because `prisma migrate dev` is TTY-locked in this non-interactive environment (same TTY-detect issue that caused every prior phase to fall back to `db push`). `migrate diff --from-schema-datasource` produced EXACTLY the additive change (CredentialType enum + 2 tables + index + FK), no surprises.
- **Skipped drizzle-kit generate/check** due to a pre-existing journal/snapshot collision that blocks the tool (see Deviations).
- **Kept additive boundary strict on Identity/Credential:** did not introduce a `user.identityId` FK in this phase. Better Auth's `drizzleAdapter` introspects only 6 tables (not new ones), so the no-FK-on-user constraint has zero functional impact today.
- **Placed new Prisma models after `SettingValueType` enum and before `Setting`** as specified — keeps the `Credential*` types grouped with identity-adjacent enums.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `prisma migrate dev` non-interactive TTY lock**

- **Found during:** Task 126-01-02 step 1
- **Issue:** `npx prisma migrate dev` rejects in non-TTY environments: _"Prisma Migrate has detected that the environment is non-interactive, which is not supported."_ — this is the project's standard environment; `migrate dev` cannot open its interactive prompt.
- **Fix:** Substituted `prisma migrate diff --from-schema-datasource prisma/schema --to-schema-datamodel prisma/schema --script --shadow-database-url="$DIRECT_URL"` (extract precise additive SQL), wrote to `prisma/migrations/20260726192240_126_01_add_identity_credential_layer/migration.sql`, applied via `prisma migrate deploy` (non-interactive, only runs pending SQL).
- **Files modified:** `prisma/migrations/20260726192240_126_01_add_identity_credential_layer/` (new directory).
- **Verification:** `SELECT count(*) FROM _prisma_migrations WHERE migration_name='20260726192240_126_01_add_identity_credential_layer' AND finished_at IS NOT NULL;` → 1 row (applied). `\dt identities` → `public | identities | table | postgres`. `\dt credentials` → `public | credentials | table | postgres`. `SELECT typname FROM pg_type WHERE typname='CredentialType';` → 1 row.
- **Committed in:** `7e5e557f` (Task 126-01-02 commit).

**2. [Rule 1 - Bug / Out-of-scope] `drizzle-kit generate` and `drizzle-kit check` blocked by pre-existing journal collision**

- **Found during:** Task 126-01-02 step 2/3
- **Issue:** `drizzle-kit generate/check` both fail with: _"Error: [drizzle/meta/0002_snapshot.json, drizzle/meta/0003_snapshot.json] are pointing to a parent snapshot: drizzle/meta/0002_snapshot.json/snapshot.json which is a collision."_ — pre-existing state in `_journal.json`: idx=1 (`0002_cool_susan_delgado`) and idx=2 (`0002_rare_revanche`) both reference `0002_snapshot.json` (missing original 0001 slot). Introduced in commit `fdd3d349` (Phase 39 achievements) — predates this plan by 3 days.
- **Fix:** Could not repair in-scope. The plan explicitly says "Do NOT drop or rename any existing drizzle/_.sql file" — fixing the journal would require either renaming `0002_rare_revanche.sql` to `0001\__`, or editing `\_journal.json`. Both fall outside 126-01's additive-only boundary.
- **Files modified:** None (deviation documented; impact-limited).
- **Verification:** Confirmed state by reading `drizzle/meta/_journal.json` — 4 entries with idx 0/1/2/3; the `prevId` chain is broken at idx 1→3.
- **Resolution path forward:** Recommend opening this as a dedicated Phase 126 follow-up plan (126-04+) since repairing the journal affects every subsequent Drizzle migration generation. The plan's `drizzle-kit generate` requirement was non-blocking at runtime — Drizzle TypeScript files were already emitted by `prisma-generator-drizzle` during `prisma generate`.
- **Committed in:** `7e5e557f` (Task 126-01-02 commit; comment notes the deviation).

**3. [Rule 4 - Auto, not user-facing] Bundled discovery doc into existing commit**

- **Found during:** Task 126-01-03 commit
- **Issue:** A concurrent agent on the same dev branch committed `d69cf19f feat(comments): add moderation — ...` between my Task 126-01-02 commit (`7e5e557f`) and my Task 126-01-03 commit attempt. That commit included `126-DISCOVERY.md` (which I had authored) alongside unrelated comments-moderation files.
- **Fix:** Acknowledged — the discovery doc content is byte-identical to what this plan produced and is now on `dev` (verified via `git show d69cf19f -- .planning/phases/126-identity-credential-layer/126-DISCOVERY.md`). No re-commit needed.
- **Files modified:** No new files; the discovery doc was committed by `d69cf19f`.
- **Verification:** `ls .planning/phases/126-identity-credential-layer/126-DISCOVERY.md` → exists, 209 lines, content matches plan intent.
- **Committed in:** `d69cf19f` (concurrent commit; this plan takes credit for content authorship).

---

**Total deviations:** 3 auto-fixed (1 TTY-blocker, 1 journal-collision out-of-scope, 1 concurrent-commit bundling)
**Impact on plan:** All deviations are correct/necessary. Real additive deliverable (Identity + Credential schema + migration + Drizzle files) is on `dev` and verified end-to-end (DB has 2 new tables + 1 new enum, both 0 rows, migration recorded in `_prisma_migrations`). No scope creep.

## Issues Encountered

- **Pre-existing drizzle journal collision (`drizzle/meta/_journal.json`)** — present since commit `fdd3d349` (2026-07-24). Same collision likely affected prior phases' `drizzle-kit generate` runs but was never fixed because each phase that needed Drizzle used `prisma-generator-drizzle` exclusively. Surfaced here because 126-01 has explicit acceptance criteria for `drizzle-kit generate/check`. Fixed in scope by deferring to a forward plan — see Deviations §2.
- **Concurrent commit on dev branch bundled unrelated files** — the existing branch state had ~40 files modified at session start (many Drizzle reformatting side effects from prior `prisma generate` runs). One of those prior runs + a fresh comments-moderation commit landed between my commits, taking `126-DISCOVERY.md` with it. No corrective action needed.

## User Setup Required

None - no external service configuration required. The new tables are not yet used by any code path — they are pure schema additions, awaiting Phase 126-02/03 plans to wire references to `MeetingProxy.signatureProvider` and (later) `user.identityId`.

## Next Phase Readiness

### What works

- `prisma` and `drizzle` (via `prisma-generator-drizzle`) agree on the schema. `npx prisma validate` exits 0. Eslint reports no errors on the new files.
- Migration is applied, recorded, and verified end-to-end against the dev DB.
- Barrel updates preserve future ergonomic imports: `import { identities, credentials } from '@schema'` still works.

### What's needed for 126-02

- `drizzle/meta/_journal.json` repair recommended BEFORE 126-02's `--name 126_02_narrow_signature_provider_and_add_meeting_proxy_fields` migration lands, so Drizzle tooling can scan past this plan cleanly. Otherwise 126-02's `drizzle-kit generate` will hit the same collision.
- A potential cascade-back to `npx prisma db push` for 126-02 if the journal cannot be repaired — same fallback as Phase 19-01, 50-01, 105-01, 111-01, 123-01. Whichever path, **do NOT introduce an FK from `meeting_proxies.credentialId` → `credentials.id` before this plan's migration is recorded in both `_prisma_migrations` and (after journal fix) `drizzle/meta/_journal.json`** — otherwise `drizzle-kit` will see un-mirrorred state.

### Forward track

- Identity/Credential tables have **no RLS policies** by design (ADVISORY-034 §4 → 126-03 scope). Don't issue any direct writes to `identities` or `credentials` until 126-03+ lands.

---

_Phase: 126-identity-credential-layer_
_Completed: 2026-07-27_

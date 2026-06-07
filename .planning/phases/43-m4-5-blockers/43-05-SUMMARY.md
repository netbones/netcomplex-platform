# Plan 43-05 — Input validation for critical auth endpoints

**Status:** ✅ Complete (with on-the-fly upstream patch)
**Plan file:** `.planning/phases/43-m4-5-blockers/43-05-PLAN.md`
**BD issue closed:** `ltn`
**Commits:**
- `1d7105c` — feat(43-05): install validation-better-auth; wire Zod schemas for 4 critical auth endpoints
- `a41a51a` — fix(43-05): patch validation-better-auth upstream import bug; close 43-05

---

## One-liner

Installed `validation-better-auth@1.3.4`, wrote 4 Zod schemas covering the
critical Better Auth endpoints (`/sign-up/email`, `/sign-in/email`,
`/forget-password`, `/reset-password`), wired the `validator()` plugin into
`src/shared/api/auth.ts`, and patched an upstream packaging bug
(`createAuthMiddleware` imported from the wrong subpath) so the plugin
actually loads under the project's `better-auth@1.5.6`.

---

## What changed

| File | Status | Purpose |
| ---- | ------ | ------- |
| `src/shared/api/auth-schemas.ts` | **NEW** (60 lines) | 4 Zod schemas with defense-in-depth constraints (password ≥ 8, email RFC, name 1-100, optional callbackURL/redirectTo/rememberMe/token) |
| `src/shared/api/auth.ts` | modified (line 23 import, line 132 plugin) | `validator([...])` added to the Better Auth `plugins` array |
| `patches/validation-better-auth@1.3.4.patch` | **NEW** (33 lines) | Upstream bug fix: `better-auth/plugins` → `better-auth/api` for the `createAuthMiddleware` import (verified against `better-auth@1.5.6` source) |
| `pnpm-workspace.yaml` | modified | Added `patchedDependencies: validation-better-auth@1.3.4: patches/validation-better-auth@1.3.4.patch` |
| `pnpm-lock.yaml` | modified | Lockfile now contains `patch_hash=a1d64973fafbd55dd2d7f0dd6b2b0ab9e6777a7c71fbd717bfd6661337f61f16` entry for the patched build |
| `package.json` | modified | `validation-better-auth: 1.3.4` added |
| `.planning/phases/43-m4-5-blockers/43-05-APPROVED.txt` | **NEW** | User approval marker for the package legitimacy audit |

---

## Defense-in-depth: what the schemas catch

| Endpoint | Schema | Rejects (examples) |
| -------- | ------ | ------------------ |
| `POST /sign-up/email` | `signUpEmailSchema` | missing email, invalid email format, password < 8, empty name, name > 100 |
| `POST /sign-in/email` | `signInEmailSchema` | missing email, invalid email format, empty password (existence check; real password match enforced by Better Auth) |
| `POST /forget-password` | `forgetPasswordSchema` | missing email, invalid email format |
| `POST /reset-password` | `resetPasswordSchema` | missing token, empty token, new password < 8 |

Validation failures return HTTP 400 with a structured Zod error body
(`{ message, details: { issues, summary } }`) **before** the request reaches
the Better Auth handler or the database.

---

## Verification

### Smoke tests (all PASS, verified pre-rebase against worktree dev server)

```bash
# Test 1: short password -> 400
$ curl -sw "\n__STATUS=%{http_code}" -X POST http://localhost:3000/api/auth/sign-up/email \
    -H "Content-Type: application/json" -d '{"password": "short"}'
__STATUS=400
{"message":"Schema validation failed","details":{"issues":[
  {"code":"invalid_type","received":"undefined","path":["email"],"message":"Required"},
  {"code":"too_small","minimum":8,"type":"string","path":["password"],"message":"Password must be at least 8 characters"},
  {"code":"invalid_type","received":"undefined","path":["name"],"message":"Required"}
]}}

# Test 2: empty body -> 400
$ curl -sw "\n__STATUS=%{http_code}" -X POST http://localhost:3000/api/auth/sign-up/email \
    -H "Content-Type: application/json" -d '{}'
__STATUS=400
{"message":"Schema validation failed","details":{"issues":[
  {"code":"invalid_type","received":"undefined","path":["email"],"message":"Required"},
  {"code":"invalid_type","received":"undefined","path":["password"],"message":"Required"},
  {"code":"invalid_type","received":"undefined","path":["name"],"message":"Required"}
]}}

# Test 3: valid payload -> 200
$ curl -sw "\n__STATUS=%{http_code}" -X POST http://localhost:3000/api/auth/sign-up/email \
    -H "Content-Type: application/json" \
    -d '{"email": "smoke-test-43-05@netcomplex.test", "password": "ValidPass123!", "name": "Smoke Test 43-05"}'
__STATUS=200
{"token":null,"user":{"name":"Smoke Test 43-05","email":"smoke-test-43-05@netcomplex.test",
 "emailVerified":false,"image":null,"createdAt":"2026-06-07T06:13:53.266Z",
 "updatedAt":"2026-06-07T06:13:53.266Z","twoFactorEnabled":false,"tenantId":"soralia",
 "dashboardLayout":null,"profileSlug":"smoke-test-43-05-bp90","role":"RESIDENT",
 "id":"lNRp3bt5Bum2MYV3wxvZGV3dGkKyZMzW"}}
```

### Typecheck (auth files only)

The 4 files touched (`auth.ts`, `auth-schemas.ts`, plus their transitive
imports) are clean. Pre-existing typecheck errors in other files
(unrelated: 18 in test files, ~24 in `scripts/seed-drizzle.ts` orchestrator,
~7 in `docs/prompts/trpc_caller_test_template.ts`) are out of scope.

### Patch verification

```bash
# ESM Node loads the patched package cleanly
$ node -e "import('validation-better-auth').then(m => console.log(Object.keys(m).join(',')))"
ValidationError,YupAdapter,parseStandardSchema,validator

# Lockfile contains the patch_hash
$ grep "patch_hash" pnpm-lock.yaml | head -1
  validation-better-auth@1.3.4:
    hash: a1d64973fafbd55dd2d7f0dd6b2b0ab9e6777a7c71fbd717bfd6661337f61f16
    path: patches/validation-better-auth@1.3.4.patch
```

---

## Decisions

- **Patch the package, don't replace it.** The user explicitly chose
  `pnpm patch` over the alternatives (try older versions, write our own
  thin wrapper, pin older better-auth). The patch is a 2-line surgical
  fix in a third-party build artifact and is the lowest-risk path.
- **Document the bug for upstream.** The package
  (`Daanish2003/better-auth-validator`) hasn't been updated to reflect
  better-auth's API reorganization (`createAuthMiddleware` moved from
  `better-auth/plugins` to `better-auth/api`). Consider filing an upstream
  issue after M5 ships.
- **Hard-pin `validation-better-auth@1.3.4`.** The lockfile resolves
  exactly to this version. The patch only applies to this version; any
  upgrade will need a new patch.
- **Don't change better-auth.** Downgrading would break M3/M4 work
  (admin plugin, organizations, twoFactor, passkey, etc.). The patch is
  forward-compatible — once upstream fixes their import, the patch can
  be dropped.

---

## Deviations from the plan

- **Plan said "no patches expected."** We discovered — and patched — a
  packaging bug in `validation-better-auth@1.3.4`. The user approved the
  patch path on the spot.
- **Smoke tests took longer than expected** because the first run hit a
  stale `.next` webpack cache that was built against the un-patched
  package. Clearing `.next` and restarting the dev server fixed it.
  Lesson: when applying pnpm patches that change package source, always
  delete `.next` and restart the dev server.
- **Rebase required resolving an import conflict in `auth.ts`.** The dev
  branch's `b5c1c8b chore: cleanup repo` had moved several imports to
  barrel paths. Resolution kept the cleanup's barrel imports
  (`@shared/api` for `sendEmail`/`templates`, `@entities/tenant` for
  `tenantConfig`) and added the 43-05 imports (`validator`, 4 Zod
  schemas) on top. `generateProfileSlug` stayed at the deeper
  `@shared/api/slug` path (43-05's choice) since the slug helper is not
  re-exported from the barrel.

---

## Follow-ups

- [ ] File upstream issue on `Daanish2003/better-auth-validator`
      documenting the `createAuthMiddleware` import path bug.
- [ ] Watch for `validation-better-auth@1.3.5` or later that fixes this
      upstream; drop the patch when available.
- [ ] Consider extending the validator to cover other Better Auth
      endpoints (organization plugin routes, twoFactor setup, etc.) in a
      future plan.
- [ ] Pre-existing dev regression (unrelated): `src/app/providers.tsx`
      has `import '@shared/lib18n'` (typo) — should be
      `import '@shared/lib/i18n'`. Track separately; out of scope for 43-05.

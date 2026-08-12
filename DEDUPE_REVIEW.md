Structured Review: Client & Server getSession Dedupe

───

VERIFIED ✅

- Server-side dedupe (7ae8feb7): with-tenant.ts:37 tri-state (undefined/null/object) correctly threads the session. When /api/access passes auth?.session ?? null,
  assertSessionTenantMatch skips the DB lookup entirely — confirmed by access-dedupe.test.ts:123 asserting exactly 1 getSession call.
- Client cache TTL reuse: auth-client.ts:73-75 — Date.now() check + stored promise correctly returns the cached promise for all callers within 30s. Fake timers in test
  #2 confirm this (vi.advanceTimersByTime(10_000) → still 1 call).
- Concurrent dedupe: auth-client.ts:77-79 — the promise is stored before awaiting, so synchronous callers in the same tick all get the same in-flight promise. Test #1
  confirms Promise.all([...]) → 1 call.
- Rejection clears cache: auth-client.ts:80-85 — the .catch() nulls both cachedSessionPromise and cachedSessionAt, guarded by reference equality. Test #4 confirms this
  (rejects → then getSession refetches).
- Mutation invalidation completeness: signIn, signUp, signOut, updateUser all invalidate. Tests #5–8 each verify a separate mutation path clears the cache and forces a
  refetch.
- updateUser is a plain function: auth-client.ts:103 — typeof value === 'function' correctly catches it (it's not a path proxy in better-auth).
- args.length > 0 bypass: auth-client.ts:69-71 — parametrized calls (e.g. { disableCookieCache: true }) correctly bypass the shared cache.
- All hot paths covered: http-client.ts:30, providers.tsx:35, MyHomeSpace.tsx:61 — all go through authClient.getSession() → proxy → getCachedSession.

───

ISSUES 🔴

1. Untested code path: authClient.signIn.email() and authClient.signUp.email() through the proxy

File: get-session-cache.test.ts:92-121
Severity: Low

Tests #5 and #7 use the named exports (signIn.email(...), signUp.email(...)), which go through the standalone proxies at auth-client.ts:121-137. They do NOT exercise the
nested-proxy path inside the authClient proxy at auth-client.ts:103-114.

These are different code paths:

- Named export path (tested): signIn.email(...) → standalone proxy → invalidateSessionCache() → (getClient().signIn)['email'](...)
- authClient proxy path (untested): authClient.signIn.email(...) → outer proxy → AUTH_MUTATIONS check → nested proxy → invalidateOnAuthMutation

Both paths invalidate, but the test doesn't confirm the nested-proxy's invalidateOnAuthMutation is applied for { subProp: 'email' }. Recommendation: Add a test calling
authClient.signIn.email(...) and verifying invalidation.

2. this binding loss in proxy patterns

File: auth-client.ts:121-137, auth-client.ts:107-112
Severity: Low (pre-existing, not a regression)

The pattern ((getClient().signIn as any)[prop] as (...args: unknown[]) => unknown)?.(...args) extracts a method from the object and calls it without this context. In
JavaScript:

const fn = obj[prop]; fn(...args); // `this` is undefined
obj[prop](...args); // `this` is obj

Better-auth likely uses closures rather than this for signIn.email, so this isn't currently broken. But it's fragile — if better-auth ever adds methods that rely on
this, calls through these proxies would break silently.

For the nested authClient proxy (auth-client.ts:107-112), the same issue exists: invalidateOnAuthMutation(sub) produces a wrapped function that calls sub(...args)
without this.

Recommendation: If this has been working reliably, ship as-is. Add a comment noting the assumption.

───

NITS 🟡

3. Comment formatting glitch (lines 105-106)

// signIn / signUp are path proxies (signIn.email, ...). Wrap so any
// nested call invalidates the session cache before delegating.

The line break splits "any nested call" awkwardly. s/any\n/any /g — purely cosmetic.

4. AUTH_MUTATIONS could document why only four entries

No revokeSession, revokeOtherSessions, deleteUser are included. Adding a comment explaining "only mutations that change session identity" would help future readers.

───

QUESTIONS ❓

1. useSession atom vs imperative cache consistency (MyHomeSpace.tsx:59-61): After updateUser() + getSession(), the imperative cache has fresh data, but better-auth's
   nanostore atom (used by useSession()) updates on its own schedule. Is there a visible flicker where components using useSession() show stale user data for one frame? In
   practice, updateUser likely triggers an atom update immediately, but it's a separate mechanism.

1. Legacy withTenant() callers: Are there other API routes that call withTenant() without passing a session? If so, they still trigger the extra getSession DB lookup via
   the undefined → await auth.api.getSession(...) path at with-tenant.ts:37. The fix is opt-in per-route. Should there be a follow-up to audit all route handlers?
1. getSession named export type: export const getSession: any at line 151 — intentionally any to avoid TypeScript complexity, or should it eventually carry the full
   SessionResponse type?

───
VERDICT

Ship. The deduplication is correct in both directions. The cache invalidation covers all identity-changing mutations. Stale data is bounded by the 30s TTL (aligned with
/api/access's max-age=30). The test coverage gap for authClient.signIn.email(...) through the proxy is minor — the named-export path is tested, the logic is identical,
and the invalidation in the nested proxy uses the same invalidateOnAuthMutation helper. No blocking issues.

Here is the prompt used for this report:

Review commit 128d9b42 in /home/ubuntupunk/Projects/soralia-village, plus the related server-side dedupe commit 7ae8feb7 (or 128d9b42's parent bf93e61e). These two
commits deduplicate auth getSession calls (server-side on /api/access, client-side on authClient).

Focus areas — be specific and cite file_path:line_number:

1. **auth-client.ts** (128d9b42): the new getCachedSession cache, the proxy wrapping for getSession and AUTH_MUTATIONS (signIn/signUp/signOut/updateUser), the
   signIn/signUp proxy additions, the named signOut invalidation, getSession named export. Look for:
   - Correctness: does the cache stale correctly after sign-in/sign-out? Any way a stale token leaks through?
   - Memory: module-level cache; could it grow unbounded?
   - Edge cases: what about SSR? window-undefined path? concurrent in-flight race?
   - The Path-proxy wrap for signIn/signUp — does it preserve `this`/identity correctly when calling `authClient.signIn.email(...)`?
   - Concurrency: are there race conditions where two callers both enter the "no cached, fetch now" branch?
   - Type safety: the `as T` casts, `any` usage, Proxy<AuthClientType> get trap return types.
   - TTL = 30_000: appropriate? Too long? Too short?
   - The proxy wraps updateUser (a direct function). Is it truly a plain function in better-auth, or could it be a path-proxy?
   - The "args.length > 0 bypass" path — correct?

2. **get-session-cache.test.ts** (128d9b42): 9 tests. Verify they actually exercise the real code path (not just trivially passing). Check:
   - Are vi.mock factories correct? Does createAuthClient actually get called once and reused?
   - Does resetModules/import order affect correctness? (We use invalidateSessionCache() in beforeEach — is that sufficient given client module state?)
   - Test #3 "refetches once TTL window expires" uses vi.advanceTimersByTime — but the cached promise was already resolved; does this actually trigger a refetch?
   - Test #4 "refetches after the cached call rejected" — does this actually exercise the rejection path?
   - Test isolation: any shared module state that could leak?

3. **api/access/route.ts** (7ae8feb7): confirm the server-side dedupe still holds; the test access-dedupe.test.ts is the regression. Look for whether anything might
   re-introduce the multi-call.

4. **Interaction between the two fixes**:
   - With server-side /api/access deduped AND client-side cached, what's the expected residual getSession traffic on a dashboard load?
   - Are there other getSession hot paths still unaddressed? E.g., MyHomeSpace.tsx:61 — it's the only imperative call outside the http-client + providers.tsx path. Now
     cached too — but is there anything else I missed?

5. **Regression risk**:
   - Profile/avatar update flow in MyHomeSpace: user updates profile, updateUser invalidates cache, then getSession refetches → server-side /api/access still does 1
     call → fine. But the user object returned might include updated fields — does the getSession atom in useSession get updated? Or is there a disconnect between the
     imperative cache and the atom?
   - The `useSession` hook atom may be out-of-sync with our imperative cache briefly. Could that cause UI flicker?
   - Sign-in flow: after signIn.email() succeeds, both the atom AND our cache need to reflect the new session. The atom is updated by better-auth's atomListeners on
     success. Our cache is invalidated by our wrapper. Is there any gap where the http-client sends a request with stale (null) auth?

Read these files:

- /home/ubuntupunk/Projects/soralia-village/src/shared/api/auth-client.ts (full)
- /home/ubuntupunk/Projects/soralia-village/src/shared/api/**tests**/get-session-cache.test.ts (full)
- /home/ubuntupunk/Projects/soralia-village/src/app/api/access/route.ts (full)
- /home/ubuntupunk/Projects/soralia-village/src/app/api/access/**tests**/access-dedupe.test.ts (full)
- /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/with-tenant.ts (full)
- /home/ubuntupunk/Projects/soralia-village/src/shared/api/http-client.ts (lines 1-50)
- /home/ubuntupunk/Projects/soralia-village/src/app/providers.tsx (lines 30-45)
- /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/MyHomeSpace.tsx (lines 45-65)
- Run: git show 128d9b42 -- src/shared/api/auth-client.ts
- Run: git show 7ae8feb7

Return: a structured review with:

- VERIFIED (claims confirmed from the diff/code)
- ISSUES (real bugs/risks, severity, with file:line and proposed fix)
- NITS (style/minor, no behavior change)
- QUESTIONS (anything ambiguous you'd want me to resolve)
- A short verdict: ship / fix-then-ship / rework

Do not write code or commit. Read-only review

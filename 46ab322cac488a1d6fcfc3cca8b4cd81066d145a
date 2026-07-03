# Full Security Review: Commit 46ab322 — "fix: multi-domain proxy auth"

## What this commit does

Expands CORS origins, trusted origins, trusted hosts, and allowedDevOrigins to support multi-domain Apache proxy deployment across 4 custom domains (soralia.org, soralia.com, soralia.co.za, soralia.netbones.co.za). Adds lazy baseURL resolution in the auth client via Proxy pattern to fix SSR vs browser origin mismatch.
Finding Severity Map

# Risk Finding Location

## F-1 HIGH trustedOrigins accepts HTTP origins in dev mode auth.ts:199-204

## F-2 MEDIUM Dev origins include production domain names next.config.mjs:18-24

## F-3 LOW CORS startsWith matching bypassable middleware.ts:41 ✅ RESOLVED (10e5ae2a)

## F-1 (HIGH): Dev-mode trusted origins on HTTP

File: src/shared/api/auth.ts:199-204
Risk: In NODE_ENV !== 'production', trustedOrigins includes http://app.netbones.co.za, http://soralia.netbones.co.za, http://soralia.co.za. Better Auth's trustedOrigins is a CSRF defense — any origin in this list is trusted to POST auth requests. An attacker on the same network could inject a spoofed Origin: http://soralia.co.za header over plain HTTP.

Mitigation: This is scoped to !production. When running in production, the else branch (line 196) drops all dev origins entirely. Accept as-is — the guard is correct, but add a comment explicitly stating these are dev-only.

## F-2 (MEDIUM): Dev origins include production domains

File: next.config.mjs:18-24
Risk: allowedDevOrigins is a Next.js dev-only config (HMR). Including soralia.co.za, soralia.org, etc. here is harmless in production since Next.js ignores this field at runtime. However, if the dev server were accidentally exposed to the internet, these origins would be permitted for HMR WebSocket connections — potentially allowing code injection via hot module replacement.

Mitigation: Negligible in practice since dev servers run on localhost. No action required.

## F-3 (LOW): CORS startsWith matching ✅ RESOLVED

File: src/middleware.ts:41
Fix: Commit 10e5ae2a — replaced startsWith with exact hostname comparison via new URL().hostname.
Risk: CORS_ALLOWED_ORIGINS.some(allowed => requestOrigin.startsWith(allowed)) meant https://soralia.org.evil.com would match https://soralia.org.
Impact: CORS-only risk; SameSite=Lax cookies already mitigate CSRF. Hardened for defense-in-depth.

## F-4 (INFO): Auth client Proxy pattern

File: auth-client.ts:47-51
The Proxy-based lazy initialization of the auth client is well-architected. It prevents SSR from capturing an empty baseURL. No security concern — this is a correct fix.

## F-5 (INFO): Platform x-plane routing correctness

File: middleware.ts:88-99
The commit moves / out of isPlatformRoute (no longer redirects root to platform) and adds /features as a platform route. This is a routing fix, not a security issue.

## Overall Verdict

No new vulnerabilities introduced. The commit is a well-architected operational fix for multi-domain proxy auth. The HIGH finding (F-1) is pre-existing and correctly gated by NODE_ENV. The LOW finding (F-3) was resolved in 10e5ae2a.

# Hardening Recommendations (not blockers)

~~1. Fix the startsWith CORS matching in middleware.ts:41 — use exact hostname comparison~~ ✅ Done in 10e5ae2a

~~2. Rate-limit on Better Auth's GET handler too — auth.ts:route:7-8 only rate-limits POST. Add IP-based rate limiting for GET (session checks) to prevent enumeration~~ ✅ Done (300 req/min per IP)

~~3. Add Redis-ready CAPTCHA — Turnstile is wired in signup/route.ts but not in the general [...all]/route.ts. Consider adding Turnstile to the login path for high-risk sign-in attempts~~ ✅ Done (x-turnstile-token header on sign-in POST)

4. Document the trustedOrigins dev/prod split in auth.ts with an inline comment

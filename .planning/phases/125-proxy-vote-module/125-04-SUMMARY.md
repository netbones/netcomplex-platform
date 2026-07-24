---
phase: 125
plan: 04
type: tdd
wave: 2 (executed in wave 3 due to depends_on DAG)
status: complete
completed_at: '2026-07-24T08:21:00Z'
---

# Plan 125-04: TDD — InternalSignatureAdapter + SignatureService + Registry — Summary

## Outcome

✅ All 2 tasks executed. 12 / 12 vitest cases GREEN (`sign`/`verify`/convenience wrappers + invalid-input rejection + Zod-parse pass-through).

```
npx vitest run src/features/proxy-vote/__tests__/signature-adapter.test.ts
→ Test Files  1 passed (1)
→ Tests      12 passed (12)
```

## Tasks Completed

| Task      | Description                                                                                  | Status              |
| --------- | -------------------------------------------------------------------------------------------- | ------------------- |
| 125-04-01 | RED test (`signature-adapter.test.ts` — 12 cases)                                            | ✓ committed (RED)   |
| 125-04-02 | GREEN impl: InternalSignatureAdapter + adapter interface + registry + feature barrel updates | ✓ committed (GREEN) |

## Files Created / Modified

- `src/features/proxy-vote/server/signature/internal-adapter.ts` — `InternalSignatureAdapter` class; `sign(mode, input)` throws `SignatureError` for empty draw dataUrls or empty typedName; `verify(evidence)` never throws (null/missing/mismatch → false); `getProvider()` returns `'INTERNAL'`; plus `signWithInternal`, `verifyInternalSignature`, `getProvider` convenience functions.
- `src/features/proxy-vote/server/signature/provider-adapter.ts` — `SignatureProviderAdapter` interface (sign/verify/getProvider contract); `SignInput` type.
- `src/features/proxy-vote/server/signature/registry.ts` — `signatureProviders: Map<SignatureProvider, SignatureProviderAdapter>`, seeded with INTERNAL; 7 deferred providers (`LIGHTNING`/`NOSTR`/`DOCUSIGN`/`ADOBE_SIGN`/`PASSKEY`/`PGP`/`GOV_EID`) carry a TODO comment per the plan; `getSignatureAdapter()` throws `Signature provider not available: {provider}`.
- `src/features/proxy-vote/server/signature/index.ts` — barrel re-exports internal-adapter + interface + registry.
- `src/features/proxy-vote/index.ts` — feature barrel re-exports `./server/signature`.
- `src/features/proxy-vote/__tests__/signature-adapter.test.ts` — 12 vitest cases (RED → GREEN).

## Key Decisions Applied

- **`SignatureError extends Error`** — invalid input throws a typed error, callers can catch it via `instanceof SignatureError` for domain-specific 400 responses in 125-05 router.
- **`verify()` never throws** — boolean gate call sites (tRPC `signProxy` mutation in 125-05) need fail-safe verification. Null/missing provider mismatch/missing required field → `false`.
- **`signatureEvidence` flows through Zod `parse()`** — adapter output passes `signatureEvidenceSchema.parse()` (covered by test), defending the JSONB insertion path against malformed evidence per Threat Model (HIGH severity "Signature forgery via empty canvas").
- **`Map`-backed registry** — `getSignatureAdapter(provider)` dispatch means an INTERNAL/LIGHTNING switch never changes call sites; adding a new provider later is `signatureProviders.set('LIGHTNING', new LightningAdapter())` and a test, no caller rewrites. This is the only addition point, satisfying the threat model's "Registry bypass" mitigation.
- **Deferred providers carry TODO constant + comment** — the named const (`LIGHTNING_PROVIDER = 'LIGHTNING' as const`) preserves the namespace and makes the future addition trivial.

## Verification Notes

- `npx vitest run src/features/proxy-vote/__tests__/signature-adapter.test.ts` → 12/12 GREEN
- Output of `sign()` validates against `signatureEvidenceSchema.parse()` (per adapter acceptance criteria)
- `getSignatureAdapter('INTERNAL')` resolves; `getSignatureAdapter('LIGHTNING')` throws descriptive error (must_haves truth)

## Next Plan

`125-08-PLAN.md` (Wave 4 → declared wave 4, DAG wave 5) — three terminal wizard step components consume the adapter.
`125-09-PLAN.md` (Wave 5 → declared wave 5, DAG wave 6) — proxy widgets + notifications + remaining Nyquist stubs.

Refs: 125-04

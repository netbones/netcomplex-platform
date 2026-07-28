---
title: ADVISORY-034-SUPPLEMENTAL-1: SignatureProvider / CredentialType Overlap (MeetingProxy)
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-034-SUPPLEMENTAL-1: SignatureProvider / CredentialType Overlap (MeetingProxy)

**Status:** Proposed — findings below confirmed against Plan 125-01 (`125-01-PLAN.md`, Phase 125 Proxy Vote Module, wave 1, `autonomous: true`)
**Parent Advisory:** ADVISORY-033 (Platform Identity Layer) — numbering provisional pending G0 confirmation
**Trigger:** Mid-implementation discovery during `MeetingProxy` model work (proxy voting / signature attribution)
**Scope:** This supplemental does not revise ADVISORY-034's phased plan or gates. It documents a new finding and proposes a narrow schema decision that should be resolved before `MeetingProxy` ships, since it touches the same identity-credential surface ADVISORY-034 is establishing.
**Timing note:** Plan 125-01-01 (task 03) runs `npx prisma db push` for the full `MeetingProxy` model and 8-value `SignatureProvider` enum **as currently specified below, with no `credentialId` FK and no `deletedAt`**. Gate S1 has not been resolved at time of that push. See §7.

---

## 1. Context

`MeetingProxy` (governance/proxy-vote model, currently in implementation) introduces:

```prisma
enum SignatureProvider {
  INTERNAL
  LIGHTNING
  NOSTR
  DOCUSIGN
  ADOBE_SIGN
  PASSKEY
  PGP
  GOV_EID
}
```

ADVISORY-034 Phase 1 proposes:

```prisma
enum CredentialType {
  EMAIL
  PASSKEY
  NOSTR
  LNURL
  OIDC
}
```

Three values overlap directly or by close analogue: `PASSKEY` / `PASSKEY`, `NOSTR` / `NOSTR`, `LIGHTNING` / `LNURL`. This was not anticipated when ADVISORY-033 was drafted, since `MeetingProxy` was not yet in scope at that time.

## 2. Finding

Two independent enums are being built to answer the same underlying question — "how was this person's identity or intent cryptographically or procedurally verified?" — in two different domains:

- `Credential.type` answers it for **authentication** (how did this person log in / prove they control this identity)
- `SignatureProvider` would answer it for **legal attestation** (how did this person sign this specific governance document)

This is structurally the same shape as **Conflict Register C2** (three overlapping gating systems controlling the same concept from different angles) and the still-open **Phase 50 `NotificationType`** enum-vs-lookup-table tension. Left undocumented, this becomes a third instance of the same pattern — worth resolving at the design stage rather than discovering it later as drift, per standing practice on the Conflict Register.

The two concepts are not identical, though, and shouldn't be silently merged:

- A `Credential` is a **standing, reusable, revocable** authentication method tied to an `Identity` (per ADVISORY-033 §4).
- A `SignatureProvider` value on `MeetingProxy` describes **one specific signing event** for one specific document, which may or may not have gone through an existing platform `Credential` (e.g. `DOCUSIGN`/`ADOBE_SIGN`/`GOV_EID` are external attestation services with no platform login involved at all).

## 3. Recommendation

**Do not maintain two independent enums for the overlapping values.** Instead:

1. Where the signature method **is** a platform credential already used to authenticate the session (`PASSKEY`, `NOSTR`, `LIGHTNING`/`LNURL`), the signature evidence record should reference the actual `Credential` row that performed the signing action, rather than re-describing the method as a bare string. This gives proxy votes a stronger evidentiary chain: "signed via passkey" traces to the exact `Credential.id` that authenticated the session, not an unlinked parallel claim.
2. `SignatureProvider` is narrowed to only the values that are **not** platform credentials — external/legal attestation paths with no `Credential` equivalent:
   ```prisma
   enum SignatureProvider {
     INTERNAL          // platform-native, tied to a Credential — see credentialId below
     DOCUSIGN
     ADOBE_SIGN
     PGP
     GOV_EID
   }
   ```
3. `MeetingProxy` (or its signature-evidence child record, if one exists separately — needs source verification, see Open Questions) carries a nullable `credentialId` FK, populated when `signatureProvider = INTERNAL` and the signing method traces to `Credential.type IN (PASSKEY, NOSTR, LNURL)`. When populated, `Credential.type` is the authoritative "how" — `SignatureProvider` at that point just marks "this was platform-native" vs. "this was an external service."

This keeps exactly one source of truth for "what counts as passkey/Nostr/Lightning verification" (the `Credential` model from ADVISORY-034) while still letting `MeetingProxy` express attestation paths that have nothing to do with platform login (DocuSign, Adobe Sign, PGP-signed documents, government eID).

**Confirmed against Plan 125-01:** the implementation as specified does not add a `credentialId` FK. Instead, `MeetingProxy` carries `signatureEvidence Json @default("{}") @db.JsonB`, validated per-provider by a Zod schema in a later plan (125-03). This is a materially different design from §3's proposal:

|                                                                                               | JSONB blob (as specified in 125-01)                                                                                   | `credentialId` FK (as proposed in §3)                               |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Flexibility for external providers (DocuSign envelope ID, PGP fingerprint, GOV_EID reference) | High — arbitrary per-provider shape                                                                                   | Requires a separate mechanism for non-`Credential` providers anyway |
| Evidentiary chain for `PASSKEY`/`NOSTR`/`LIGHTNING`                                           | Weak — re-describes the method as data, not a reference to the actual `Credential` row that authenticated the session | Strong — traces directly to `Credential.id`                         |
| Migration cost if changed later                                                               | Low now, higher once rows exist with populated `signatureEvidence`                                                    | N/A if adopted now                                                  |

These aren't mutually exclusive. The lowest-risk path is **both**: keep `signatureEvidence` JSONB for all providers (needed regardless, for DocuSign/Adobe Sign/PGP/GOV_EID payload shape), and add an optional `credentialId String?` FK on `MeetingProxy`, populated only when `signatureProvider` maps to a platform credential. This preserves 125-01's flexibility while closing the evidentiary gap for the three overlapping values.

## 4. Retention / Audit Note — CONFIRMED GAP

`MeetingProxy` is a governance record (proxy voting). Per standing principle, consent/ledger-adjacent records require a five-year audit log minimum.

**Confirmed against Plan 125-01's field list:** `MeetingProxy` has `createdAt`/`updatedAt` but **no `deletedAt` field**. This is not an open question — the model as specified has no soft-delete column at all, contrary to the `docs/STEERING/SOFT_DELETE.md` convention. This should be added in the same migration that resolves Gate S1, since adding it later is cheap, but any hard-delete code path written against this table before the field exists is not.

## 5. Findings Confirmed Against Plan 125-01

| #   | Was                                                                                 | Now                                                                                                                                                                  | Detail                                   |
| --- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Open question — is `signatureProvider` on `MeetingProxy` directly or a child model? | **Resolved.** It's directly on `MeetingProxy`, alongside a new `signatureEvidence Json @default("{}") @db.JsonB` field. No separate signature-evidence model exists. | See §3 confirmed-design comparison table |
| 3   | Open question — does `MeetingProxy` need `deletedAt`?                               | **Resolved — confirmed gap, not a question.** The 18-field list in Plan 125-01 has no `deletedAt`. See §4.                                                           | Needs to be added, not merely decided    |

## 6. Remaining Open Questions for DavDev

| #   | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Blocks                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 2   | **RESOLVED (BD-2v8t, 2026-07-25):** GOV_EID kept as a generic category — represents any government-issued digital identity, not a specific scheme. Enables multi-jurisdiction support without enum bloat (vs. `ZA_HOME_AFFAIRS` etc.). Specific adapters registered per-deployment. Scope documented in UBIQUITOUS_LANGUAGE.md.                                                                                                                                                                                           | Ship readiness, not schema shape                                          |
| 4   | Should the enum-vs-lookup-table decision (already open for `NotificationType`, now touching `SignatureProvider` too) be resolved once, generally, as a documented pattern rather than per-model?                                                                                                                                                                                                                                                                                                                          | Applies to both this and the Phase 50 gate — recommend resolving together |
| 5   | **(New)** JSONB-only `signatureEvidence` (as specified in 125-01) vs. adding an optional `credentialId` FK alongside it (per §3's "do both" recommendation) — which is the target design?                                                                                                                                                                                                                                                                                                                                 | Schema finalization; determines scope of the amendment plan               |
| 6   | **(New)** Which future plan number carries the amendment — narrowing `SignatureProvider` to drop `PASSKEY`/`NOSTR`/`LIGHTNING` (or leaving it as-is per the "document as accepted duplication" alternative in Gate S1), adding `credentialId`, and adding `deletedAt`? Plan 125-01 is `autonomous: true` and pushes the current 8-value enum + no-`deletedAt` shape in wave 1 — confirm whether this is a deliberate placeholder with a tracked follow-up plan, or whether Gate S1 should resolve before wave 1 executes. | Sequencing — see §7                                                       |

## 7. Decision Gate

**Gate S1** (supplemental gate, does not renumber ADVISORY-033's G0–G4): DavDev confirms whether `MeetingProxy.signatureProvider` should reference `Credential` for the overlapping values as proposed in §3, or whether `SignatureProvider` should remain fully independent with the overlap simply documented in `UBIQUITOUS_LANGUAGE.md` as an accepted, intentional duplication (mirroring how C4/C5/C6 document accepted terminology splits rather than forcing convergence).

**Sequencing risk:** Plan 125-01 is `autonomous: true`, wave 1, and its task 03 runs `npx prisma db push` for the full 8-value `SignatureProvider` enum and the complete `MeetingProxy` shape (no `credentialId`, no `deletedAt`) as an unconditional part of that push. If this plan executes before Gate S1 resolves, any narrowing of `SignatureProvider` or addition of `credentialId`/`deletedAt` afterward becomes a schema change against a table that may already have rows — a breaking migration rather than a clean design choice, exactly as flagged in the original §7 (now §6, item 6) close.

No schema change should land for `MeetingProxy.signatureProvider` until Gate S1 is resolved, since narrowing the enum after ship is a breaking change to any already-recorded proxy votes. **DavDev should explicitly confirm whether Plan 125-01 is permitted to execute in its current form (accepting the amendment as planned technical debt with a named follow-up plan) or whether it should be held pending Gate S1.**

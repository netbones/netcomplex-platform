---
phase: 125-proxy-vote-module
type: execute
status: ready_for_planning
created: 2026-07-14
updated: 2026-07-23
milestone: M5+ Post-Launch
---

# Phase 125: Proxy Vote Module

**Source:** `docs/PROXY_SIG_DISCUSSION.md` (Discussions A, B, C)

**Goal:** Design and implement a proxy vote submission module for HOA meetings. Owners who cannot physically attend AGM/SGM/Special Resolution Meetings/Trustee Elections can appoint a proxy nominee, upload a signed form, and have the proxy accept via notification workflow.

## Why this module exists

Given Netcomplex's architecture, this is modeled as a **lightweight workflow attached to an Event**, not a "form builder". It feels like checking in for an event rather than applying for something — simple, low-friction, and reusing existing capabilities (Events, Notifications, User Directory, Media uploads).

## Module Scope

**Proxy Vote** can be enabled only for events where:

- AGM
- SGM
- Special Resolution Meeting
- Trustee Election

## Resident Journey

### Step 1 — Open Meeting

Resident views the meeting event and selects "I cannot attend" to start proxy flow.

### Step 2 — Appoint Proxy

- Simple search box to find resident proxy nominee
- Option for "My proxy is not a resident" with name/email/phone fields
- Most HOAs allow non-members if permitted by constitution

### Step 3 — Upload Signed Proxy Form

- Upload field for signed PDF/JPG/PNG document
- No OCR, no AI — just file upload to existing media/document subsystem
- Supported: PDF, JPG, PNG

### Step 4 — Proxy Acceptance

Nominated person receives notification with:

- Accept/Decline buttons
- View Form option

### Step 5 — Digital Signature

Proxy confirms agreement via:

- Draw signature OR type full name + checkbox
- Depending on HOA legal requirements

### Step 6 — Complete

- Shows submission status: "Submitted to HOA, Pending verification"
- Indicates owner signature ✓ and proxy signature ✓ status

## HOA Dashboard

Admin widget showing:

- Owner and proxy names
- Checkmarks for signed/unsigned status
- Approve/Reject buttons
- QR Reference code after approval (PV-YYYY-NNNN)

## Status Lifecycle

```
Draft
  ↓
Waiting for Upload
  ↓
Waiting for Proxy
  ↓
Pending HOA Review
  ↓
Approved ←→ Rejected
  ↓
Withdrawn
```

Six states only — simple and clear.

## Notifications

| Recipient | Events                                                       |
| --------- | ------------------------------------------------------------ |
| Owner     | Proxy accepted, Proxy declined, HOA approved, HOA rejected   |
| Proxy     | You've been nominated, Reminder to sign, Submission complete |
| HOA       | New proxy received, Proxy accepted, Ready for review         |

## Database Model

MeetingProxy table:

- `id` — primary key
- `meetingId` — FK to Event
- `ownerUserId` — FK to User
- `ownerHouseholdId` — FK to Household
- `proxyUserId` (nullable) — FK to User if resident
- `proxyName` — text (if non-resident)
- `proxyEmail` — text (if non-resident)
- `proxyPhone` — text (if non-resident)
- `formDocumentId` — FK to Document (references media/document subsystem)
- `ownerSignedAt` — timestamp
- `proxySignedAt` — timestamp
- `approvedBy` — FK to User
- `approvedAt` — timestamp
- `status` — enum (Draft, WaitingForUpload, WaitingForProxy, PendingHoaReview, Approved, Rejected, Withdrawn)
- `notes` — text
- `signatureProvider` — enum (`INTERNAL` default; for Phase 125, only INTERNAL is active; enum values reserved: INTERNAL, LIGHTNING, NOSTR, DOCUSIGN, ADOBE_SIGN, PASSKEY, PGP, GOV_EID)
- `signatureEvidence` — JSON (nullable at DB level; shape depends on provider — see Signature Service evidence schema below)
- `createdAt`, `updatedAt` — timestamps

**Phase 125 ships only `signatureProvider = INTERNAL`.** The enum reserves all Discussion C provider slots so future phases can add providers (Lightning/LNbits adapter, Nostr key signing, DocuSign, etc.) without a schema migration.

### `signatureEvidence` shape (INTERNAL provider)

```json
{
  "mode": "draw" | "type",
  "signatureDataUrl": "<data:image/png;base64,...>"  // draw mode only
}
```

For future providers (Lightning, Nostr, etc.), the evidence shape would be:

```json
{
  "provider": "LIGHTNING",
  "documentHash": "<SHA256 hex>",
  "pubkey": "<Lightning pubkey hex>",
  "signature": "<hex signature>",
  "timestamp": "<ISO 8601>"
}
```

This is deferred — Phase 125 does not implement Lightning or any external provider.

## Signature Service Architecture (Provider Abstraction)

Per Discussion C, the signature system is modeled as a **provider abstraction** — not a monolithic draw/type widget. This keeps Netcomplex vendor-neutral and enables future decentralized identity providers.

### `SignatureService` interface

```typescript
interface SignatureService {
  sign(provider: SignatureProvider, documentHash: string): Promise<SignatureEvidence>;
  verify(provider: SignatureProvider, documentHash: string, evidence: SignatureEvidence): Promise<boolean>;
}

type SignatureProvider = 'INTERNAL' | 'LIGHTNING' | 'NOSTR' | 'DOCUSIGN' | 'ADOBE_SIGN' | 'PASSKEY' | 'PGP' | 'GOV_EID';

interface SignatureEvidence {
  provider: SignatureProvider;
  mode?: 'draw' | 'type';                     // INTERNAL only
  signatureDataUrl?: string;                  // INTERNAL draw mode
  typedName?: string;                         // INTERNAL type mode
  documentHash?: string;                      // external providers
  pubkey?: string;                            // external providers
  signature?: string;                         // external providers
  timestamp: string;
}
```

### Phase 125 ships ONLY the INTERNAL adapter

```typescript
// src/features/proxy-vote/server/signature/internal-adapter.ts
class InternalSignatureAdapter {
  // Phase 125: draw canvas → PNG data URL stored in signatureEvidence.signatureDataUrl
  // OR typed full name + checkbox → stored as signatureEvidence.typedName + mode:'type'
  sign(documentHash: string): Promise<SignatureEvidence> { ... }
  verify(documentHash: string, evidence: SignatureEvidence): Promise<boolean> { ... }
}
```

### Provider adapter interface (deferred — stub for future phases)

```typescript
// src/features/proxy-vote/server/signature/provider-adapter.ts
interface SignatureProviderAdapter {
  provider: SignatureProvider;
  sign(documentHash: string): Promise<SignatureEvidence>;
  verify(documentHash: string, evidence: SignatureEvidence): Promise<boolean>;
}
```

Phase 125 defines the `SignatureProviderAdapter` interface and the `signatureProviders` registry pattern (Map-based provider dispatch), but `INTERNAL` is the only registered provider. Adding Lightning, Nostr, or DocuSign is a per-provider adapter implementation in a future phase — no schema changes required (the `signatureProvider` enum and `signatureEvidence` JSON column already accommodate them).

### dWallet relationship

The dWallet module (Phase 47) defines the `WalletService` abstraction. Signature and Wallet are **separate services** per Discussion C's four-layer model:

```
Identity Service (Better Auth)
    ↓
Wallet Service (dWallet — Phase 47)
    ↓
Signature Service (this phase — Phase 125)
    ↓
Settlement Service (future)
```

The Signature Service does not depend on dWallet. A Lightning adapter in a future phase would use LNbits as both wallet AND signature provider, but the `SignatureService` interface treats it as a signature provider only — the adapter calls LNbits' message-signing extension, not the wallet service.

## Integration Points

1. **Events module** — Proxy Vote attached to AGM/SGM/Trustee Election events
2. **Media subsystem** — Document upload to existing document management
3. **Notifications** — Multi-party notification system
4. **User Directory** — Resident search for proxy nomination
5. **Admin UI** — Approval widget in admin space
6. **Signature Service** — Provider-abstraction layer (INTERNAL adapter shipped; external providers deferred)
7. **dWallet** — No direct dependency; Wallet Service is a separate layer. Future Lightning adapter bridges both.

## Optional Nice-to-Haves (Future)

- Allow one proxy holder to represent multiple owners (subject to HOA constitution limits)
- Show voting units represented at check-in
- Export attendance register including proxy allocations
- Generate PDF register for chairperson
- Automatically invalidate outstanding proxies once meeting closes

## Deferred: External Signature Providers (Discussion C)

**All non-INTERNAL signature providers are deferred to future phases.** Phase 125 defines the `SignatureProvider` enum, the `SignatureProviderAdapter` interface, and the `signatureProviders` registry — but ships only the `INTERNAL` adapter. The following providers are explicitly deferred:

| Provider | Adapter | Description |
|----------|---------|-------------|
| LIGHTNING | LNbits message-signing extension | Document hash signing via Lightning wallet pubkey |
| NOSTR | Nostr key signing | Private/public key signing without certificates |
| DOCUSIGN | DocuSign API | Industry-standard e-signature provider |
| ADOBE_SIGN | Adobe Sign API | Alternative enterprise e-signature |
| PASSKEY | WebAuthn / platform authenticator | Device-bound biometric signatures |
| PGP | OpenPGP key signing | Decentralized key-based signatures |
| GOV_EID | Government eID integration | National digital identity (e.g., South African Home Affairs) |

Adding a provider requires only: implementing a `SignatureProviderAdapter`, registering it in `signatureProviders`, and adding the UI selector. No schema migration needed — `signatureProvider` enum and `signatureEvidence` JSON column already accommodate all providers.

## Next Steps

Run `/gsd-plan-phase 125-proxy-vote-module` to create detailed implementation plan.

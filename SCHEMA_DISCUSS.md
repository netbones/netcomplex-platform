Pulling from the schema directly (not just the analysis doc) to ground this:

## 1. Model Duplication

**A. Seat models (PremiumSeat / SoloSeat / StandardSeat)**

Verified shared fields against actual schema: `id`, `tenantId`, `userId`, `platformAddress`, `organizationId`, `createdAt`, `updatedAt`, `archivedAt`, `status`, `addressId` — 10 fields, confirming the analysis's count.

Important context the analysis missed: this is **not accidental duplication** — `IDENTITY_MODEL.md`'s Schema Drift Notes explicitly record that a `SeatType` discriminator on a single polymorphic table was considered and _deliberately rejected_: "Seat type is inherently known by which table the record lives in. No cross-table type discriminator required." So collapsing these into one table would be reopening a closed architectural decision, not fixing an oversight.

| Option                                                                                    | Description                                                                                                                                             | Trade-off                                                                                                                                                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A — Leave as-is                                                                           | Accept the ~10-field overlap as the cost of type-safety-by-table                                                                                        | Zero migration risk. Ongoing manual sync burden when adding shared fields (e.g. `archivedAt`/`status` had to be added 3x)                                                |
| B — Shared base via Prisma (not possible today)                                           | N/A                                                                                                                                                     | Prisma has no table inheritance; ruled out                                                                                                                               |
| C — Extract shared fields into a `Seat` base table, seat-specific tables hold only deltas | `Seat { id, tenantId, userId, platformAddress, organizationId, status, addressId, kind }` + `StandardSeatDetail`, `SoloSeatDetail`, `PremiumSeatDetail` | Real migration (FK rewiring across `RequestNote`, delegation, etc. wherever seat IDs are referenced), but ends the drift-on-every-shared-field-addition problem for good |
| D — Codegen/lint guard                                                                    | Keep 3 tables, add a Steiger/ESLint or Prisma-schema lint rule that fails CI if the 3 seat models' shared-field set diverges                            | No migration; addresses _future_ drift (e.g. next time someone adds a field to one seat type and forgets the other two) without touching the settled architecture        |

Given the settled decision in IDENTITY_MODEL.md, **D** is the lowest-risk fix that actually targets the real failure mode (silent divergence over time), without re-litigating C2-adjacent architecture.

**B. Invoice/Payment near-duplicates (TenantInvoice/ProviderInvoice, TenantPayment/PaymentTransaction)**

Checked field-by-field — these aren't true duplicates, they're two different billing directions with a common shape:

- `TenantInvoice`/`TenantPayment`: **platform bills tenant** (subtotal, taxAmount, downloadReady — tax-inclusive SaaS billing)
- `ProviderInvoice`/`PaymentTransaction`: **platform settles with marketplace providers** (platformFee, processorFee, netAmount — revenue-split accounting)

This is domain-correct separation (billing-out vs. billing-in), not drift. I'd downgrade this from the analysis's "near-duplicate" framing — the overlap (`invoiceNumber`, `items`, `total`, `currency`, `status`, `paidAt`, `pdfUrl`) is exactly what you'd expect from two invoice-shaped tables in different subdomains. Only actionable item here: no shared `InvoiceLineItemSchema`/Zod validator reused between the two `items: Json` fields — worth a shared Zod schema so they can't independently drift in shape, but not a schema-level fix.

## 2. Denormalized Aggregate Drift

You already have the right infrastructure for this — the `Outbox`/`OutboxDeadLetter` models exist specifically for durable domain-event side effects (per the docstring referencing `TOPOLOGY.md` Lane A and ADVISORY-033). None of the ~13 denormalized fields in the analysis's table currently route through it.

| Option                              | Approach                                                                                                                                                             | Fits which fields                                                                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Status quo                      | Direct increment/decrement at write time, no reconciliation                                                                                                          | Current state — accumulating drift risk (DWallet balance, Competition entryCount, Coupon currentRedemptions are the highest-consequence: money and limits)                                         |
| B — Outbox-driven recompute         | Every write that changes a denormalized field emits an Outbox event; a dispatcher handler recomputes the aggregate from source-of-truth (idempotent, so replay-safe) | DWallet.balance/lifetimeEarned/lifetimePaid, Competition.entryCount, Coupon.currentRedemptions, CommunityServiceListing.rating/reviewCount — all have a clear "count/sum of child rows" definition |
| C — Scheduled reconciliation job    | Periodic cron recomputes and corrects drift, logs discrepancies                                                                                                      | Lower-consequence fields: Content.viewCount, Resource.downloadCount, ProviderReputation composite scores, AgentProfile aggregates — analytics-adjacent, tolerant of eventual consistency           |
| D — On-the-fly `SELECT COUNT`/`SUM` | Drop the denormalized field, compute at read time                                                                                                                    | Tenant.pageCount — cheap query, low read frequency, no reason to denormalize at all                                                                                                                |

My recommendation: **split by consequence** — money/limits (B) get outbox-backed recompute since you already paid for that infra; display-only counters (C) get cheap cron reconciliation; genuinely needless denormalization like `Tenant.pageCount` (D) just gets removed.

One flag: `DWallet.balance` drifting from `WalletTransaction` sum is the one I'd treat as urgent given it's real money (POPIA/audit-log standing requirement already applies a 5-year retention here) — worth its own gate if you want to act on it before the others.

Want me to draft this up as a formal advisory (I'd need the external register checked first for the next available number), or keep this at the discussion stage for now?

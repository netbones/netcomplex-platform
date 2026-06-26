# Phase 111 Agent Gateway — Discussion Log

**Date:** 2026-06-26
**Source:** AGENT_DELEGATION_DISCUSSION.md (ADR-020 proposal)
**Outcome:** 6 gray areas resolved, 5 new decisions (D-19 through D-23)

## Decisions Made

| Decision       | Topic             | Resolution                                                                                                                                                                                                                                              |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-07 (updated) | Delegation scopes | Granular: VIEW_LISTING, MANAGE_OCCUPANCY, VIEW_FINANCIALS, CONTACT_OCCUPANTS, MARKET_PROPERTY                                                                                                                                                           |
| D-07a          | Resident opt-out  | Mechanism universal, availability per-tenant policy. Resident widget with block toggle per agent                                                                                                                                                        |
| D-19           | Blockchain        | App-layer only in 111. Smart contracts deferred to 113+ (Enterprise opt-in)                                                                                                                                                                             |
| D-20           | ZKP privacy       | Phase 111 skips ZKP. Spike ownership proof prototype in Phase 112                                                                                                                                                                                       |
| D-21           | Commission model  | Phase 111 records delegation actions only. Configurable rates deferred to billing phase                                                                                                                                                                 |
| D-22           | AI agent auth     | JWT + scope claims via X-Agent-Token header. No wallet-based auth in 111                                                                                                                                                                                |
| D-23           | Resident privacy  | Phase 111 includes resident-facing delegation widget with per-agent block toggle. Complements dWallet (Phase 47): dWallet = data-sharing consent, delegation = agent access consent. Follows dWallet UX pattern (toggle + append-only audit + Pino log) |

## Deferred to Future Phases

| Item                                                 | Target Phase         |
| ---------------------------------------------------- | -------------------- |
| ZKP ownership proof prototype                        | Phase 112            |
| Smart contract delegation + escrow + Delegation NFT  | Phase 113+           |
| Per-tenant commission rates (platform cut + agent %) | Future billing phase |
| OAuth2/OIDC for external agents                      | Future               |
| Agent marketplace                                    | Future               |
| Multi-property delegation bundles                    | Future               |

---
phase: 125
plan: 05
type: execute
wave: 3
status: complete
completed_at: '2026-07-24T08:55:00Z'
---

# Plan 125-05: tRPC Router + Proxy CRUD + Proxy Notify Services — Summary

## Outcome

✅ All 2 tasks executed. proxyVoteRouter with 7 procedures wired into appRouter; 8 CRUD + 8 notify services written; tenantId WHERE clauses on every query; module gating on all writes.

## Tasks Completed

| Task      | Description                                                                                                                                                             | Status |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 125-05-01 | proxy-crud.service.ts — 8 ()createProxy, updateProxy, signProxy, approveProxy, rejectProxy, withdrawProxy, getProxyById, getProxiesByMeeting) + bonus getProxiesByOwner | ✓      |
| 125-05-02 | proxy-notify.service.ts + proxy-vote.router.ts + appRouter registration                                                                                                 | ✓      |

## Files Modified / Created

- `src/features/proxy-vote/server/proxy-crud.service.ts` — 8 CRUD functions; transitions go through `transition()` from status-transitions.ts; `approveProxy()` generates `PV-{YYYY}-{NNNN}` via `COUNT(*)+1`; tenantId in every WHERE clause; `notDeleted(meetingProxies)` filter applied
- `src/features/proxy-vote/server/proxy-notify.service.ts` — 8 notifications (nominated / accepted / declined / hoaNew / hoaReady / ownerApproved / ownerRejected / reminder); `db.insert(notifications).values({...})` pattern per merits.ts:169-178
- `src/features/proxy-vote/server/proxy-vote.router.ts` — `proxyVoteRouter` with 7 procedures (create / getById / getByMeeting / update / sign / approve / reject / withdraw). Procedures:
  - `create`, `update`, `sign`, `withdraw` → `moduleProcedure` (gated on `proxyVote` module)
  - `approve`, `reject` → `privilegedModuleProcedure` (require ADMIN/BOARD/COMMITTEE role + module enabled)
  - `getById`, `getByMeeting` → `tenantProcedure` (tenant-scoped reads)
- `src/server/routers/community/proxy-vote.ts` — barrel re-exporting `proxyVoteRouter`
- `src/server/routers/index.ts` — registers `proxyVote: proxyVoteRouter` in `appRouter`
- `src/shared/lib/constants/tiers.ts` — adds `'proxyVote'` ModuleKey + module entry (`tier: 'pro-max'`)
- `src/shared/api/db.ts` + `src/shared/api/server/index.ts` — barrel exports `meetingProxies`

## Key Decisions Applied

- **Privileged roles for approve/reject** — only `ADMIN`/`BOARD`/`COMMITTEE` can finalize; residents can create/update/sign/withdraw their own. Threat model HIGH severity (`HOA admin approving without PendingHoaReview status`) mitigated by `transition()` rejecting illegal transitions.
- **`requireTenantRLS` deferred to HTTP boundary** — tenant isolation at DB level via explicit `tenantId` WHERE clauses (the tRPC route boundary already enforces `tenantProcedure` ctx.tenantId); `requireTenantRLS` is for raw `Request` routes, not tRPC, per shared/api patterns.
- **`transition()` is the single path** — service-level status changes happen exclusively through `transition(currentStatus, event)`. The mapper enforces a finite adjacency table with three terminal states (Approved / Rejected / Withdrawn) — `withdrawProxy` from a terminal state throws `ProxyStatusError` per CONTEXT.md.
- **PV-YYYY-NNNN format with COUNT+1** — single-writer race acceptable in MVP; per RESEARCH.md §Reference Code Pattern, eventual consistency acceptable since proxy approvals are sequential workflows.
- **Notification insertion is fire-and-forget** — `db.insert(notifications).values(...)` awaited per call; failure surfaces from the tRPC root but is logged, not thrown (mitigating Notification spam from any state-transition failure path).
- **Module-gated tenant vs privileged scenarios split** — `moduleProcedure` covers resident self-service; `privilegedModuleProcedure` covers HOA board approval flows. Both check `ctx.tenantId` and module enablement in middleware.

## Verification Notes

- `npx tsc --noEmit --skipLibCheck` → 0 errors across the entire project (proxy-vote + everything else).
- CRUD service functions reference 7-status lifecycle correctly: every status change routes through `transition()` so a transition map regression would surface deterministically.

## Next Plan

`125-07-PLAN.md` (Wave 4) — ProxyFlowWizard + 5 reusable UI components.
`125-08-PLAN.md` (Wave 5) — wizard step components (ProxyUploadForm / ProxyStatusCard / ProxyAcceptanceCard).
`125-09-PLAN.md` (Wave 6) — widgets (HoaProxyWidget / ProxyWidget) + remaining Nyquist stubs.

Refs: 125-05

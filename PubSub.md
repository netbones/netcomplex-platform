# Pub/Sub (Publish/Subscribe) Event Architecture Review

**Project:** soralia-village (Netcomplex / Soralia Village)
**Date:** 2026-07-15
**Scope:** Event bus, caching, state reactivity, real-time, server-side emitters

---

## 1. Executive Summary

The project **does not have a functioning, unified Pub/Sub event bus.** It has a _designed_ one (`src/shared/api/events/emitter.ts`, a typed wrapper over Node's `EventEmitter`), but it is effectively **inert**: it is emitted from 12+ call sites and has exactly **one** subscriber module (`achievements/listener.ts`) that is **never imported at runtime**, so every `emitEvent(...)` call publishes to a bus with zero registered handlers.

"Event-driven" behaviour that actually works is implemented **ad hoc** through four overlapping, uncoordinated mechanisms:

1. **Supabase Realtime** (DB change feeds + broadcast) — the real server→client push channel.
2. **Next.js on-demand cache revalidation** (`revalidatePath` / `revalidateTag`) — the de-facto server→server-state signal.
3. **TanStack Query** cache invalidation (`invalidateQueries` in mutations) — client-side reactivity.
4. **DOM `CustomEvent`s** — one isolated `window.dispatchEvent(new Event('page-flags-updated'))` bridging two unrelated components.

There is **no cross-cutting bus** that lets an unrelated module publish and another unrelated module react. Reactivity is achieved by side effects on the database (Supabase Realtime) and by cache invalidation, not by an event topology.

---

## 2. The Designed Event Bus (and why it is dead)

### 2.1 Implementation

`src/shared/api/events/emitter.ts` defines a strongly-typed `DomainEvent` union (8 event types) and a `TypedEventEmitter` class wrapping `node:events`' `EventEmitter`. Public API:

- `emitEvent(type, payload)` — `emitter.ts:105`
- `onEvent(type, handler)` — `emitter.ts:119`
- `offEvent(type, handler)` — `emitter.ts:126`

Re-exported from `src/shared/api/events/index.ts` and `src/shared/api/server/index.ts:156`.

### 2.2 Publishers (working)

12 `emitEvent` call sites across API routes and tRPC routers:

| Event                       | Call site                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `booking.created`           | `src/app/api/bookings/route.ts:188`, `src/server/routers/operations/bookings.ts:249`                            |
| `content.created`           | `src/app/api/content/route.ts:153`, `src/server/routers/core/content.ts:373`                                    |
| `maintenance.created`       | `src/app/api/maintenance/route.ts:243`, `src/server/routers/operations/maintenance/maintenance-requests.ts:156` |
| `event.rsvp`                | `src/server/routers/community/events.ts:329`                                                                    |
| `group.joined`              | `src/app/api/groups/route.ts:168`, `src/server/routers/community/groups.ts:328`                                 |
| `competition.entered`       | `src/app/api/competitions/route.ts:186`                                                                         |
| `maintenance.team_assigned` | `src/app/api/maintenance/[id]/assign/route.ts:304`                                                              |

### 2.3 Subscribers (broken)

The _only_ subscriber is `src/shared/api/achievements/listener.ts`, registering 6 `onEvent` handlers that all call `processAchievementEvent(...)`.

**The fatal gap:** `listener.ts` is loaded only via `import './listener'` in `src/shared/api/achievements/index.ts`. That module is **imported nowhere** in the codebase (verified — zero importers). Separately, `src/server/routers/community/achievements.ts` is a _tRPC router_ and is unrelated to `shared/api/achievements`; it does not pull in the listener.

**Consequence:** All achievement side effects (merit awarding, progress tracking) never run. The achievement feature may appear functional via direct DB writes elsewhere, but the **event-driven** awarding path is 100% dead code.

### 2.4 Additional bus defects

- **`merit.recognized` and `maintenance.team_assigned`**: `merit.recognized` is declared as an event type but **never emitted** anywhere. `team_assigned` is emitted but has no listener.
- **In-memory only**: `node:events` `EventEmitter` is process-local. On Vercel serverless, each lambda is a separate process, so an `emit` in request A's lambda cannot reach an `onEvent` registered in request B's lambda (and the listener isn't even registerable). There is **no durable broker** (Redis / RabbitMQ / transactional outbox) behind it.
- **No error/audit trail**: `emitEvent` swallows errors into Pino logs; no dead-letter, no retries, no observability into "did any handler run?"
- **No event catalog / ownership map**: nothing documents which consumer owns which event.

---

## 3. Real Reactivity Mechanisms (what actually works)

### 3.1 Supabase Realtime (server → client push)

The genuine real-time spine. No raw WebSockets/socket.io/Pusher.

- **Chat** — `src/features/directory/ui/DirectoryChatModal.tsx:84-99` subscribes to `postgres_changes` INSERT on `Message`; `src/features/marketplace/ui/InquireModal.tsx:101` same.
- **Presence** — `src/entities/chat/model/use-presence.ts:82-124` (`presence:${conversationId}`).
- **Typing** — `src/features/chat/model/useMessageSend.ts:49-54` (`typing:${conversationId}`).
- **Notifications** — `src/app/api/notifications/route.ts:154,227` broadcasts `new-notification` on `notifications:${userId}`; client in `src/widgets/dashboard/model/useNotifSubscription.ts:33-47`.
- **Dispute mediation** — `src/entities/dispute/ui/MediationThread.tsx:56-72` (`new-mediation-message`).

### 3.2 Cache revalidation (server → server-state signal)

`src/shared/api/revalidation.ts` centralizes `revalidatePath`-based helpers (`revalidateDashboard`, `revalidateContent`, `revalidateConversations`, `revalidateAdminChanges`, `revalidateGate`, …). `revalidateTag` is used only for the `SETTINGS` tag in a handful of admin settings routes. This is the closest thing to "something changed, recompute" signal — but it is path/tag based, not event based.

### 3.3 TanStack Query (client state reactivity)

Pervasive via `useMutation` + `useQueryClient().invalidateQueries`. No SWR. This is the standard client-side "event bus" substitute.

### 3.4 DOM CustomEvent (single ad-hoc bridge)

`src/widgets/admin/ui/PageSettingsWidget.tsx:55` → `window.dispatchEvent(new Event('page-flags-updated'))`; `src/shared/ui/Header.tsx:284` listens and refetches. The **only** true cross-component client signal, and it is bespoke.

---

## 4. State Management (not an event bus)

Only **Zustand** is used (no Jotai/Redux/Recoil/Valtio). Stores are local client state, none act as a bus:

- `src/entities/widget/model/widget-store.ts` — widget layouts/visibility (`persist` + debounced DB sync).
- `src/entities/tenant/model/gate-context-store.ts` — feature gate flags.
- `src/entities/tenant/api/context.tsx` — current-tenant SSR state.

---

## 5. Webhooks (isolated, not event-driven)

- `src/app/api/marketplace/webhook/route.ts` — Paystack, HMAC-SHA512 verified, resolves booking, calls `notifyPaymentReceived` directly (does **not** publish to the bus).
- `src/app/api/payments/paystack/webhook/route.ts`, `src/app/api/payments/paypal/webhook/route.ts` — payment providers.
- `src/app/api/webhooks/payload/route.ts` — generic stub, **unsecured** (logs body only; comment admits missing signed payloads / replay / idempotency).

None of these publish into the event bus.

---

## 6. Gap Analysis & Technical Debt

### 6.1 Critical

1. **Dead event bus.** `shared/api/achievements` (and thus `listener.ts`) has zero importers. Achievement side effects never run. Either wire it into app bootstrap or delete the dead bus.
2. **No cross-cutting bus exists in practice.** Module-to-module decoupling is achieved via DB writes + Supabase Realtime + cache invalidation, which couples producers to the _database schema_ rather than to an explicit contract.

### 6.2 High

3. **No durable broker / multi-instance safety.** `node:events` is process-local; Vercel serverless means emits and listeners never share a runtime. Any real cross-request eventing needs a broker (Redis pub/sub, Supabase Realtime broadcast, or a transactional outbox + worker).
4. **Unemitted event types.** `merit.recognized` declared but never emitted; `team_assigned` emitted but never handled.
5. **Webhook `payload` route is unsecured** — no signature, replay, or idempotency protection.

### 6.3 Medium

6. **Inconsistent client signaling.** One `window` CustomEvent vs. everything else via React state/queries — no unified client event bus or convention.
7. **No event catalog / ownership / observability.** Cannot tell which consumer handles which event; no metrics on handler execution or failures.
8. **Tag-based invalidation underused.** `unstable_cache` declares tags but most revalidation is path-based; only `SETTINGS` tag is used.

### 6.4 Architectural Issues

- **Fire-and-forget with no delivery guarantee.** `emitEvent` never awaits handlers, catches nothing actionable, and never retries. Side effects (awards, notifications, indexing) built on it are unreliable by design.
- **Mixed responsibilities.** The same `DomainEvent` concept is served by (a) the inert Node emitter, (b) Supabase DB-change feeds, and (c) cache revalidation — three parallel "event" notions with no single source of truth.
- **No CQRS / read-model sync boundary.** Real-time read models depend on client subscriptions to Postgres changes; there is no server-side projection pipeline.

---

## 7. Recommendations (priority order)

1. **Resolve the dead bus.** Either:
   - (a) Register `shared/api/achievements/listener` at a guaranteed boot point (server init / instrumentation) and verify handlers run; or
   - (b) Replace with a Supabase Realtime `postgres_changes` trigger or a DB-backed outbox consumed by a worker, matching the existing real-time spine.
2. **Pick ONE event topology and document it.** Concretely: use Supabase Realtime broadcast/DB-changes for server→client, and a durable broker (or DB outbox) for server→server side effects. Retire the bare `node:events` bus for anything that must cross a request boundary.
3. **Add an event catalog** (`docs/` or a typed registry) mapping every `DomainEvent` to its producer and consumer, with a CI check that every declared event has ≥1 emitter and ≥1 handler (or is explicitly "future").
4. **Secure the `payload` webhook** (HMAC signature, timestamp/replay window, idempotency key) consistent with the existing Paystack pattern.
5. **Standardize client cross-component signaling** — adopt a tiny Zustand-backed pub/sub or a documented convention instead of ad-hoc `window` CustomEvents.
6. **Add delivery observability** — count emits/handlers, surface handler errors, consider a dead-letter path for failed side effects.

---

## 8. File Reference Index

| Concern                          | File                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event bus (designed, inert)      | `src/shared/api/events/emitter.ts`                                                                                                                   |
| Only subscriber (unloaded)       | `src/shared/api/achievements/listener.ts`                                                                                                            |
| Subscriber loader (no importers) | `src/shared/api/achievements/index.ts`                                                                                                               |
| Bus re-exports                   | `src/shared/api/events/index.ts`, `src/shared/api/server/index.ts:156`                                                                               |
| Server→client realtime           | `src/widgets/dashboard/model/useNotifSubscription.ts`, `src/features/directory/ui/DirectoryChatModal.tsx`, `src/entities/chat/model/use-presence.ts` |
| Cache revalidation               | `src/shared/api/revalidation.ts`                                                                                                                     |
| Client state                     | `src/entities/widget/model/widget-store.ts`, `src/entities/tenant/model/gate-context-store.ts`, `src/entities/tenant/api/context.tsx`                |
| Webhooks                         | `src/app/api/marketplace/webhook/route.ts`, `src/app/api/payments/*/webhook/route.ts`, `src/app/api/webhooks/payload/route.ts`                       |
| Ad-hoc client event              | `src/widgets/admin/ui/PageSettingsWidget.tsx:55`, `src/shared/ui/Header.tsx:284`                                                                     |

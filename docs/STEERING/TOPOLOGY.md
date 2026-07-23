# Event Topology Plan (TOPOLOGY.md)

**Status:** Proposed (revised per `docs/advisories/ADVISORY-033.md`)
**Supersedes:** the inert `node:events` bus pattern in `src/shared/api/events/emitter.ts`
**Related:** `PubSub.md` (audit), `bd-q0x8` (dead achievement listener), `ADVISORY-033` (design review)

## 0. Problem statement

The project has _three_ parallel "event" notions with no single source of truth:

1. The **inert Node `EventEmitter` bus** (`emitEvent`/`onEvent`) — process-local, never subscribed, unreliable.
2. **Supabase Realtime** (`postgres_changes`, `broadcast`, `presence`) — the only thing that actually delivers server→client signals.
3. **Next.js cache revalidation** (`revalidatePath`/`revalidateTag`) — server→server-state signal, path-based.

We need **one coherent topology** with clear lanes for: server→client push, server→server side effects, and client cross-component signaling — each with delivery guarantees appropriate to its purpose, and a foundation that survives the platform's multi-tenant / AI roadmap.

ADVISORY-033 confirms the three-lane direction is sound and dictates that the following capabilities be baked in **before implementation** (treated as M5 requirements, not future enhancements): transport-neutral events, a standard envelope, versioning, mandatory tenant context, correlation/causation IDs, idempotent handlers, a formal Dead Letter Queue, a registry-driven consumer model, an auto-generated event catalog, AI-ready consumption, and a reserved Lane D for workflow orchestration.

## 1. Guiding principles

- **Single source of truth per concern.** A domain event has exactly one producer and a typed contract; consumers opt in explicitly via a registry.
- **Transport-neutral domain events.** A `booking.created` is a business fact — it is NOT inherently "Lane A". The **registry** decides which transports (outbox, realtime, analytics, AI, …) a given event is routed to. Events MUST NOT embed transport/lane information.
- **Match the runtime.** We deploy on **Vercel serverless** — every lambda is an isolated process. In-process `EventEmitter` cannot deliver cross-request. Side effects that must survive a request boundary need a **durable** mechanism.
- **Reuse the spine we already have.** Postgres + Supabase Realtime is provisioned; prefer it over Kafka/RabbitMQ/Redis Streams/NATS/Custom WebSocket servers unless volume demands (ADVISORY-033 §12).
- **No silent loss.** At-least-once delivery + idempotent handlers + a Dead Letter Queue.
- **Typed end-to-end.** Events are TypeScript types, wrapped in a standard envelope.

## 2. The event contract

### 2.1 Domain events are transport-neutral

```ts
// Transport-neutral. No `lane` field. The registry owns routing.
interface BookingCreatedEvent {
  bookingId: string;
  tenantId: string; // mandatory (ADVISORY-033 §4)
  userId: string;
  facility: string;
}
```

### 2.2 Standard envelope (ADVISORY-033 §2)

Every domain event is wrapped before dispatch:

```ts
interface DomainEventEnvelope<T> {
  id: string; // unique event id
  type: string; // e.g. 'booking.created'
  version: number; // ADVISORY-033 §3 — version from day one
  tenantId: string; // mandatory, never inferred downstream
  occurredAt: Date;
  correlationId: string; // ADVISORY-033 §5 — workflow trace id
  causationId?: string; // parent event id (for derived events)
  actorId?: string; // who triggered it
  payload: T;
}
```

- **Versioning (§3):** either `type: 'booking.created.v1'` or `version: 1` MUST exist. Payloads evolve; versioning prevents breaking older handlers.
- **Tenant context (§4):** `tenantId` is mandatory on every event. Critical for AI, analytics, wallet, marketplace, billing, federation.
- **Correlation / causation (§5):** a workflow (`BookingCreated → BookingApproved → AchievementAwarded → NotificationSent`) shares one `correlationId`; each child records its parent via `causationId`. Enables full workflow reconstruction and future observability.

## 3. The lanes

```
                         ┌─────────────────────────────────────────────┐
   Producer (API/router) │  DOMAIN EVENT (transport-neutral, enveloped) │
        emitEvent()      └───────────────┬─────────────────────────────┘
                                         │
                                Transactional Outbox  (atomic w/ business write)
                                         │
                                Outbox Dispatcher  (reads registry)
                       ┌─────────────────┼──────────────────┬─────────────────┐
                       ▼                 ▼                  ▼                 ▼
                 Achievements      Notifications       Analytics           AI Consumers
                       │                 │                  │                 │
                       ▼                 ▼                  ▼                 ▼
                  Projections        Realtime         (future)          (future, §10)
                                          │
                                          ▼
                                  Supabase Realtime  ── (Lane B: server→client push)
                                          │
                                          ▼
                                    Zustand Event Bus  ── (Lane C: client→client)
                                          │
                                          ▼
                                    React Components
```

### Lane A — Durable side effects (server → server)

**Use case:** achievement awarding, merit points, projections, indexing, email triggers — anything that must happen eventually, even if the request lambda has exited.

**Mechanism: Transactional Outbox + Dispatcher (ADVISORY-033 §8 registry-driven).**

1. Producer writes the enveloped domain event to an `outbox` table **in the same DB transaction** as the business write (atomic, no silent loss).
2. An **Outbox Dispatcher** drains unprocessed rows and, using the **consumer registry**, fans the event out to every handler registered for that `type`.
3. Handlers register via `registerHandler(type, fn)` (replaces `onEvent`). Routing/transport is decided by the registry, not the event.

**Why not the bare `EventEmitter`:** it loses events the moment the lambda ends and has no broker. The outbox gives at-least-once + replay.

**Dispatcher options:**

- **Option A (recommended for M5):** Supabase Realtime `broadcast` / Postgres `LISTEN/NOTIFY` → edge function that invokes handlers.
- **Option B (if volume grows):** Vercel Cron + durable queue draining the outbox.

**Schema (migration):**

```sql
create table outbox (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  version      int not null default 1,
  tenant_id    text not null,
  correlation_id text not null,
  causation_id   text,
  actor_id      text,
  payload      jsonb not null,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  attempts     int not null default 0,
  error        text
);
create index on outbox (processed_at) where processed_at is null;

-- ADVISORY-033 §7: formal Dead Letter Queue
create table outbox_dead_letter (
  id          uuid primary key default gen_random_uuid(),
  outbox_id   uuid,
  type        text not null,
  version     int not null,
  tenant_id   text not null,
  correlation_id text,
  payload     jsonb not null,
  error       text,
  handler     text,
  attempts    int,
  dead_lettered_at timestamptz not null default now()
);
```

### Lane B — Server → client push (real-time) (ADVISORY-033: Realtime step)

**Use case:** new notification toast, chat message, typing indicator, dispute message, live dashboard metric.

**Mechanism: Supabase Realtime** (already in use — keep it, standardize it).

- `postgres_changes` for table-driven views (chat, disputes).
- `broadcast` for ephemeral signals (typing, `new-notification`).
- **Convention:** every broadcast channel is namespaced and typed: `notifications:${userId}`, `typing:${conversationId}`, `dispute:${disputeId}`.

A thin typed wrapper (`lib/realtime.ts`) so channels/types aren't hand-built per component.

### Lane C — Client cross-component signaling

**Use case:** `page-flags-updated` style "unrelated component B should refetch because component A changed something outside the React tree."

**Mechanism: a tiny Zustand-backed pub/sub** (project already uses Zustand; no new dep). Retire `window.dispatchEvent(new Event('page-flags-updated'))`. Replace with a typed `useBusEvent(type, handler)` hook over a small Zustand store. DOM `CustomEvent` is forbidden for app signaling (keep only for genuine browser-level concerns).

### Lane D — Reserved for long-running workflows (ADVISORY-033 §11, no implementation now)

Complex business workflows (marketplace purchase, wallet settlement, proxy vote, community chips, billing, appeals, CSOS disputes) are orchestrated sagas, not single events. Reserve an architecture section for **Lane D: Workflow / Saga Orchestration** to avoid future conflict. Documenting the reservation is sufficient for M5.

## 4. Registry-driven consumers (ADVISORY-033 §8) & AI readiness (§10)

The platform maintains a typed **consumer registry** — the authoritative ownership map:

```
BookingCreated
  ├─ AchievementHandler
  ├─ NotificationHandler
  ├─ ProjectionHandler
  ├─ RealtimePublisher
  └─ AnalyticsHandler
```

- Each handler declares the event `type`(s) it consumes; the dispatcher fans out.
- **AI is just another consumer** (§10). Future AI capabilities (summaries, fraud detection, community insights) subscribe to the same enveloped events — no AI-specific transport ever. The envelope's `correlationId`/`causationId`/`tenantId` make AI consumption first-class.

## 5. Idempotency is a hard requirement (ADVISORY-033 §6)

The topology targets **at-least-once** delivery, so **every handler MUST be idempotent** — safe to run 2, 5, or 20 times. `AwardAchievement()` must produce exactly ONE achievement regardless of replay count.

The existing `processAchievementEvent` already satisfies this: it uses `onConflictDoUpdate` (increment) + an existence check before inserting the unlocked achievement/notification. New handlers MUST follow the same pattern (upsert / unique constraint / existence guard).

## 6. Unifying the contract & CI enforcement

- A single `DomainEvent` set lives in `src/shared/api/events/types.ts` (the existing union in `emitter.ts` is the seed). Events are transport-neutral; the registry owns routing.
- **Auto-generated Event Catalog (ADVISORY-033 §9):** the build generates an event catalog (Event Name, Version, Producer(s), Consumer(s), Lane, Status, Owner) — prefer generation over manual `docs/`. This keeps architecture docs in sync with code.
- **CI lint** (or Steiger-style check) enforces:
  - every event type has ≥1 producer (`emitEvent(...)`) AND, for Lane A, ≥1 registered handler — else fail.
  - `merit.recognized` (currently declared, never emitted) is either wired or marked `status: 'future'`.

## 7. Migration steps (ordered)

1. **Stop the bleeding (bd-q0x8 — DONE):** register the achievement listener at a guaranteed server boot point. Implemented via `src/instrumentation.ts` `register()` (node runtime) importing `@shared/api/achievements`, so `onEvent` handlers run on every lambda cold start. Verified lint-clean.
2. **Add the outbox + dead-letter tables** (migration) carrying the envelope fields; add an `emitDomainEvent(type, payload, ctx)` that writes to outbox (atomic with the business write) and, interim, still calls the in-process bus for same-request handlers. **(bd-8lus — DONE)**
3. **Build the Outbox Dispatcher** (cron worker) that reads the registry and fans out to `registerHandler` consumers. **(bd-8lus — DONE)**
4. **Port listeners** from `onEvent` to `registerHandler`. Achievement listener wired to both. **(bd-8lus — DONE)**
5. **Wrap Realtime** in `lib/realtime.ts` with typed, namespaced channels; migrate existing `postgres_changes`/`broadcast` call sites. **(DONE)**
6. **Replace the `page-flags-updated` CustomEvent** with the Zustand bus (Lane C).
7. **Add the CI event-contract check + auto-generated catalog** (§6).
8. **Secure the `payload` webhook** (HMAC + replay window + idempotency) so it can safely `emitDomainEvent`.
9. **Reserve Lane D** in docs; no implementation.

## 8. What we are explicitly NOT doing (ADVISORY-033 §12)

- **No Kafka / RabbitMQ / Redis Streams / NATS / custom WebSocket server** for M5 — Postgres + Transactional Outbox + Supabase Realtime + Zustand + TanStack Query cover current volume. Revisit only after demonstrated scaling needs.
- **No Redux/Jotai** — Zustand stays the client store; Lane C is a thin layer over it.
- **No SSE/WebSocket server** — Vercel + Supabase Realtime already provide push.
- **No transport fields inside events** — routing lives in the registry.

## 9. Acceptance (links to bd-q0x8)

- Achievement side effects run reliably (verified by test) — via boot-registered listener now (step 1), outbox later.
- Every `DomainEvent` has producer + (Lane A) handler, enforced in CI; catalog auto-generated.
- Events are transport-neutral, enveloped, versioned, tenant-scoped, correlation/causation-tagged.
- Handlers are idempotent; failed events land in a Dead Letter Queue.
- One document (`TOPOLOGY.md`) is the source of truth; `PubSub.md` is the before-state; `ADVISORY-033` is the design sign-off.
- `merit.recognized` wired or marked future; `payload` webhook secured.

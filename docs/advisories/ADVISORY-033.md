# ADVISORY.md

# Advisory: Strengthening the Event Topology Before Implementation

**Status:** Advisory
**Priority:** High
**Applies to:** `TOPOLOGY.md`
**Audience:** Platform Architecture / Event Infrastructure

---

# Executive Summary

The proposed **TOPOLOGY.md** represents a major architectural improvement over the current event implementation and correctly addresses the limitations of the existing in-process `EventEmitter` model.

The proposed separation into:

- Lane A — Durable Server Side Effects
- Lane B — Server → Client Realtime
- Lane C — Client Cross-Component Signalling

is considered architecturally sound and aligns well with:

- Vercel Serverless
- Supabase
- Next.js App Router
- TanStack Query
- Zustand
- Netcomplex's long-term multi-tenant roadmap.

However, several foundational capabilities should be incorporated **before implementation begins**, as they become extremely difficult to retrofit once event producers and consumers exist.

The recommendations below should be considered Phase M5 requirements rather than future enhancements.

---

# 1. Separate Domain Events from Transport

The current proposal embeds transport information directly inside the event definition.

Current direction:

```ts
{
  (type, lane, payload);
}
```

This unnecessarily couples business events to infrastructure.

A booking being created is a business fact.

It is **not** inherently a Lane A event.

Different consumers may choose different transport mechanisms.

Instead, the event should remain transport-neutral.

Example:

```ts
interface BookingCreatedEvent {
    bookingId: string
    tenantId: string
    ...
}
```

The event registry determines:

- Outbox
- Realtime
- Analytics
- Notification
- Projection
- AI

Consumers decide transport—not the domain.

---

# 2. Introduce a Standard Event Envelope

Every domain event should be wrapped inside a common envelope.

Recommended structure:

```ts
interface DomainEventEnvelope<T> {
  id: string;
  type: string;
  version: number;

  tenantId: string;

  occurredAt: Date;

  correlationId: string;
  causationId?: string;

  actorId?: string;

  payload: T;
}
```

Benefits:

- observability
- replay
- tracing
- auditing
- future distributed processing

Without this envelope the system will eventually require a breaking migration.

---

# 3. Version Events From Day One

Do not publish anonymous payloads.

Either:

```text
booking.created.v1
```

or

```ts
version: 1;
```

must exist.

Payloads evolve.

Consumers evolve.

Versioning prevents breaking older handlers.

---

# 4. Tenant Context Must Be Mandatory

Netcomplex is fundamentally multi-tenant.

Every domain event must contain:

```
tenantId
```

Never infer tenant context from downstream services.

Every consumer should receive tenant context directly.

This becomes critical for:

- AI
- Analytics
- Wallet
- Marketplace
- Billing
- Reporting
- Cross-tenant federation

---

# 5. Correlation and Causation IDs

Every workflow should be traceable.

Example:

```
BookingCreated

↓

BookingApproved

↓

AchievementAwarded

↓

NotificationSent
```

All four events should share:

```
correlationId
```

while each child records its immediate parent via:

```
causationId
```

This enables complete workflow reconstruction.

Future observability tools depend on this capability.

---

# 6. Make Idempotency an Explicit Requirement

The proposal correctly targets **at-least-once delivery**.

That requires every handler to be idempotent.

Handlers must safely execute multiple times.

Example:

```
AwardAchievement()

should produce

ONE achievement

even if executed
2
5
20
times.
```

This requirement should appear inside TOPOLOGY.md.

---

# 7. Formal Dead Letter Queue

The proposal mentions retries.

Instead of leaving failed events inside the Outbox indefinitely, define an explicit Dead Letter Queue.

Recommended flow:

```
Outbox

↓

attempt++

↓

attempt++

↓

attempt++

↓

Dead Letter
```

Dead Letter entries should preserve:

- event
- payload
- error
- handler
- timestamp
- retry count

This dramatically improves production diagnostics.

---

# 8. Registry-Driven Consumers

Rather than requiring developers to remember where handlers exist, the platform should maintain a typed registry.

Conceptually:

```
BookingCreated

↓

AchievementHandler

↓

NotificationHandler

↓

ProjectionHandler

↓

RealtimePublisher

↓

AnalyticsHandler
```

The registry becomes the authoritative ownership map.

---

# 9. Generate the Event Catalog Automatically

The proposal recommends documentation.

Prefer generation over manual maintenance.

The build should generate an Event Catalog containing:

- Event Name
- Version
- Producer(s)
- Consumer(s)
- Lane
- Status
- Owner

This keeps architecture documentation synchronized with implementation.

---

# 10. Future AI Compatibility

Netcomplex's roadmap already includes AI infrastructure.

Future AI capabilities should consume domain events exactly like every other subsystem.

Example:

```
BookingCreated

↓

Achievement

↓

Notification

↓

Analytics

↓

AI Summary

↓

Fraud Detection

↓

Community Insights
```

The architecture should therefore treat AI as simply another event consumer.

No AI-specific transport should ever exist.

---

# 11. Reserve Lane D for Long-Running Workflows

The proposed three-lane architecture is sufficient for M5.

However, complex business workflows will eventually appear.

Examples:

- Marketplace purchase
- Wallet settlement
- Proxy vote submission
- Community chips
- Billing
- Appeals
- CSOS disputes

These are not individual events.

They are orchestrated workflows.

Reserve a future architecture section for:

```
Lane D

Workflow / Saga Orchestration
```

No implementation is required today.

Documenting the reservation avoids future architectural conflict.

---

# 12. Preserve the Simplicity of M5

The architecture should continue avoiding:

- Kafka
- RabbitMQ
- Redis Streams
- NATS
- Custom WebSocket servers

Current infrastructure is sufficient:

- PostgreSQL
- Transactional Outbox
- Supabase Realtime
- Zustand
- TanStack Query

Additional infrastructure should only be introduced after demonstrated scaling requirements.

---

# Recommended Event Architecture

```
                 Domain Event
                      │
          Transactional Outbox
                      │
              Outbox Dispatcher
                      │
      ┌───────────────┼────────────────┐
      │               │                │
      ▼               ▼                ▼
Achievements   Notifications     Analytics
      │               │                │
      ▼               ▼                ▼
 Projections     Realtime      AI Consumers
                      │
                      ▼
              Supabase Realtime
                      │
                      ▼
                Zustand Event Bus
                      │
                      ▼
               React Components
```

---

# Recommendation

The proposed topology should be adopted.

Before implementation begins, incorporate:

1. Transport-neutral domain events.
2. Standard event envelopes.
3. Event versioning.
4. Mandatory tenant context.
5. Correlation and causation identifiers.
6. Idempotent handler requirements.
7. Formal Dead Letter Queue support.
8. Registry-driven consumer discovery.
9. Generated event catalog.
10. AI-ready consumer model.
11. Reserved workflow orchestration layer (Lane D).

These additions require very little extra implementation effort today but eliminate several categories of future architectural debt and provide a robust foundation for the platform's planned evolution.

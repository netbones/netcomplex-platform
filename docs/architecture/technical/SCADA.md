---
title: Lightweight SCADA/HMI (human-machine interface) product on top of Netbones multi-tenant platform.
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# Lightweight SCADA/HMI (human-machine interface) product on top of Netbones multi-tenant platform.

The key insight is that the data flows in from the physical world through a narrow ingestion funnel, then fans out across our existing tenant, notification, and permission architecture. Most of the complexity lives at the edges — the field hardware and the UX — not in our application code.

## 1. Field layer — what goes on-site

LoRaWAN is the right call for this use case. It's long-range (2–15 km line-of-sight), extremely low power, and well-suited to infrequent sensor readings like pressure samples every 30–60 seconds or fence voltage heartbeats. Each village complex would need one or two LoRaWAN gateways (Dragino, RAK Wireless, or Kerlink are all reliable — around R3,000–R8,000 each) mounted on a high point.

For our specific use cases:

Water pressure by zone — standard LoRaWAN pressure transducers (e.g. Elsys, Dragino LDDS) sending absolute pressure in kPa every 30s–5min. You define zones (Zone A: reservoir → pump house, Zone B: pump house → street mains, etc.) and each sensor is assigned to a zone.
Electric fence monitoring — LoRaWAN fence monitors (e.g. from Nemtek or generic current/voltage sensors) can report voltage present, alarm state, and zone breach. Some fence energisers have RS485 outputs you can bridge to LoRaWAN with a small adapter.

## 2. Ingestion pipeline — getting data into your backend

You need a LoRaWAN Network Server (LNS). Two realistic options:

The Things Network (TTN) — free, hosted, excellent webhook support. Works well in Cape Town. Best for getting started quickly. Limitation: data sovereignty goes through their cloud.
ChirpStack — open-source, self-hosted on a VPS or Supabase Edge. Better for data sovereignty and white-labelling to tenants. Slightly more ops overhead.

Either way, the LNS decodes the raw LoRa packets and forwards JSON payloads to your backend via webhook or MQTT. You'd create an API route — /api/iot/ingest — protected by a shared secret, that receives readings and writes them to your database. This route should be fast and dumb: validate, write, return 200. No heavy processing inline.
Given you're on Vercel, you can't run a persistent MQTT subscriber, so HTTP webhooks from ChirpStack/TTN are the path of least resistance.

## 3. Data storage — time-series in Supabase

Our existing Supabase/PostgreSQL setup can handle this with the TimescaleDB extension, which Supabase supports. TimescaleDB adds hypertables (auto-partitioned by time), compression, and downsampling functions on top of standard Postgres — so your existing Drizzle/Prisma tooling still works for the metadata, and you get efficient time-series queries for readings.
The core schema additions would be:

```sql
prismamodel IoTZone {
   id String @id @default(cuid())
   tenantId String
   name String // "Zone A — Reservoir to pump house"
   type IoTZoneType // WATER_PRESSURE | SECURITY_FENCE | GENERIC
   description String?
   mapBounds Json? // GeoJSON polygon for the Leaflet map overlay
   createdAt DateTime @default(now())

devices IoTDevice[]
tenant Tenant @relation(...)
@@index([tenantId])
}

model IoTDevice {
id String @id @default(cuid())
tenantId String
zoneId String
devEUI String @unique // LoRaWAN device identifier
name String
type IoTDeviceType // PRESSURE_SENSOR | FENCE_MONITOR | FLOW_METER
config Json? // threshold defaults, unit, scaling factor
lastSeenAt DateTime?
isOnline Boolean @default(false)
createdAt DateTime @default(now())

zone IoTZone @relation(...)
readings IoTReading[]
alerts IoTAlert[]
@@index([tenantId])
}

model IoTReading {
id String @id @default(cuid())
deviceId String
value Float
unit String // "kPa", "V", "L/min"
quality Int? // 0–100 signal quality
receivedAt DateTime @default(now())

device IoTDevice @relation(...)
@@index([deviceId, receivedAt])
// → promote to TimescaleDB hypertable on receivedAt
}

model IoTAlert {
id String @id @default(cuid())
tenantId String
deviceId String
type IoTAlertType // THRESHOLD_BREACH | DEVICE_OFFLINE | ZONE_FAULT
severity Priority // reuse your existing Priority enum
message String
value Float?
threshold Float?
resolvedAt DateTime?
createdAt DateTime @default(now())

device IoTDevice @relation(...)
@@index([tenantId, createdAt])
}

```

The IoTZone and IoTDevice models are metadata — managed via our existing tRPC/admin flows. IoTReading is the high-volume table that becomes a TimescaleDB hypertable. We'd set a retention policy (e.g. keep raw readings for 30 days, downsample to hourly averages for 1 year) so it doesn't grow unboundedly.

## 4. Alert engine

Since we're on Vercel (no persistent processes), alert evaluation fits into one of two places:

Supabase database trigger — a Postgres function that fires on each IoTReading insert, checks it against the device's configured thresholds, and inserts an IoTAlert row + calls pg_notify. This is the most robust approach since it happens inside the transaction.

Vercel Edge Function with a queue — the ingest route enqueues a threshold-check job (e.g. via Upstash QStash) that runs asynchronously. Slightly more latency but keeps complex logic out of Postgres.

Either path should feed your existing Notification model so that COMMITTEE and BOARD role users get in-app + push alerts when, say, Zone B pressure drops below 200 kPa.

## 5. The dashboard UI

Following our widget-first principle this should be a new IoTMonitorWidget — not a new page — that renders inside the existing dashboard. It would contain:

A Leaflet map (we already have react-leaflet in the stack) with zone polygons overlaid, coloured by status (green/amber/red).

Live gauge cards per zone showing current reading, trend sparkline, and last-seen timestamp — updating via Supabase Realtime subscriptions.

An alert feed panel showing unresolved alerts with severity badges.

An admin configuration panel (gated to ADMIN/BOARD role) for adding devices, setting thresholds, and managing zones.

For the full SCADA-style view, a dedicated /iot page (gated behind the module check) makes sense as a single-purpose monitoring screen, with the widget serving as the dashboard summary/quickview.

## 6. Gating it as a premium feature

Our PlatformModule + TenantModule architecture already handles this perfectly. We'd seed:

```typescript
{
   key: "iot_monitor",
   label: "IoT & Smart Monitoring",
   minTier: "PREMIUM", // maps to your Tier enum
   defaultEnabled: false,
   description: "SCADA-style monitoring for LoRaWAN sensors — water, security, and environmental"
   }
```

Every API route and component that touches IoT data checks tenantModule.enabled for iot_monitor, exactly like our other gated modules. The TenantModule.config JSON field is useful here too — we could store per-tenant gateway credentials, LNS webhook secrets, and default alert recipient roles in there without adding more columns.

## 7. Recommended build order (GSD phases)

Given this is a major architectural addition, it warrants a GSD plan:

**Phase 1** — Schema + ingestion only. Add the Prisma models, create the ingest webhook route, connect ChirpStack/TTN in test mode with a single dummy device. Validate that readings are flowing into the DB.
**Phase 2** — Alert engine. Database trigger + IoTAlert creation + hook into Notification model.
**Phase 3** — Admin UI. Zone and device management pages (ADMIN/BOARD only).
**Phase 4** — Dashboard widget. Live gauges, Leaflet zone map, alert feed via Supabase Realtime.
**Phase 5** — TimescaleDB migration, retention policies, historical charts.

Phase 1 can be done without any hardware — we can simulate device payloads by posting JSO gN directly to our ingest route. That way the backend is production-ready before a single gateway is deployed.

Click any node in the diagram above to drill into that specific area. The most consequential decision early on is ChirpStack vs TTN — happy to dig into that tradeoff if you want.

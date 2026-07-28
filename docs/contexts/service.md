---
title: Service Context
status: current
reviewed: 2026-07-28
tags: [context-map, bounded-context]
audience: developer
---

# Service Context

> **Last updated:** 2026-06-01

## Purpose

Service catalog with categories, hours, emergency contacts, and reviews.

## Directory

`src/entities/service/`

## Key Models

| Model               | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `ServiceCategory`   | Classification of services                                          |
| `AdditionalService` | Individual service offering                                         |
| `ServiceHour`       | Operating hours for a service                                       |
| `EmergencyContact`  | Emergency contact information                                       |
| `ContentItem`       | **⚠️ Overlaps with Content entity** — service-specific content type |

## Exports

- `ServiceCard`, `ServiceTypeBadge`, `CategoryBadge`, `ReviewStars`, `PricingDisplay` UI components

## Dependencies

- **Tenant** — tenant isolation

## API Surface

- REST: `/api/services/*`, `/api/community-services/*`

## Prisma Models

`AdditionalService`, `ServiceHour`, `EmergencyContact`

## Widget

- `src/widgets/service/` — service dashboard widget

## Open Issues

- [ ] Defines own `ContentItem` interface that overlaps with the Content entity — should consume Content entity types instead (see CONTEXT_MAP.md boundary issue)

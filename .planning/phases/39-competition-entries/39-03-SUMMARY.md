---
phase: 39-competition-entries
plan: 03
type: execute
subsystem: competition-entries
tags: [ui, public, trpc, react-query]
requires: [39-02]
provides: [Public competition pages — /competition and /competition/[id]]
affects: [src/app/competition/page.tsx, src/app/competition/[id]/page.tsx]
tech-stack:
  added: [CompetitionCard component, CompetitionDetailClient component]
  patterns: [tRPC React Query hooks for data fetching, client components with loading/error/empty states]
key-files:
  created:
    - src/app/competition/[id]/page.tsx
  modified:
    - src/app/competition/page.tsx (rewritten)
decisions:
  - Skeleton cards for loading state (matches existing LoadingCard pattern)
  - Participants show max 20 initially with "Show All" toggle
  - tRPC hooks used instead of REST fetch (consistent with Phase 35 direction)
metrics:
  duration: ~15 min
  completed_date: 2026-05-31
---

# Phase 39 Plan 03: Public Competition UI — Summary

Created the public competition pages — cards grid at /competition and detail page at /competition/[id] with join, submit, participant list, and winners gallery.

## Pages

1. **/competition** — Responsive cards grid (1/2/3 cols), type badges (RAFFLE=purple, PHOTO=blue, SCORE=green), participant avatars (stacked, max 5 + overflow), prize info, date ranges. Loading skeleton, empty state, error+retry.

2. **/competition/[id]** — Hero section with image, type+status badges, info grid, collapsible rules, type-specific actions (Join for RAFFLE, Submit Entry form for PHOTO, judges note for SCORE), participant avatars, winners gallery with trophy styling.

## Deviations from Plan

No deviations — plan executed as written.

## Self-Check: PASSED

- [x] /competition shows cards grid of ACTIVE competitions
- [x] Cards show title, description, date, type badge, participant avatars
- [x] Click card navigates to /competition/[id]
- [x] Detail page shows full competition info, type-specific actions
- [x] Join RAFFLE mutation with toast feedback
- [x] PHOTO submit entry form with URL/description
- [x] Winners gallery for ENDED competitions
- [x] Loading, empty, error, not-found states
- [x] TypeScript compiles without new errors

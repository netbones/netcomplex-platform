---
phase: 39-competition-entries
plan: 04
type: execute
subsystem: competition-entries
tags: [admin, ui, trpc, management]
requires: [39-02]
provides: [Admin competition management with expandable rows and per-type actions]
affects:
  [
    src/widgets/admin/ui/CompetitionList.tsx,
    src/widgets/admin/ui/CompetitionForm.tsx,
    src/entities/events/schema.ts,
  ]
tech-stack:
  added: [DrawWinnersModal, AutoSelectModal, ParticipantsPanel components]
  patterns: [tRPC mutations for admin actions, expandable table rows, inline score editing]
key-files:
  modified:
    - src/widgets/admin/ui/CompetitionList.tsx (rewritten)
    - src/widgets/admin/ui/CompetitionForm.tsx
    - src/entities/events/schema.ts
    - src/app/(tenant)/admin/competitions/[id]/page.tsx
decisions:
  - Removed .default() from adminCompetitionSchema type/winnersCount fields to avoid type inference issues with react-hook-form
  - Winners count hidden for PHOTO type (manual selection only)
  - Auto-select winners uses top N scores for SCORE type
  - Draw winners uses Fisher-Yates shuffle (same as tRPC implementation)
metrics:
  duration: ~25 min
  completed_date: 2026-05-31
---

# Phase 39 Plan 04: Admin Competition UI — Summary

Enhanced admin competition management with expandable rows showing participant details, per-type management actions (draw winners, score editing, mark as winner), and type selector in the competition form.

## Changes

1. **CompetitionForm** — Radio group type selector (RAFFLE/PHOTO/SCORE) with descriptions, winnersCount (hidden for PHOTO), optional maxParticipants field
2. **CompetitionList** — Expandable rows with per-type panels:
   - RAFFLE: participant table + Draw Winners modal (Fisher-Yates shuffle)
   - PHOTO: gallery grid + Mark as Winner / Remove Winner buttons
   - SCORE: inline score editing + Auto-select Winners modal
3. **adminCompetitionSchema** — Added type, winnersCount, maxParticipants fields
4. **Edit page** — Passes new fields through to CompetitionForm

## Deviations from Plan

1. **[Rule 2 - Missing critical]** Removed `.default()` from schema fields to prevent TypeScript type inference errors with react-hook-form/zodResolver — defaults handled in form's `getInitialDefaultValues()` instead

## Self-Check: PASSED

- [x] CompetitionForm has type selector (radio group with descriptions)
- [x] CompetitionForm has winnersCount and maxParticipants fields
- [x] CompetitionList has expandable rows with chevron
- [x] RAFFLE panel shows participants + Draw Winners button with modal
- [x] PHOTO panel shows gallery grid + Mark as Winner / Remove Winner
- [x] SCORE panel shows inline score editing + Auto-select Winners
- [x] Edit/delete actions preserved
- [x] TypeScript compiles without new errors

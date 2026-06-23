# Phase 102: Achievements System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 102-Achievements System
**Areas discussed:** Event wiring scope, V1 achievement catalog, Widget & profile display, Admin configuration depth

---

## Event wiring scope

| Option                  | Description                                                                                                                                                            | Selected |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Create-only             | booking.created, maintenance.created, event.attendee.added, content.created, group.member.added, competition.entry.created — simplest, covers main engagement triggers | ✓        |
| Create + status changes | Add booking.cancelled, maintenance.status_changed, etc. — richer but more wiring                                                                                       |          |
| All mutations           | All mutations across all 6 domains — maximum coverage but high surface area                                                                                            |          |

**User's choice:** Create-only (Recommended)
**Notes:** v1 keeps event surface minimal. Status-change events (cancelled bookings, resolved maintenance) deferred to v2 for richer achievement types.

---

## V1 achievement catalog

| Option                     | Description                                                                                                     | Selected |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| Minimal (6, one-shot only) | first_booking, first_maintenance, first_event_rsvp, first_post, first_group_join, first_competition_entry       |          |
| Standard (12)              | 6 one-shots + maintenance_5, maintenance_10, event_attendee_5, event_attendee_10, content_creator_5, bookings_3 | ✓        |
| Extended (15)              | Standard + group_organizer, competition_winner, community_pillar                                                |          |

**User's choice:** Standard (Recommended)
**Notes:** 12 achievements — 6 one-shot milestones + 6 cumulative thresholds. Balance between richness and wiring/testing surface.

---

## Widget & profile display

### Dashboard widget

| Option                 | Description                                                                                                   | Selected |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | -------- |
| Badge grid             | Grid of achievement badges — locked (gray), unlocked (colored), with hover tooltip showing name + unlock date | ✓        |
| Badges + progress bars | Badge grid + progress bars for cumulative achievements (e.g., '3/5 maintenance requests')                     |          |
| Activity feed          | Recent unlocks feed (last 5) + total count. Minimal, event-stream style.                                      |          |

**User's choice:** Badge grid (Recommended)
**Notes:** "Trophy case" feel — visual, satisfying to fill. Locked achievements visible (not hidden) to create aspirational pull.

### Profile display

| Option             | Description                                                                 | Selected |
| ------------------ | --------------------------------------------------------------------------- | -------- |
| Inline badge icons | Small badge icons inline next to user's name in directory listings          |          |
| Profile section    | Separate 'Achievements' section in profile detail view with full badge grid | ✓        |
| Both               | Inline icons in listings + full section in profile detail                   |          |

**User's choice:** Profile section (Recommended)
**Notes:** No changes to directory listing cards. Full badge grid in profile detail view only.

---

## Admin configuration depth

| Option                     | Description                                            | Selected |
| -------------------------- | ------------------------------------------------------ | -------- |
| Toggle only                | Single toggle per achievement (enable/disable)         |          |
| Toggle + custom thresholds | Toggle + custom threshold override per tenant          |          |
| Full customization         | Toggle + threshold + icon upload + category management | ✓        |

**User's choice:** Full customization
**Notes:** Expands beyond ADVISORY-013's minimal admin scope. Tenant admins can: enable/disable, override thresholds, upload custom icons, manage categories. Disabling hides from discovery but preserves historical unlocks.

---

## Agent's Discretion

- Achievement category enum: ENGAGEMENT, CONTRIBUTION, MILESTONE (from ADVISORY-013)
- Icon storage: text field (URL or emoji) for v1
- Notification on unlock: reuse existing Notification model, optional per definition

## Deferred Ideas

- Merits as achievement trigger source (G3 = deferred)
- Retroactive backfill (G4 = forward-only)
- Status-change events for richer achievement types (v2)
- Achievement sharing to chat (social feature)

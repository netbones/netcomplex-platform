# BD Issue Tracker

> **Last updated:** 2026-05-28 (Session 5)
> **Total remaining:** 23 issues (down from 54)
> **Closed all sessions:** 35 issues total (22 in Session 1, 5 in Session 2, 8 in Session 3, 0 in Session 4)
> **Created this session:** 1 issue (Phase 34 merits system)

## Summary by Priority

| Priority | Open | Focus                                       |
| -------- | ---- | ------------------------------------------- |
| P2       | 3    | Core features, epics, bugs                  |
| P3       | 13   | Tech debt, Phase 4/5 features, enhancements |
| P4       | 6    | Backlog, blocked events                     |

## Summary by Status

| Status        | Count |
| ------------- | ----- |
| ○ Open        | 21    |
| ◐ In Progress | 1     |

---

## P2 — High Priority (3 issues)

### Bugs

| ID    | Type | Title                                                                         | Status | Source              |
| ----- | ---- | ----------------------------------------------------------------------------- | ------ | ------------------- |
| `cs5` | bug  | MyHomeSpace: Property not linked despite user having property (183 Pagoda Rd) | ○      | Phase 30 checkpoint |
| `e0w` | task | Fix route-level cross-tenant data leakage (20 remaining routes)               | ○      | Security audit      |

### Features & Tasks

| ID    | Type | Title                    | Status |
| ----- | ---- | ------------------------ | ------ |
| `l23` | epic | Epic: i18n for all pages | ○      |

### Features & Tasks

| ID    | Type    | Title                                        | Status |
| ----- | ------- | -------------------------------------------- | ------ |
| `2at` | feature | Phase 34: Community Merits & Standing System | ○      |

### Blocked Tasks

| ID    | Title                                          | Blocked By | Status |
| ----- | ---------------------------------------------- | ---------- | ------ |
| `0f7` | i18n: Database content localization for Tiptap | `l23`      | ○      |

---

## P3 — Medium Priority (13 issues)

### Features

| ID    | Type    | Title                                                              | Status |
| ----- | ------- | ------------------------------------------------------------------ | ------ |
| `ltn` | feature | Add request validation plugin                                      | ○      |
| `7td` | feature | Enable One Tap passkey login                                       | ○      |
| `byj` | feature | Add search/filter to AddWidgetModal for space-scoped widget picker | ○      |

### Tasks

| ID    | Title                                                 | Status | Source              |
| ----- | ----------------------------------------------------- | ------ | ------------------- |
| `ka6` | Design decision: widget placement across Focus Spaces | ○      | Phase 30 checkpoint |
| `jc1` | Implement cookie management for privacy compliance    | ○      |                     |
| `6d8` | Migrate React imports to Preact and remove dead code  | ○      |
| `gtm` | Phase 5: Notification system                          | ○      |
| `cp8` | Phase 5: Payment processing                           | ○      |
| `qx7` | Phase 5: Booking calendar integration                 | ○      |
| `kia` | Phase 4: Advanced analytics                           | ○      |
| `9e8` | Phase 4: Provider dashboard                           | ○      |
| `69c` | Phase 4: Third party registration flow                | ○      |

### In Progress

| ID    | Type | Title                   | Status |
| ----- | ---- | ----------------------- | ------ |
| `bgb` | epic | Interests Visualization | ◐      |

---

## P4 — Backlog (6 issues)

| ID      | Type    | Title                                             | Status | Notes            |
| ------- | ------- | ------------------------------------------------- | ------ | ---------------- |
| `0tb`   | feature | Upgrade to OTP-based password reset               | ○      |                  |
| `p81.1` | event   | State change: patrol → active                     | ○      | Blocked by `p81` |
| `rbs.1` | event   | State change: patrol → active                     | ○      | Blocked by `p81` |
| `up2`   | task    | Configure Better Auth background tasks for Vercel | ○      |                  |
| `4vk`   | task    | Phase 5: Mobile app optimization                  | ○      |                  |
| `4fh`   | task    | Phase 4: Billing integration                      | ○      |                  |

---

## Closed This Session (28 issues)

### Session 4 - Phase 30 Focus Space Architecture (3 created, 0 closed)

| ID    | Title                                                                         | Reason                                                                                     |
| ----- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `cs5` | MyHomeSpace: Property not linked despite user having property (183 Pagoda Rd) | Created: deferred from Phase 30 checkpoint — data/linking issue, not architecture bug      |
| `ka6` | Design decision: widget placement across Focus Spaces                         | Created: deferred from Phase 30 checkpoint — UX decision needed on widget-to-space mapping |
| `byj` | Add search/filter to AddWidgetModal for space-scoped widget picker            | Created: deferred from Phase 30 checkpoint — enhancement, not a bug                        |

### Session 3 - Bot Protection & Type Safety (8 issues)

| ID      | Title                                 | Reason                                                                                                                        |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `yml`   | Implement bot protection with captcha | Fixed: added Turnstile to sign-in, sign-up, forgot-password, reset-password; created /api/auth/signin route with verification |
| `c3y`   | Fix ESLint any type errors            | Fixed: replaced 3 `any` usages with `InferSelectModel` and `InferInsertModel` from drizzle-orm                                |
| `wmm`   | Improve directory cards with chat     | Implemented: created DirectoryChatModal with find-or-create flow, Supabase realtime, wired to card chat buttons               |
| `71p`   | Continue improving test coverage      | Closed: added 69 new tests across auth routes, forms, hooks, and UI components (205 total passing)                            |
| `71p.1` | Add tests for API routes              | Added auth route tests for signup, signin, forgot-password, reset-password                                                    |
| `71p.2` | Add tests for form components         | Added SignInPage, ForgotPasswordPage, ResetPasswordPage component tests                                                       |
| `71p.3` | Add tests for custom hooks            | Added usePresence and useMessageSend hook tests                                                                               |
| `71p.4` | Add tests for UI components           | Added LoadingSpinner, LoadingSkeleton, Breadcrumbs, ErrorBoundary, Tooltip, TurnstileWidget tests                             |

### Session 2 - High Priority (5 issues)

| ID    | Title                                                | Reason                                                                                                                      |
| ----- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ywr` | Debug and test authentication login/sign-up flow     | Fixed: added /reset-password page, stored reset token in DB, fixed sign-up to use API route, added Turnstile token callback |
| `uou` | SEO-friendly public profile links                    | Implemented: profileSlug generated on signup, API resolves both UUIDs and slugs                                             |
| `dlc` | Implement BookshelfWidget and MediaWidget            | Already implemented: both widgets have full CRUD functionality                                                              |
| `utj` | Add admin household management page                  | Implemented: GET /api/households + /admin/households page with search, pagination                                           |
| `og6` | Determine bookings data flow to maintenance services | Research complete: No data flow exists - independent features                                                               |

### Session 1 - Performance & Verification (22 issues)

#### Completed

| ID      | Title                                                     | Reason                                      |
| ------- | --------------------------------------------------------- | ------------------------------------------- |
| `fso`   | Build Performance: Convert dashboard to server components | Converted 8 widgets to server components    |
| `7jp`   | Build Performance: Convert directory to server components | Converted Breadcrumbs to server component   |
| `87g`   | Build Performance: Convert groups to server components    | Fixed groups admin page missing useEffect   |
| `a2t`   | Directory shows no residents - Drizzle query issue        | Added isActive filter to /api/users         |
| `wpr`   | Epic: Migrate to FSD                                      | Already follows FSD structure               |
| `apf`   | Fix multitenant architecture gaps                         | Already implemented with withTenant()       |
| `n95`   | Fix Better Auth admin plugin conflict                     | No conflict — uses additionalFields pattern |
| `wu1.4` | Remove Prisma dependency after migration                  | Won't fix — intentional per ADR-003         |

#### Verified (Code Review)

| ID    | Title                                                       | Verification                                   |
| ----- | ----------------------------------------------------------- | ---------------------------------------------- |
| `95n` | Verify EventsWidget empty state shows Create Event link     | EventsWidget.tsx:118-124                       |
| `0ul` | Verify Events tab appears in admin dashboard                | admin-config.ts:35-39                          |
| `bj9` | Create event via /admin/events/new — verify form            | EventForm.tsx: Zod validation, toast, redirect |
| `uuz` | Navigate to /admin/events — verify event list               | EventList.tsx: 5 columns rendered              |
| `019` | Verify non-admin users cannot see scheduled/expired content | /api/content/route.ts:129-137                  |
| `eam` | Verify AssistSession scope enforcement                      | auth-guard.ts:66-108                           |
| `j0p` | Verify invitation database records during onboarding        | InviteStep.tsx: formData.invites               |
| `6cf` | Verify onboarding wizard navigation and data persistence    | OnboardingWizard.tsx: 5 steps, progress bar    |
| `479` | Verify end-to-end signup flow                               | signup → tenant created → onboarding → /admin  |

#### Duplicates Closed

| ID    | Title                                                   | Duplicate Of |
| ----- | ------------------------------------------------------- | ------------ |
| `og0` | Navigate to /admin/events — verify event list           | `uuz`        |
| `8as` | Verify EventsWidget empty state shows Create Event link | `95n`        |

#### Logging Consolidation

| ID    | Title                                          | Status       |
| ----- | ---------------------------------------------- | ------------ |
| `8ov` | Migrate all console.error to Pino logger       | ✅ Completed |
| `8mj` | Migrate remaining 88 console statements        | ✅ Completed |
| `x7e` | Migrate remaining console.error to pino logger | ✅ Completed |

---

## Recommended Next Actions

1. **`cs5`** — MyHomeSpace property linking bug (user has property but shows "No property linked")
2. **`ka6`** — Design decision: widget placement across Focus Spaces (UX call needed)
3. **`6d8`** — Migrate React imports to Preact (performance)
4. **`l23`** — Epic: i18n for all pages (large scope)
5. **`ltn`** — Add request validation plugin (security)
6. **`byj`** — AddWidgetModal search/filter enhancement
7. **`bgb`** — Epic: Interests Visualization (in-progress)
8. **`7td`** — Enable One Tap passkey login (security)

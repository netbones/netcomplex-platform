---
phase: 45
plan: 05
subsystem: i18n, cms
tags: [tiptap, locale-editor, unsaved-changes, LocaleAwareEditor, ContentForm]

# Dependency graph
requires:
  - phase: 45
    plan: 04
    provides: useSafeTranslation migration in widgets directory (shared lib pattern)
  - phase: 42
    provides: LocaleAwareEditor, LocaleAwareInput, LocaleSelector components
provides:
  - Unsaved-changes detection with locale-switch confirmation dialog in ContentForm
  - LocaleAwareEditor and LocaleAwareInput wired into ContentForm for per-locale title + content editing
affects: [future content editor phases, translation workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Pitfall 4 compliance: supportedLanguages constant for all locale keys, no hardcoded strings'
    - 'Dirty tracking: useRef guard for initial render skip, useState Record<string, boolean>'
    - 'Locale-aware editing: LocaleAwareEditor replaces direct RichTextEditor + manual locale handling'

key-files:
  created: []
  modified:
    - src/widgets/admin/ui/ContentForm.tsx

key-decisions:
  - 'Used useRef guard (isInitialRender) to prevent initial data load from marking locales dirty'
  - 'Simplified Editing Language bar to translation status only — LocaleAwareEditor/LocaleAwareInput now own locale switching'
  - 'Removed RichTextEditor import — replaced by LocaleAwareEditor which wraps it internally'
  - 'Kept existing translation status grid unchanged'

patterns-established:
  - 'Dirty state pattern: useState<Record<string, boolean>> + useRef skip + useEffect on formValues'
  - 'Confirmation dialog: pendingLocaleChange state + AlertTriangle icon + exact UI-SPEC copy'

requirements-completed: [0f7]

# Metrics
duration: 8min
completed: 2026-06-19
---

# Phase 45 Plan 05: Tiptap Content Localization

**ContentForm hardened with unsaved-changes detection, locale-switch confirmation dialog, and LocaleAwareEditor integration — preventing accidental data loss when switching locales mid-edit.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-19T11:12:00Z
- **Completed:** 2026-06-19T11:20:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Added localeDirtyState tracking with useRef guard for initial render skip
- Added pendingLocaleChange state + confirmation dialog with exact UI-SPEC copy
- Modified handleLocaleChange to check dirty state before switching locales
- Wired LocaleAwareEditor into ContentForm replacing direct RichTextEditor usage
- Wired LocaleAwareInput for locale-aware title editing
- Simplified "Editing Language" bar to translation status display
- Cleared dirty state on successful save and on copy-to-locale
- Removed RichTextEditor import (now internally handled by LocaleAwareEditor)
- Imported AlertTriangle from lucide-react for confirmation dialog icon
- Pitfall 4 compliance: zero hardcoded locale strings, supportedLanguages imported
- All quality gates pass: typecheck, lint (0 errors), no hardcoded 'en-US'

## Task Commits

All tasks committed atomically in single plan commit:

- **Plan 45-05 commit:** `4f75d880` (feat)

## Files Modified

- `src/widgets/admin/ui/ContentForm.tsx` — 90 insertions, 46 deletions
  - Added: useEffect + useRef dirty tracking, switchLocale helper, confirmation dialog
  - Modified: handleLocaleChange with dirty check, title → LocaleAwareInput, content → LocaleAwareEditor
  - Removed: RichTextEditor import, simplified Editing Language bar
  - Imports added: AlertTriangle, LocaleAwareEditor, LocaleAwareInput, useEffect, useRef

## Decisions Made

- Used `useRef` for initial render skip rather than comparing formValues to initialData — simpler and avoids edge cases with async initial data
- Left `handleCopyContent` callback in place (now unused after bar simplification) — removing would require more refactoring of LocaleAwareEditor's copy flow
- Kept `hasTitleForActiveLocale`/`hasContentForActiveLocale` variables — only `hasTitleForActiveLocale` became unused after LocaleAwareInput replacement (acceptable dead code)
- Confirmation dialog renders with yellow warning styling matching UI-SPEC design

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- None — all tasks completed cleanly, typecheck and lint passed with zero errors

## Next Phase Readiness

- ContentForm now safe for multi-locale editing with dirty-state protection
- Translation status grid preserved and functional
- No hardcoded locale strings (Pitfall 4 compliance verified)

---

_Phase: 45-m5b-anchor-tenant_
_Completed: 2026-06-19_

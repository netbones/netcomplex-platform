# Toast & Tooltip System Review

**Scope:** Toast notifications (Sonner) and tooltips (Radix UI)  
**Documented:** 2026-06-23 by GSD Review

---

## 1. Toast Architecture

### 1.1 Library

- **Primary:** `sonner` (v2.0.7) — Modern, lightweight toast library
- **No other toast libraries** (no react-hot-toast, react-toastify, etc.)

### 1.2 Configuration

Three `<Toaster>` instances mounted in separate layout shells:

| Location                        | Scope                            |
| ------------------------------- | -------------------------------- |
| `src/app/(auth)/layout.tsx`     | Login, register, forgot password |
| `src/app/(tenant)/layout.tsx`   | Tenant dashboard, resident pages |
| `src/app/(platform)/layout.tsx` | Platform admin, super admin      |

All use identical config: `position="top-right"` (default Sonner styling).

### 1.3 `useApiToast` Hook

- **Path:** `src/shared/lib/hooks/useApiToast.ts`
- **Features:**
  - `mutate()` — Loading → success/error with auto-retry
  - `fetch()` — Silent by default, error-only toasts
  - `background()` — No UI, just logging + retry
  - `cancel()` — Dismiss all toasts
  - Exponential backoff: 1s, 2s, 4s
  - Auto-unwraps `{ success: true, data: T }` envelope
  - Retry action button on failure toasts
- **Standalone:** `toastPromise()` utility for one-off API calls

---

## 2. Toast Usage Audit

### 2.1 Coverage by Area

| Area              | Direct Sonner                                                                        | useApiToast | Missing Error Handlers                                                          |
| ----------------- | ------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------- |
| **Admin Widgets** | CompetitionList, ResourceForm, EventForm, ContentForm, CompetitionForm, ResourceList | —           | CompetitionList line 524 (delete), UsersListSection lines 77-91 (revoke/update) |
| **Shared UI**     | MediaLibrary, RichTextEditor, ImageUpload, Turnstile                                 | —           | —                                                                               |
| **Features**      | ProviderRegistration, ContentEngagementBar, AnnouncementForm                         | —           | AnnouncementForm line 353 (delete)                                              |
| **App Pages**     | Settings, Competition, Admin Announcements, Services                                 | —           | —                                                                               |

### 2.2 Inconsistency Patterns

1. **Error message inconsistency:**
   - Generic: `toast.error('Something went wrong')`
   - Server fallback: `toast.error(error.error || 'Failed to save...')`
   - Raw error: `toast.error(err.message)`
   - Localized: `toast.error(t('inviteFailed'))`

2. **Loading state inconsistency:**
   - Some use `toast.loading()` + `toast.dismiss()` (MediaLibrary, ImageUpload)
   - Others use `useApiToast.mutate()` which handles loading automatically
   - Some mutation handlers have no loading state at all

3. **i18n inconsistency:**
   - Admin widgets use hardcoded English strings
   - User-facing pages use `t()` for some but not all messages
   - No centralized toast message dictionary

---

## 3. Tooltip Architecture

### 3.1 Library

- **Primary:** `@radix-ui/react-tooltip` (v1.2.8)
- **Wrapper:** `src/shared/ui/tooltip.tsx` — shadcn/Tailwind styled

### 3.2 Configuration

- **Provider:** Mounted once at app root (`src/app/providers.tsx`)
- **Re-exported:** `src/shared/ui/index.ts` line 25

### 3.3 Actual Usage

**Found: ZERO production usage.**

The tooltip system is:

- ✅ Defined and exported
- ✅ Provider mounted globally
- ❌ **Never used in any user-facing component**

Components that _should_ use tooltips instead use `title` or `aria-label`:

- `RichTextEditor.tsx`: `title="Bold (Ctrl+B)"`
- `MediaLibrary.tsx`: `title="Copy URL"`
- Various buttons use `aria-label` without tooltip context

---

## 4. Accessibility

### 4.1 Toast Accessibility

- Sonner provides `role="status"` / `role="alert"` automatically
- Positioned top-right (visible, non-blocking)
- Dismissible by default
- **Gap:** No custom ARIA labels on individual toasts
- **Gap:** No guarantee screen readers announce loading states

### 4.2 Tooltip Accessibility (Theoretical)

- Radix UI Tooltip is fully accessible out-of-the-box
- Supports keyboard focus, screen readers, `aria-describedby`
- **But unused**, so this accessibility layer is dormant

### 4.3 What Replaces Tooltips

- `aria-label` on icon buttons (good)
- `title` attributes on toolbar buttons (browser-native, inconsistent behavior)
- No `aria-describedby` linking

---

## 5. Styling & UX

### 5.1 Toast Styling

- **Default Sonner** (no custom overrides)
- Success: Green checkmark
- Error: Red X
- Warning: Yellow exclamation
- Loading: Spinner + text
- **Issue:** Three separate Toaster mounts mean three toast containers — potential z-index conflicts

### 5.2 Tooltip Styling (Never Rendered)

```tsx
// From tooltip.tsx
'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5
text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95...'
```

- Uses CSS custom properties: `bg-popover`, `text-popover-foreground`
- Animated enter/exit with `animate-in` / `animate-out`
- Slide direction based on placement

---

## 6. Findings & Recommendations

### 6.1 Critical Issues

1. **Tooltip system is dead code** — Exported, mounted, but never used. Replace `title` attributes with actual `Tooltip` components.
2. **Three Toaster instances** — Should be a single `<Toaster>` in root layout to avoid z-index stacking issues.
3. **Inconsistent error handling** — Some API calls have no error toast at all (CompetitionList delete, UsersListSection revoke).

### 6.2 Recommendations

| Priority | Item                                                         | Effort | Status                                                                                                                  |
| -------- | ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| P1       | Replace `title` attributes with `Tooltip` on icon buttons    | 2h     | ✅ Done — RichTextEditor (20+ buttons), MediaLibrary (8 buttons, color swatches)                                        |
| P1       | Consolidate `<Toaster>` to root layout                       | 30min  | ✅ Done — Single `<Toaster>` in `providers.tsx`, removed from auth/tenant/platform layouts                              |
| P1       | Fix missing error toasts in CompetitionList/UsersListSection | 1h     | ✅ Done — CompetitionList delete, UsersListSection revoke/update error handlers                                         |
| P2       | Standardize error message format (create error dictionary)   | 2h     | ✅ Done — `ToastMsg` in `src/shared/lib/hooks/toast-messages.ts` with 11 helpers                                        |
| P2       | Migrate API calls to `useApiToast`                           | 4h     | ✅ Done — ResourceForm, EventForm, ContentForm, CompetitionForm, ResourceList migrated                                  |
| P2       | Add i18n to all toast messages                               | 3h     | ✅ Done — `toast.*` keys in `en/common.json`; settings page uses `tCommon()`                                            |
| P3       | Add `duration` and `position` config per toast type          | 1h     | ⏭️ Deferred — Sonner defaults adequate; revisit if UX feedback flags overlap/dismiss issues                             |
| P3       | Ensure loading toasts are announced to screen readers        | 1h     | ⏭️ Deferred — Sonner provides `role="status"`/`role="alert"` natively; full loading a11y is a Sonner library limitation |

---

## 7. Cross-References

- `src/shared/lib/hooks/useApiToast.ts` — Toast hook with retry
- `src/shared/ui/tooltip.tsx` — Tooltip wrapper (unused)
- `src/app/providersেট/(auth|tenant|platform)/layout.tsx` — Three Toaster mounts
- `src/shared/ui/index.ts` — Re-exports tooltip
- `docs/architecture/technical/USE_API_TOAST.md` — Hook documentation

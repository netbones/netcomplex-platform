# FSD Cleanup: Lint Violation Remediation

This task tracks the resolution of `no-restricted-imports` lint violations caused by FSD boundary violations.

## Plan

- [x] Batch 1: Shared API Cleanup - Update `src/shared/api/index.ts` and refactor imports.

2. [ ] **Batch 2: Entity Schema Cleanup** - Update entity `index.ts` files and refactor imports.
3. [ ] **Batch 3: Widget Composition** - Update `src/widgets/dashboard/index.ts` and refactor imports.
4. [ ] **Batch 4: Feature & Service Layer Cleanup** - Update feature/service `index.ts` files and refactor imports.

## Progress

- [ ] Batch 1: Shared API
- [ ] Batch 2: Entity Schema
- [x] Batch 3: Widget Composition
- [ ] Batch 4: Feature & Service Layer

---

## Violation Log (for batching)

- `@shared/api/schemas`
- `@shared/api/turnstile`
- `@shared/api/email/resend`
- `@shared/api/email/templates`
- `@shared/api/trpc/routers`
- `@shared/api/types`
- `@shared/api/supabase`
- `@shared/api/dto/competition`
- `@shared/api/slug`
- `@shared/api/gate`
- `@shared/api/auth-client`
- `@entities/booking/schema`
- `@entities/events/schema`
- `@entities/maintenance/schema`
- `@entities/tenant/schema`
- `@entities/chat/schema`
- `@widgets/dashboard/SpaceChrome`
- `@widgets/dashboard/AdminLayer`
- `@widgets/dashboard/spaces`
- `@widgets/dashboard/SpaceLayout`
- `@widgets/dashboard/ServicesLayer`
- `@widgets/dashboard/MessagesLayer`
- `@widgets/dashboard/AdminSubLauncher`
- `@widgets/dashboard/HomeLayer`
- `@widgets/dashboard/MyHomeSpace`
- `@widgets/dashboard/ServicesSubLauncher`
- `@widgets/dashboard/MessagesSubLauncher`
- `@widgets/dashboard/AnnouncementsStreamWidget`
- `@features/onboarding/OnboardingWizard`
- `@features/i18n/ui`
- `@entities/booking/services`
- `@entities/events/services`
- `@entities/maintenance/services`

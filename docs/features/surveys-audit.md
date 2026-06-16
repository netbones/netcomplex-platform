1. Survey-Related Pages (Routes in src/app)
   There are two top-level route groups for surveys:
   Public-facing route
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/app/surveys/page.tsx Placeholder public surveys page. Minimal stub — just shows "Community surveys will appear here." Not wired up to any real data or feature-flag gated.
   Admin routes (under (tenant)/admin/surveys)
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/surveys/page.tsx Admin survey list. Delegates to SurveysListPage from @pages/admin. Table view of all surveys with status, question/response counts, edit/view actions.
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/surveys/new/page.tsx New survey editor. Delegates to SurveyEditorPage with surveyId="new".
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/surveys/[id]/page.tsx Survey results page. Delegates to SurveyResultsPage. Shows aggregated response data with bar charts, ratings, and text responses per question.
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/surveys/[id]/edit/page.tsx Edit existing survey. Delegates to SurveyEditorPage with the real survey ID.
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/surveys/[id]/preview/page.tsx Survey preview. Delegates to SurveyPreviewPage. Renders a read-only preview with sections, questions, and question-type-specific preview blocks.
   API Routes
   File Method Purpose
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/route.ts GET, POST List all surveys (with question/response counts via subquery) or create a new survey. Tenant-scoped via withTenant(). POST gated on content permission.
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/[id]/route.ts Single survey detail (includes questions + sections).
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/[id]/questions/route.ts CRUD for questions within a survey.
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/[id]/questions/[questionId]/route.ts Single question CRUD.
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/[id]/questions/reorder/route.ts Reorder questions (drag-and-drop).
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/[id]/sections/route.ts CRUD for sections within a survey.
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/[id]/sections/[sectionId]/route.ts Single section CRUD.
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/[id]/sections/reorder/route.ts Reorder sections.
   /home/ubuntupunk/Projects/soralia-village/src/app/api/surveys/[id]/responses/route.ts Fetch survey responses (results aggregation).
   /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/surveys/route.ts External v1 API for tenant surveys.
   Page-Module Components (actual UI implementations, exported via @pages/admin)
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/page-modules/admin/surveys/index.ts Barrel export for all 4 page modules.
   /home/ubuntupunk/Projects/soralia-village/src/page-modules/admin/surveys/ui/SurveysListPage.tsx Full table listing with status badges, question/response counts, create/view/edit links. Fetches from GET /api/surveys.
   /home/ubuntupunk/Projects/soralia-village/src/page-modules/admin/surveys/ui/SurveyEditorPage.tsx Thin wrapper around SurveyEditor from @features/survey-builder. Adds breadcrumbs and ErrorBoundary + Suspense.
   /home/ubuntupunk/Projects/soralia-village/src/page-modules/admin/surveys/ui/SurveyResultsPage.tsx Full results page with BarChart, RatingResult, and TextResponses sub-components for visualizing aggregated survey data. Fetches from GET /api/surveys/[id]/responses.
   /home/ubuntupunk/Projects/soralia-village/src/page-modules/admin/surveys/ui/SurveyPreviewPage.tsx Read-only preview rendering sections and questions using per-question-type Preview components from @features/survey-builder.
2. Survey Components
   Feature: Survey Builder (src/features/survey-builder)
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/index.ts Public API: exports SurveyEditor + all 6 question-type block modules (for preview usage).
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/model/builder-types.ts Shared types: BuilderQuestion, BuilderSection, SortableItem discriminated union, QuestionReorderItem.
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/SurveyEditor.tsx Main editor component (full drag-and-drop survey builder).
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/SurveyEditorHeader.tsx Editor header with title, description, status controls.
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/BlockPalette.tsx Palette for adding question types (SINGLE_CHOICE, MULTIPLE_CHOICE, TEXT, RATING, YES_NO, LINEAR_SCALE).
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/QuestionList.tsx Sortable list of questions.
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/QuestionBlock.tsx Individual question card wrapper.
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/QuestionConfigPanel.tsx Configuration panel for question settings (required, options, etc.).
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/OptionsEditor.tsx Options list editor (add/remove/reorder).
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/SectionBlock.tsx Section block component.
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/BuilderRichText.tsx Rich text editor for descriptions.
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/SaveIndicator.tsx Save status indicator.
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/lib/useDebouncedAutoSave.ts Debounced auto-save hook.
   /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/lib/useSaveStatus.ts Save status tracking hook.
   6 question-type block files under ui/question-types/ SingleChoiceBlock, MultipleChoiceBlock, TextBlock, RatingBlock, YesNoBlock, LinearScaleBlock — each exports both .Editor and .Preview components.
   Entity: Survey (src/entities/survey)
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/entities/survey/index.ts Barrel: exports types + schema.
   /home/ubuntupunk/Projects/soralia-village/src/entities/survey/model/types.ts Core domain types: Survey, SurveyQuestion, SurveySection, SurveyDetailResponse, QuestionType, QuestionTypeMeta, getTypeMeta(), QUESTION_TYPE_META array (6 question types with labels, icons, badge classes).
   /home/ubuntupunk/Projects/soralia-village/src/entities/survey/model/schema.ts Zod validation schema for survey form — note: this schema is slightly outdated (only supports TEXT, SINGLE_CHOICE, MULTIPLE_CHOICE, SCALE types, missing RATING, YES_NO, LINEAR_SCALE).
   Widget: Admin Surveys Widget
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/SurveysWidget.tsx Admin dashboard widget. Shows recent 5 surveys with status badges, question/response counts, "View Results" link, "View All Surveys" footer. Fetches from GET /api/surveys. Rendered in admin dashboard via AdminWidgetRenderer.
   /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/AdminWidgetRenderer.tsx Switch-based widget renderer — maps admin-surveys widget ID to <SurveysWidget />.
3. The /dashboard/services Page
   There is no page.tsx at /dashboard/services. The directory contains only:
   src/app/(tenant)/dashboard/services/
   [domain]/
   page.tsx <-- handles /dashboard/services/maintenance, /bookings, etc.
   events/
   new/page.tsx <-- /dashboard/services/events/new
   [id]/page.tsx <-- /dashboard/services/events/[id]
   The [domain]/page.tsx (/home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/dashboard/services/[domain]/page.tsx) is a client component that:

- Validates the domain against SERVICES_DOMAINS (maintenance, bookings, amenities, my-services, events)
- Shows a ServicesCommandBar (urgent items + creation shortcuts) via the ServicesLayer component
- Renders domain-specific widgets via WidgetRenderer from the widget registry
- For maintenance domain, shows an inline MaintenanceForm when ?action=new is set
- Shows a "Coming soon" message for domains with no registered widgets
  The services landing page (the domain grid with command bar) is rendered by the ServicesLayer component (/home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/ServicesLayer.tsx):
- Displays a ServicesCommandBar at the top (reactive CTAs)
- Shows responsive 5-domain grid of DomainCard links: Maintenance, Bookings, Amenities, My Services, Events
- Each card has urgency badges fetched from /api/services/urgency
  The service domains are defined in ServicesSubLauncher (/home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/ServicesSubLauncher.tsx):
  SERVICES_DOMAIN_DEFINITIONS = [
  { id: 'maintenance', ... },
  { id: 'bookings', ... },
  { id: 'amenities', ... },
  { id: 'my-services', ... },
  { id: 'events', ... },
  ]

4. The "SpaceChrome" Pattern (NOT "chromelauncher")
   The pattern you're referring to is SpaceChrome, not "chromelauncher." It is the shared dashboard/admin layout wrapper.
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/SpaceChrome.tsx Shared client component for the dashboard/admin chrome. Wraps every tenant page under /dashboard/_ or /admin/_ with a unified sidebar + main + mobile bar. Handles collapsed state, pathname-based active space detection, session/role awareness, and feature flags. Mounted by both dashboard/layout.tsx and admin/layout.tsx.
   Related chrome/launcher files:
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/SpaceLauncher.tsx Desktop sidebar launcher — renders the space navigation sidebar.
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/MobileSpaceBar.tsx Mobile bottom bar — space navigation for mobile.
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/ServicesSubLauncher.tsx Sub-launcher within the Services space — defines the 5 service domain cards.
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/AdminSubLauncher.tsx Sub-launcher within the Admin space — defines 9 admin management domain cards (users, maintenance, content, events, competitions, resources, surveys, announcements, system). Links to /admin/<domain>.
5. Survey Prisma Model
   From /home/ubuntupunk/Projects/soralia-village/prisma/schema.prisma:
   enum QuestionType {
   SINGLE_CHOICE
   MULTIPLE_CHOICE
   TEXT
   RATING
   YES_NO
   LINEAR_SCALE
   }

enum SurveyStatus {
DRAFT
ACTIVE
CLOSED
}

enum SurveyType {
INTERNAL
EXTERNAL
}

model Survey {
id String @id
tenantId String
title String
description String?
type SurveyType @default(INTERNAL)
status SurveyStatus @default(DRAFT)
startDate DateTime?
endDate DateTime?
config Json? @default("{}")
createdAt DateTime @default(now())
updatedAt DateTime @default(now()) @updatedAt
Question Question[]
Response Response[]
Section SurveySection[]
}

model Question {
id String @id
tenantId String
surveyId String
sectionId String?
text String
type QuestionType
options String[]
required Boolean @default(false)
order Int @default(0)
config Json? @default("{}")
Survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)
Section SurveySection? @relation(fields: [sectionId], references: [id], onDelete: SetNull)
@@index([surveyId])
@@index([sectionId])
}

model SurveySection {
id String @id
tenantId String
surveyId String
title String?
description String?
image String?
order Int @default(0)
createdAt DateTime @default(now())
updatedAt DateTime @default(now()) @updatedAt
Survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)
Question Question[]
@@index([surveyId])
}

model Response {
id String @id
tenantId String
surveyId String
userId String?
answers Json
createdAt DateTime @default(now())
Survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)
}
Key observations:

- No tenantId index on Survey — queries always filter by tenant but there's no index. Could be a performance concern at scale.
- Response uses Json for answers — flexible but untyped at the database level.
- Questions can belong to sections (sectionId is optional, SetNull on section delete).
- Survey type is INTERNAL or EXTERNAL — currently only INTERNAL is used.
- Survey config is a JSON blob for extensibility.

6. Widget Registration Patterns
   The project has two parallel widget systems for historical reasons. Both are actively used:
   A. Widget Registry (primary — src/widgets/dashboard/model/)
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/registry.ts WidgetRegistry class — singleton Map-based registry. Each widget has a WidgetManifest (id, version, name, description, category, icon, lazy() component, spaces, permissions, featureFlag). registerAllWidgets() in widgets.ts populates it. Exports getWidgetComponent(), getWidgetMetadata(), hasWidget(), WIDGET_REGISTRY (backward-compat object).
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/widgets.ts registerAllWidgets(registry) — the single place where all widgets are registered. Each call is registry.register({ id, spaces: [...], ... }). Organised into sections: CORE, COMMUNICATION, MAINTENANCE, ADMIN CORE, CONTENT, UTILITY, PREMIUM.
   B. Entity-level Widget Config (src/entities/widget/model/)
   File Purpose
   /home/ubuntupunk/Projects/soralia-village/src/entities/widget/model/dashboard-config.ts ALL_WIDGETS array — an alternative widget listing for dashboard config purposes with getWidgetById(), getWidgetsBySpace().
   /home/ubuntupunk/Projects/soralia-village/src/entities/widget/model/default-layouts.ts DEFAULT_USER_WIDGETS — per-role default layout configurations (RESIDENT_USER_WIDGETS, BOARD_USER_WIDGETS, ADMIN_USER_WIDGETS).
   C. Space-to-Widget Mapping
   In /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/spaces.ts:

- SPACES registry maps each of the 5 focus spaces to their widgetIds array
- getAdminDomainWidgets() maps admin domains to widget IDs
- getServicesDomainWidgets() maps service domains to widget IDs
  D. Widget Rendering
  File Purpose
  /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/WidgetRenderer.tsx Resolves a widgetId to a manifest from the registry and renders the lazy() component.
  /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/AdminWidgetRenderer.tsx A separate switch-based renderer for admin widgets (maps widget IDs like admin-surveys, admin-events, etc. to their components).
  Survey widget registration (in widgets.ts):
  registry.register({
  id: 'admin-surveys',
  name: 'Admin Surveys',
  category: 'core',
  icon: FileText,
  permissions: ['admin'],
  component: lazy(() => import('@widgets/admin').then(m => ({ default: m.SurveysWidget }))),
  spaces: ['community', 'admin'],
  });

7. Navigation Structure
   The navigation is defined in /home/ubuntupunk/Projects/soralia-village/src/shared/lib/nav/index.ts.
   Public Navigation (NAV_REGISTRY)
   All public + dashboard nav items, feature-flag and permission-gated:
   / home (public)
   /directory directory (flag: directory)
   /groups groups (flag: groups)
   /services services (flag: services) ← PUBLIC services listing
   /resources resources (flag: resources)
   /news news (flag: news)
   /maintenance maintenance (flag: maintenance)
   /surveys surveys (flag: surveys) ← PUBLIC surveys (stub page)
   /competition competition (flag: competitions)
   /conservation conservation (flag: conservation)
   /campaign campaign (flag: campaign)
   /dashboard dashboard
   /bookings bookings (flag: bookings)
   /messages messages (permission: messages)

// Dashboard Focus Spaces:
/dashboard dashboard-home (spaces.home)
/dashboard/services dashboard-services (spaces.services) ← SERVICES FOCUS SPACE
/dashboard/community dashboard-community (spaces.community)
/dashboard/messages dashboard-messages (spaces.messages)
/admin dashboard-admin (spaces.admin) ← ADMIN FOCUS SPACE
Admin Navigation (ADMIN_NAV_REGISTRY)
/admin admin_overview
/admin/users admin_users
/admin/requests admin_requests
/admin/content admin_content
/admin/groups admin_groups
Focus Spaces (5-space model in spaces.ts)
Space URL Visibility
Home /dashboard Core (always visible)
Services /dashboard/services Gated on services feature flag
Community /dashboard/community Auto-hides if ALL of events, groups, surveys, competitions, news are off
Messages /dashboard/messages Core (always visible)
Admin /admin Core, but role-gated (admin/board only)
Survey Navigation Flow

1. Public: /surveys (stub page, flag-gated)
2. Admin Space: /admin → AdminSubLauncher → card linking to /admin/surveys (full list page)
3. Admin Sub-route: /admin/surveys/new → survey builder editor
4. Admin Sub-route: /admin/surveys/[id]/edit → edit existing survey
5. Admin Sub-route: /admin/surveys/[id] → view results
6. Admin Sub-route: /admin/surveys/[id]/preview → preview survey
7. Widget: admin-surveys widget appears in Community and Admin spaces
   Key gap
   Surveys are NOT in the /dashboard/services space. The services domains are: maintenance, bookings, amenities, my-services, events. Surveys live under the Admin space (/admin/surveys) and the Community space (as a widget). There is no resident-facing "take a survey" page beyond the stub at /surveys.

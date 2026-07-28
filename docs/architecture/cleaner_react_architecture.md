# Cleaner React Architecture Series.

These are item chapters from youtube series

## Shared Api Client

[Shared Api Client Video](https://www.youtube.com/watch?v=GpRYT3CQ-Y0)

**The Problem** (0:28 - 1:07): Storing API request configurations directly inside components leads to code duplication, making it difficult to update base paths, handle global authentication headers, or maintain consistency across a growing project.

**The Solution** (1:08 - 1:53): By centralizing API requests into a shared client, you gain the ability to manage base URLs and headers in a single location. This approach significantly simplifies future changes, such as version updates (e.g., changing API to API/V2) or adding global middleware like token handling.

**Future Refactoring** (1:54 - 2:03): The creator notes that while a shared client is a great first step, it is just the beginning of a larger refactoring journey to improve overall application structure.

**Tooling Considerations** (2:04 - 2:38): The video discusses trade-offs when choosing between Axios and the native Fetch API. While Axios offers convenience, Fetch is natively supported and helps reduce bundle size, provided you implement your own reusable instance or class to maintain cleaner syntax.

## API Layer & Fetch Functions

[API Layer & Fetch Functions](https://www.youtube.com/watch?v=tl6NuSL8euY)

This video is the second part of a series on improving React application architecture by refactoring a codebase with messy practices. The focus is on decoupling UI components from API-related code to improve maintainability and cleanliness (0:09 - 0:26).

**Key Takeaways:**

- The Problem: In many React projects, API requests (endpoints, methods, parameters) are directly mixed into UI components, making them overly complex and tightly coupled to the backend implementation (0:37 - 1:05).

- The Solution: Extract fetch functions into a dedicated API layer/folder. This hides implementation details—such as request methods, endpoint paths, and data types—from the components (1:05 - 1:35).

- Benefits: Components remain simple, focusing on rendering rather than data retrieval. Additionally, these extracted fetch functions are reusable across different components and support various rendering strategies like client-side or server-side rendering (2:07 - 2:33).

**Next Steps:**

While this refactoring is a major improvement, the creator acknowledges that some coupling persists and indicates that the next video will address more advanced challenges, such as dealing with complex API responses (e.g., nested included fields) (2:45 - 3:06).

## API Layer & Data Transformations

[API Layer & Data Transformations](https://www.youtube.com/watch?v=UaV_bPn1rWI)

This video, part of an ongoing series on React architecture, explains how to clean up your codebase by moving data transformation logic from UI components into a dedicated API layer. By doing this, you decouple your UI from the specific structures of API responses and input requests.

**Key Takeaways:**

- Hiding API Complexity (0:35 - 2:43): Often, components are cluttered with raw API response structures (e.g., response.data, response.included). By moving transformation logic into your fetch functions, the component receives clean, ready-to-use data structures (like user or shout), making the UI more readable and easier to maintain if the API structure changes.

- Handling Complex Data Transformations (3:01 - 4:09): When an API response includes mixed types (e.g., users and images within an included field), keep the logic for separating and parsing these types inside the API layer instead of the component.

- Standardizing Inputs (4:31 - 5:51): Data transformation is also important for request bodies. For example, by handling file uploads (e.g., using FormData) within the API layer, the component doesn't need to know the specifics of how the media is sent. This makes it trivial to swap storage providers later (like switching to AWS S3) without touching component code.

**Next Steps:**

    Domain Layer (5:53 - 6:16): While the API layer cleans up request/response logic, the video notes that fetch functions may still return data as it comes from the API.

## Domain Entities & DTOs

[Domain Entities & DTOs](https://www.youtube.com/watch?v=-ojYfV4NSUQ&t=32s)

This video is the fourth part of a series focused on refactoring messy React codebases into a clean, professional architecture. The focus here is on decoupling the UI from the server API by introducing Domain Entities and Data Transfer Objects (DTOs).

Key Concepts & Refactoring Steps

- The Problem: Directly passing API response data (often using standards like JSON API) to UI components leads to tight coupling. If the backend changes its data structure (e.g., changing nested attributes or relationships), the frontend requires massive, manual updates across the codebase (0:47-2:38).

**The Solution:**

- Domain Layer: Create a dedicated folder for shared business logic models (2:44-3:00). This acts as the "single source of truth" for the frontend.
- DTOs: Keep the API-specific data structures isolated within the API layer (3:40-3:48).
- Transformations: Create a Transformer function to map raw API responses to the cleaner, flattened Domain model before it ever touches a UI component (3:51-4:12).

**Advantages & Disadvantages**

**Advantages:**

- Improved resilience against external API changes.
- Cleaner, more readable UI code (no more nested user.attributes.avatar calls).
- Clearer separation of concerns (4:17-4:37).

**Disadvantages:**

- Increased boilerplate code (you need a domain model, DTO, and transformer for each entity).
- Slightly higher initial complexity for new developers (4:39-4:57).

Highlights for Later

    The creator discusses potential ways to mitigate boilerplate, such as using TypeScript shared models in monorepos or automated code generation (5:12-5:45).
    The next video in the series will cover the Repository Pattern to further refine the API layer and move responsibilities out of simple fetch functions (6:15-6:21).

## Infrastructure Services & Dependency Injection

[Infrastructure Services & Dependency Injection](https://www.youtube.com/watch?v=WfJcNvTabO4)

This video is the fifth part of a series on clean React architecture. It focuses on refining the API layer by introducing infrastructure services and dependency injection to improve code testability and maintainability.

**Key Concepts and Refactoring Steps:**

- Separation of Concerns: The goal is to decouple the UI from raw API implementation details (2:07-2:46). The narrator explains moving logic out of simple fetch functions into dedicated service classes.

- Dependency Injection (DI): By passing the API client as a dependency into the constructor of a service class rather than importing it directly, the service becomes independent of the specific API implementation (3:21-4:59). This allows for easy unit testing using mock implementations (5:00-5:55).

- Singleton Pattern: Since only one instance of these services is typically needed, the video shows how to export a single instance of the class for use across the application (5:56-6:38).

- Infrastructure Layer: The narrator suggests renaming the API layer to infrastructure to better reflect that it handles data access as a general concern, decoupled from the framework (6:40-7:05).

Strategic Trade-offs:

    When to use this: This approach is valuable when services contain complex logic, such as data transformations or switching between different API versions (7:22-8:33).
    When to avoid it: For simple fetch functions with no extra logic, the narrator advises that this extra abstraction might be unnecessary overhead (8:34-9:42).

Advantages of this approach:

    UI Isolation: Changes to the backend API can be managed within the infrastructure layer without impacting UI code (8:50-9:08).
    Framework Independence: The infrastructure layer remains agnostic of the UI framework (9:25-9:43).
    Simplified Testing: Logic can be unit tested without needing complex mock server setups (9:10-9:18).

Coming up in the series: In the next installment, the narrator plans to move closer to the UI components to explore use cases and extracting business logic (10:30-10:39).

## Business Logic Separation

[Business Logic Separation](https://www.youtube.com/watch?v=eKs6KYX0vCY)

This video is the sixth installment in a series focused on building a clean React architecture. It addresses the common issue of mixing UI code with business logic, which often leads to code that is difficult to maintain and test (0:41-0:54).

**Core Refactoring Steps:**

1. **Extracting Business Logic (2:59 - 4:54):** The video demonstrates moving business logic (data validation and API orchestration) out of the component's submit handler and into a standalone function. This makes the logic independent of the UI framework.

2. **Dependency Injection (5:27 - 6:44):** To improve testability, the code is refactored to accept service dependencies as parameters. A custom hook is then used to inject these services, facilitating easier testing.

3. **Unit Testing (7:15 - 8:40):** With the business logic isolated, the author shows how to replace complex integration tests with fast, focused unit tests. This covers various edge cases without needing to simulate full UI interactions.

**Summary of Pros & Cons:**

- **Advantages:** Improved testability, better separation of concerns, and framework independence (8:47-9:02).
- **Disadvantages:** Requires more boilerplate (custom hooks), might be overkill for simple requests, and introduces an architecture that may be unfamiliar to some developers (9:08-9:37).

The video concludes by noting that while they have addressed business and application logic, the next step in the series will focus on moving domain-specific logic to a dedicated **domain layer** (9:45-9:58).

## Domain Logic

[Domain Logic](https://www.youtube.com/watch?v=r2zuEqPFDDY)

This video, part of a series on **React architecture**, focuses on isolating **domain logic**—code that operates on core models like users or posts—to create a cleaner, more maintainable application structure.

### **Key Takeaways:**

- **The Problem:** Business logic, such as finding specific entities (like users or images) or performing simple validations, often clutters React components, leading to messy code, hard-to-read ternary expressions, and complex testing scenarios (0:50-1:28).
- **The Solution:** Move domain-specific operations into a dedicated **domain layer** (1:31-1:42). By creating small, pure, and often optional-parameter functions, developers can:
  - **Improve Readability:** Replace complex lookups with descriptive, plain-English function calls like `getUserById` (2:37-2:51).
  - **Simplify Testing:** Unit test logic in isolation without needing to render heavy components or setup mocks through tools like _React Testing Library_ (3:22-3:53).
  - **Enhance Maintainability:** Reduce the reliance on cluttered utility files and move implementation details (like business rules for post limits) out of the UI layer (4:01-5:31).

### **Pros and Cons of Domain Extraction:**

- **Advantages:** Significantly improves code readability, enhances testability, increases reusability, and makes the codebase easier to search for specific logic (5:36-6:47).
- **Disadvantages:** Introduces some initial development overhead by creating more files and functions, and requires team training to ensure consistent architecture patterns (6:50-7:28).

The video concludes by emphasizing that keeping React components free of core business logic facilitates easier transitions between different stacks and prepares the project for integrating external state management tools like _React Query_ in future episodes (7:30-7:56).

## React-Query

[React-Query](https://www.youtube.com/watch?v=A2FOOudW5GQ)

This video is the eighth installment in a series focused on building a clean architecture for _React_ applications. It demonstrates how to integrate _TanStack Query_ (formerly _React Query_) to manage server state efficiently.

### Key Takeaways:

- **Addressing Boilerplate:** Manual management of loading and error states leads to excessive code. Introducing _React Query_ hooks allows developers to abstract this logic, resulting in cleaner components (1:16 - 2:00).

- **Caching and Performance:** By using query hooks, the application automatically caches API responses, preventing duplicate requests and significantly improving the user experience by delivering data instantly if it was previously fetched (2:23 - 2:36).

- **Handling Complex Logic:** The video shows how to refactor business-logic-heavy hooks (e.g., `useReplyToShout`) to utilize both queries and mutations. This keeps the UI component logic minimal while ensuring the business logic remains testable in isolation (2:40 - 4:47).

- **Dependency Injection:** The approach continues to rely on dependency injection, keeping services separate from UI logic, which aligns with the series' ongoing theme of architectural separation of concerns (2:12 - 2:22).

**Conclusion:**
The integration of _React Query_ acts as a proxy between the component and service layers, reducing redundancy and handling data synchronization out of the box. The series creator notes that this architectural change had minimal impact on the existing UI components despite fundamentally changing how server data is managed (4:48 - 5:02).

---

# Architecture Checklist

A practical, opinionated checklist derived from the eight chapters above. Use it as an audit guide when introducing a new feature, refactoring an existing one, or doing a periodic code-health sweep.

## 1. Shared API Client

> ⏭️ **SUPERSEDED:** The project chose tRPC expansion (44 routers) over wrapping REST calls.
> `http-client.ts` exists but the primary data path is now tRPC, making a shared REST client
> less critical. Remaining `fetch()` calls are a shrinking tail being migrated per-feature.

- [ ] ⏭️ SUPERSEDED: A single HTTP client owns base URL, auth headers, and error normalization
- [ ] ⏭️ SUPERSEDED: No component or feature imports `fetch` directly for app traffic
- [ ] ⏭️ SUPERSEDED: Tooling choice is consistent (do not mix `fetch` and `axios` in the same layer)
- [ ] ⏭️ SUPERSEDED: Token refresh / 401 retry lives in the client, not in call sites
- [ ] ⏭️ SUPERSEDED: Base path (e.g. `/api/v2`) is configurable in one place

## 2. API Layer & Fetch Functions

- [ ] ⏳ Every endpoint is wrapped in a named function inside an API module
- [ ] ⏳ Endpoint paths, HTTP verbs, and query/body shapes are hidden from UI
- [ ] ⏳ API functions return the cleaned payload, not `Response` objects
- [ ] ⏳ Same fetch function is reusable across server components, client components, and tests
- [ ] ⏳ API functions never call into UI-only code (no `useState`, no JSX)

## 3. API Layer & Data Transformations

- [ ] ⏳ Raw response shapes (`response.data.included[0].attributes`) never reach the UI
- [ ] ⏳ Multi-type includes (e.g. mixed `users` and `images`) are split inside the API layer
- [ ] ⏳ Request bodies are normalized at the boundary (e.g. `FormData` building for uploads)
- [ ] ⏳ Storage / serialization details (S3 vs Supabase vs R2) are hidden from components
- [ ] ⏳ Transformation helpers are pure functions, easy to unit test in isolation

## 4. Domain Entities & DTOs

- [ ] ⏳ Each domain has exactly one canonical TypeScript type consumed by the UI
- [ ] ⏳ API-specific shapes (DTOs) are isolated to the API/infrastructure layer
- [ ] Transformer functions map DTO → Domain (not Domain → DTO)
- [ ] ⏳ No `*.attributes.*` or `*.included.*` leakage in components
- [ ] ⏳ Domain types are framework-agnostic (no `NextRequest`, no `JSX.Element`)

## 5. Infrastructure Services & Dependency Injection

- [ ] ⏳ Stateful or multi-step backend interactions live in service classes/modules
- [ ] ⏳ Services receive their dependencies (db client, http client) via constructor or factory
- [ ] ⏳ Services can be instantiated in tests without booting the full app
- [ ] ⏳ Singleton instances are exported from a single barrel, not re-created on import
- [ ] ⏳ Simple single-call fetches do not get an unnecessary service wrapper

## 6. Business Logic Separation

- [ ] ⏳ Submit handlers in components delegate to a custom hook or action
- [ ] ⏳ Validation, orchestration, and branching live outside the JSX tree
- [ ] ⏳ Custom hooks accept their dependencies (services) as parameters when they have side effects
- [ ] ⏳ Unit tests cover business logic without rendering components
- [ ] ⏳ No "fat component" >200 lines mixing form state, API calls, and business rules

## 7. Domain Logic

- [ ] ⏳ Pure helper functions live in the domain layer (e.g. `canUserViewRequest`, `getTicketPriority`)
- [ ] ⏳ Domain helpers accept primitive inputs and return primitive or domain-typed outputs
- [ ] ⏳ No React imports inside the domain layer
- [ ] ⏳ Lookup-by-id, validation, and business rules are searchable by feature
- [ ] ⏳ Domain helpers are unit tested without mocks

## 8. React Query (TanStack Query)

- [ ] ⏳ Every server-state read goes through `useQuery` / `useSuspenseQuery`
- [ ] ⏳ Every server-state write goes through `useMutation`
- [ ] ⏳ No `useState` + `useEffect` + `fetch` for data that lives on the server
- [ ] ⏳ Query keys are co-located with the feature's API module
- [ ] ⏳ Cache invalidation is wired to mutations (no stale-after-write bugs)
- [ ] ⏳ Loading, error, and success states come from the hook, not from local booleans

---

# Soralia Village Codebase Audit (2026-06-02)

Audit of the current codebase against the checklist above. **Green = aligned, Yellow = partial, Red = gap.**

## 1. Shared API Client — Red

- `src/shared/api/data-fetching.ts` exposes a few cached `unstable_cache` helpers, but there is **no central HTTP client** that owns base URL, auth headers, retry, or response unwrapping.
- Roughly **236 raw `fetch('/api/...')` call sites** are scattered across `src/widgets`, `src/features`, `src/components`, and `src/app`.
- Token handling is duplicated per call site (the tRPC client wires `Authorization` in `src/app/providers.tsx:32-36`, but REST fetchers do not).
- Greenfield opportunity for a `src/shared/api/client.ts` that wraps `fetch` and centralizes headers, JSON parsing, and the canonical `{ success, data, error }` envelope unwrap (already shaped in `src/shared/api/api-response.ts` and partially handled in `src/shared/lib/hooks/useApiToast.ts:93-101`).

## 2. API Layer & Fetch Functions — Yellow

- **Green:** Several entities have a `src/entities/<x>/api/route.ts` (maintenance, booking, events, content) and `src/entities/<x>/api` folders with shared logic (`use-enabled-modules.ts`, `permissions.ts`, `with-tenant.ts`).
- **Red:** Most feature-level hooks call the REST endpoint inline:
  - `src/features/chat/model/useConversationList.ts:23` — `fetch('/api/conversations?userId=...')`
  - `src/features/chat/model/useMessageSend.ts:33` — `fetch('/api/messages', { method: 'POST', ... })`
  - `src/features/directory/model/useResidentFilter.ts:66` — `fetch('/api/users?...')`
  - `src/features/maintenance/model/useMaintenanceForm.ts:158` — `fetch('/api/maintenance', { method: 'POST', ... })`
  - `src/features/announcements/model/useAnnouncements.ts:79-145` — three raw fetch calls in one hook
- These should live in a `src/entities/<x>/api` fetch function (e.g. `listConversations({ userId })`) and be consumed by the feature hook.

## 3. API Layer & Data Transformations — Yellow

- **Green:** DTOs are extracted (`src/shared/api/dto/*.ts`) with `toXxxDTO` mappers; canonical `apiSuccess` / `apiError` envelope is enforced across 276+ route handlers.
- **Yellow:** `src/app/api/maintenance/route.ts:97-145` and `src/entities/maintenance/api/route.ts:24-64` contain **near-duplicate** transformation logic (admin vs. resident vs. community scope, DTO spreading, search filter). The "community" PII strip is implemented twice in different shapes.
- **Red:** `src/entities/maintenance/api/route.ts` exists but appears to be a parallel implementation to `src/app/api/maintenance/route.ts` — pick one. Most likely the `src/app/api/.../route.ts` is the canonical Next.js handler and the entity copy is dead/duplicate code that should be removed or replaced by re-exports.
- The maintenance service (`src/entities/maintenance/services/index.ts:128-159`) returns joined Drizzle rows with `MaintenanceRequest`, `user`, `property`, `team`, `provider` keys — leaking DB shape upward. A single DTO mapper at the service boundary would be cleaner.

## 4. Domain Entities & DTOs — Green

- **Green:** Each entity has a `model/types.ts` with framework-agnostic interfaces (e.g. `MaintenanceRequest`, `Resident`, `ConversationListItem`).
- **Green:** DTOs in `src/shared/api/dto/*` and re-exported through `src/entities/<x>/dto/index.ts`.
- **Yellow:** Inconsistent coverage — `admin`, `identity`, `widget`, `chat`, `directory`, `user`, `service` entities have no `dto/` or `services/` folders. The DTOs in `@api/dto` cover them, but the entity barrel doesn't re-export them.
- **Yellow:** `src/features/directory/model/useResidentFilter.ts:69-77` has **three branches** that try to coerce the API into a usable shape (`body.data`, `body.users`, raw `Array`). That's a sign that the upstream route returns inconsistent shapes — should be unified via a single DTO.

## 5. Infrastructure Services & Dependency Injection — Yellow

- **Green:** `src/entities/maintenance/services/index.ts`, `src/entities/booking/services/`, `src/entities/events/services/`, `src/entities/content/services/` exist as pure functions taking `db` (and the Drizzle client) as their implicit dependency.
- **Green:** tRPC `createContext` (`src/shared/api/trpc/server.ts:19-58`) injects `db`, `session`, `userId`, `role`, `tenantId` into every procedure — proper DI for the tRPC surface.
- **Yellow:** No constructor-based DI. Services are ES module functions, not classes. This makes mocking harder in tests and ties the service to the global `@api/db` import.
- **Red:** Many entities have no `services/` layer at all: `chat`, `directory`, `user`, `admin`, `identity`, `widget`, `service`. Their business logic lives directly in route handlers (`src/app/api/<x>/...`) or in the client-side hooks, making it untestable.

## 6. Business Logic Separation — Green (mostly)

- **Green:** Strong use of the `src/features/<x>/model/useXxx.ts` pattern. `useMaintenanceForm`, `useResidentFilter`, `useConversationList`, `useMessageSend`, `useMaintenanceFilter`, `useServiceFilter`, `useBookings`, `useOnboarding` are all business-logic-bearing hooks kept out of JSX.
- **Yellow:** Some components still carry data fetching inline:
  - `src/widgets/dashboard/ui/DashboardStats.tsx:76-85` — `useEffect` + `fetch` + `useState` for stats
  - `src/widgets/dashboard/ui/EventsWidget.tsx:50`, `MessagesLayer.tsx:101`, `ServicesLayer.tsx:99`, `HomeLayer.tsx:460`, `AdminLayer.tsx:123` — inline `fetch` in widgets
  - `src/widgets/admin/ui/AdminStatsWidget.tsx:73-77` — five raw `fetch` calls in a `useEffect`
- These should be extracted to `src/features/dashboard/model/useDashboardStats.ts` style hooks (or to `src/entities/dashboard/api`).

## 7. Domain Logic — Yellow

- **Green:** Some pure helpers in services (`generateTicketNumber`, `buildMaintenanceConditions` in `src/entities/maintenance/services/index.ts`).
- **Green:** `src/entities/tenant/model/useIdentity.ts:85-113` exports a pure `getVisibleWidgets(widgets, identity)` function.
- **Yellow:** Business rules are mixed with data fetching in `src/entities/tenant/model/useIdentity.ts:39-46`:
  ```ts
  const isAgent = !loadingManaged && agentAccesses.length > 0;
  const isPropertyOwner = !loadingProperties && ownedProperties.length > 0;
  const isSoloSeatHolder = !loadingSolo && !!SoloSeat;
  ```
  These are domain predicates that should be a pure function `getEffectiveRole({ agentAccesses, ownedProperties, SoloSeat })` in `src/entities/tenant/model/` so they can be unit tested without React.
- **Red:** `src/entities/maintenance/permissions/index.ts` is a one-line re-export — there's no real permission module yet despite `hasPermission` being called from many routes. Permission rules should be discoverable in one place.
- **Red:** `generateTicketNumber` (`src/entities/maintenance/services/index.ts:16-32`) is the kind of pure domain function that should have a unit test. None exists.

## 8. React Query (TanStack Query) — Red

- **Green:** Query client is wired in `src/app/providers.tsx:13-23` with sensible defaults (`staleTime: 60s`, no refetch on focus).
- **Green:** tRPC auto-generates `useQuery`/`useMutation` hooks — already used in `CompetitionList`, `getCompetitionDetail`, `getProfile`, `getMySoloSeat`, `getMyProperties`, `getAgentAccesses`.
- **Red:** Only **2 tRPC routers exist** (`identity`, `competitions` in `src/server/routers/`). The other ~25 entities still expose REST routes — meaning clients cannot benefit from React Query's caching, deduplication, and invalidation.
- **Red:** Roughly **30+ `useState` + `useEffect` + `fetch` patterns** exist in feature hooks and components that should be `useQuery`:
  - `useConversationList`, `useMessageSend`, `useResidentFilter`, `useMaintenanceForm`, `useBookings`, `useServiceFilter`, `useOnboarding`, `useSignupForm`, `useAnnouncements`
  - `DashboardStats`, `EventsWidget`, `MessagesLayer`, `ServicesLayer`, `HomeLayer`, `AdminLayer`, `AdminStatsWidget`, `UserContentWidget`, `NotificationsWidget`
  - All `src/components/surveys/builder/SurveyEditor.tsx` `fetch` calls
  - `src/shared/ui/Bookshelf.tsx`, `MediaLibrary.tsx`, `ImageUpload.tsx`, `TagInput.tsx`
- **Red:** `src/shared/lib/hooks/useApiToast.ts` (317 lines) exists to paper over the missing React Query mutation support — it manually does `toast.promise` + retry + error logging. This logic should be expressed declaratively through `useMutation`'s `onSuccess` / `onError`.

---

## Top Priority Gaps (Recommended Order)

1. **Build a shared HTTP client** (`src/shared/api/client.ts`) that handles base URL, auth headers, and envelope unwrapping. Migrate the 236 call sites over time. _Unblocks Chapters 1, 2, 3._
2. **Promote tRPC coverage** from 2 routers to the remaining ~25 entities so React Query applies uniformly. _Unlocks Chapter 8._
3. **Extract pure domain helpers** from `useIdentity.ts` and `services/index.ts` into `src/entities/<x>/model/*.ts` with unit tests. _Unlocks Chapter 7._
4. **De-duplicate maintenance transform logic** between `src/app/api/maintenance/route.ts` and `src/entities/maintenance/api/route.ts`. _Fixes Chapter 3._
5. **Move inline `useEffect` + `fetch`** in widgets (`DashboardStats`, `EventsWidget`, etc.) into feature-level hooks that use `useQuery` / `useMutation`. _Unlocks Chapters 6, 8._
6. **Add `services/` and `dto/` folders** to entities that lack them (`chat`, `directory`, `user`, `admin`, `identity`, `widget`, `service`) so every domain has the same shape. _Improves Chapters 4, 5._

# FSD (Feature-Sliced Design) architecture is correct

The src/ directory contains the expected layers:

`app/`: Application-level logic and Next.js App Router routes (including route groups like `(auth)`, `(platform)`, `(tenant)`, and dynamic routes like `[lng]`
`db/`: Data`base-related code
`entities/`: Business entities (core business objects)
`features/`: Feature-specific business logic
`page-modules/`: Page-level modules
`shared/`: Shared utilities and code
`test/`: Test files
`types/`: TypeScript type definitions
`widgets/`: Reusable UI components

Inside `src/app/`, the structure includes:

Route groups: `(auth)`, `(platform)`, `(tenant)`
Dynamic route: [lng]
API routes: `api/`
Feature-based page directories: bookings, campaign, competition, conservation, directory, groups, guidelines, interest, maintenance, member, messages, news, notifications, privacy, proudly-soralia, resident, resources, services, settings, terms, unit
This aligns with FSD principles by organizing code around features while integrating with Next.js App Router for routing. The app/ layer here serves as both the application entry point and a container for feature-specific pages.

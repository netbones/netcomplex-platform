# Soralia Village Community Portal - PRD

## Project Overview

**Project Name:** Soralia Village Community Portal
**Type:** Single Page Application (SPA) with Prisma Backend
**Core Functionality:** A community management platform for residents of Soralia Village, enabling directory access, maintenance requests, facility booking, event management, and communication.
**Target Users:** Soralia Village residents, HOA board members, property managers, and administrators.

---

## Current State Analysis

### Existing Application (CommonJS)

- **Stack:** Static HTML/CSS/JS with Tailwind CSS CDN
- **Pages:** 10+ static HTML files (index, dashboard, directory, services, resources, conservation, resident, interest, proudly-soralia)
- **Auth:** Mock authentication UI (no real backend)
- **Data:** Hardcoded static content
- **Map:** Leaflet.js with OpenStreetMap
- **Limitations:** No real authentication, no database, no CRUD operations, no real-time features

### Problems Identified

1. No persistent user authentication
2. No database - data is hardcoded
3. No admin functionality for managing residents
4. No real-time notifications or updates
5. No facility booking system
6. No maintenance request tracking
7. Duplicate code across HTML files
8. No API for integrations

---

## Product Vision

Transform Soralia Village from a static demo into a fully functional SPA with:

- **Stack Auth** for secure user authentication
- **Prisma + Supabase PostgreSQL** for data persistence
- **Supabase Realtime** for real-time messaging
- **Modern SPA architecture** with Preact/Next.js
- **Role-based access** for residents, board members, and admins

---

## User Personas

| Persona      | Role         | Needs                                                         |
| ------------ | ------------ | ------------------------------------------------------------- |
| Resident     | Default user | View directory, submit requests, book facilities, view events |
| Board Member | Management   | Approve requests, post announcements, manage residents        |
| Admin        | Full control | User management, system configuration, analytics              |

---

## Functional Requirements

### 1. Authentication (Stack Auth)

- Email/password registration and login
- Social login (Google, Apple)
- Password reset flow
- Session management with JWT
- Role-based access control (Resident, Board, Admin)

### 2. Community Directory

- Searchable/filterable resident listings
- Profile views with contact info
- Interest-based filtering
- Privacy controls (show/hide contact info)
- Street/unit filtering

### 3. Resident Dashboard

- Personalized welcome
- Notification center
- Quick actions (maintenance, booking)
- My requests/status tracking
- Community map with personal location

### 4. Maintenance Requests

- Submit requests with category, priority, description
- Photo upload capability
- Status tracking (Submitted, In Progress, Completed)
- Notification on status changes
- History of submitted requests

### 5. Facility Booking

- Community center reservations
- Garden plot bookings
- Calendar view of availability
- Booking confirmation emails
- Cancellation/modification

### 6. Events & Announcements

- Community event calendar
- Announcement board
- RSVP functionality
- Event reminders

### 7. Admin Panel

- Resident management (CRUD)
- Maintenance request management
- Booking management
- Content management for pages
- Analytics dashboard

---

## Technical Architecture

### Stack Recommendation

| Layer      | Technology              | Justification                                             |
| ---------- | ----------------------- | --------------------------------------------------------- |
| Frontend   | Preact + Next.js        | SSR/SSG, routing, smaller bundle                          |
| Styling    | Tailwind CSS            | Already in use, efficient                                 |
| Auth       | Stack Auth              | Full auth solution, pre-built UI components               |
| Database   | PostgreSQL via Supabase | Serverless Postgres + real-time, excellent Prisma support |
| ORM        | Prisma                  | Type-safe, excellent Supabase integration                 |
| Real-time  | Supabase Realtime       | Chat/messaging, notifications                             |
| Maps       | Leaflet + Mapbox        | Continue existing implementation                          |
| Deployment | Vercel                  | Native Next.js support, zero-config                       |

### Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password      String
  name          String
  role          Role     @default(RESIDENT)
  address       String?
  unit          String?
  phone         String?
  interests     String[]
  avatar        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  requests      MaintenanceRequest[]
  bookings      Booking[]
  notifications Notification[]
}

enum Role {
  RESIDENT
  BOARD
  ADMIN
}

model MaintenanceRequest {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  category    String
  priority    Priority
  description String
  status      RequestStatus @default(SUBMITTED)
  images      String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Priority { LOW, MEDIUM, HIGH, EMERGENCY }
enum RequestStatus { SUBMITTED, IN_PROGRESS, COMPLETED }

model Booking {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  facility    String
  date        DateTime
  time        String
  status      BookingStatus @default(CONFIRMED)
  createdAt   DateTime @default(now())
}

enum BookingStatus { CONFIRMED, CANCELLED }

model Event {
  id          String   @id @default(cuid())
  title       String
  description String
  date        DateTime
  location    String
  organizer   String
  createdAt   DateTime @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## Phased Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

- Next.js project setup with Preact
- Supabase PostgreSQL database
- Prisma schema implementation
- Stack Auth integration
- Basic auth pages (login/register)

### Phase 2: Core Features (Weeks 3-4)

- User profile management
- Community directory with CRUD
- Basic dashboard with user data

### Phase 3: Business Logic (Weeks 5-6)

- Maintenance request system
- Facility booking system
- Events/announcements

### Phase 4: Admin & Polish (Weeks 7-8)

- Admin panel
- Analytics dashboard
- Performance optimization
- PWA capabilities

---

## Migration Strategy

1. **Keep existing design** - Maintain current UI/UX (Tailwind, colors, layout)
2. **Port page components** - Convert each HTML page to React components
3. **Implement API routes** - Replace static data with database queries
4. **Add auth guards** - Protect routes based on login state
5. **Deploy incrementally** - Feature flags for gradual rollout

---

## Feasibility Assessment

| Factor         | Assessment                                             |
| -------------- | ------------------------------------------------------ |
| Complexity     | Medium - Standard SPA with auth                        |
| Dependencies   | Well-supported (Next.js, Prisma, Supabase, Stack Auth) |
| Data Migration | Static demo data → JSON seed → Database                |
| Timeline       | 8-10 weeks for full implementation                     |
| Risk           | Low - Proven stack, extensive documentation            |

### Risks & Mitigations

| Risk             | Mitigation                     |
| ---------------- | ------------------------------ |
| Auth complexity  | Use NextAuth (battle-tested)   |
| Database scaling | Supabase handles automatically |
| Map performance  | Implement tile caching         |
| Offline support  | Add PWA with service workers   |

---

## Acceptance Criteria

- [ ] Users can register and log in securely
- [ ] Residents can view and search the directory
- [ ] Users can submit and track maintenance requests
- [ ] Users can book community facilities
- [ ] Admins can manage all data via admin panel
- [ ] Real-time notifications work
- [ ] Application is responsive and accessible
- [ ] Deployment pipeline is automated

---

## Appendix: Page Mapping

| Current HTML         | Target Component                      |
| -------------------- | ------------------------------------- |
| index.html           | HomePage (Directory, Map, Auth Modal) |
| dashboard.html       | DashboardPage                         |
| directory.html       | DirectoryPage                         |
| services.html        | ServicesPage                          |
| resources.html       | ResourcesPage                         |
| conservation.html    | ConservationPage                      |
| resident.html        | ProfilePage                           |
| interest.html        | InterestGroupsPage                    |
| proudly-soralia.html | CampaignPage                          |

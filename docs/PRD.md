# Soralia Village Community Portal - PRD

## Project Overview

**Project Name:** Soralia Village Community Portal
**Type:** Full-stack SPA with Next.js 14 and Supabase
**Core Functionality:** A community management platform for residents of Soralia Village, enabling directory access, maintenance requests, facility booking, interest groups, content management, and real-time communication.
**Target Users:** Soralia Village residents, HOA board members, property managers, and administrators.

---

## Current State Analysis

### Existing Application (Legacy)

- **Stack:** Static HTML/CSS/JS with Tailwind CSS CDN
- **Pages:** 10+ static HTML files (index, dashboard, directory, services, resources, conservation, resident, interest, proudly-soralia)
- **Auth:** Mock authentication UI (no real backend)
- **Data:** Hardcoded static content
- **Map:** Leaflet.js with OpenStreetMap
- **Limitations:** No real authentication, no database, no CRUD operations, no real-time features

### Current Implementation (Completed)

- **Stack:** Next.js 14 (App Router) with React + Turbopack
- **Auth:** Stack Auth integrated (with SSR handling)
- **Database:** Supabase PostgreSQL with Prisma ORM
- **Real-time:** Supabase Realtime prepared for messaging
- **Forms:** React Hook Form + Zod v3 validation
- **Rich Text:** Tiptap WYSIWYG editor
- **Package Manager:** pnpm
- **Styling:** Tailwind CSS

### Completed Work

- **Migrated Pages:** Home, Directory, Services, Resources, Conservation, Interest Groups, Proudly Soralia, Resident Profile
- **CMS Implementation:** Admin pages at /admin/content, /admin/groups with Tiptap rich text editor
- **Interest Groups:** Public hub at /groups, /groups/[id], join/leave functionality via API
- **Content API:** Full CRUD for Content model with categories (ANNOUNCEMENT, NEWS, EVENT, BLOG)
- **Database Models:** User, Group, Content, UserGroup with proper relations
- **Zod Schemas:** Validation schemas in src/lib/schemas.ts for content and group forms
- **i18n:** Added i18next with inline resources for 4 languages (en, af, xh, zu) to avoid async loading issues

### Technical Discoveries & Fixes

1. **Database URL Conflict:** `.env.local` had wrong Supabase URL that overrode `.env` - fixed by updating to pooler URL
2. **Stack Auth SSR Issues:** Had to use dynamic imports for StackHandler, wrap useSearchParams in Suspense
3. **Zod v4 + RHF Type Conflicts:** Upgraded to Zod v3, removed explicit generics from useForm to fix type inference issues
4. **Interest Groups Workflow:** Users join groups → create content (BLOG category) → posts appear on group pages
5. **Internationalization:** Added i18next with inline resources for 4 languages (en, af, xh, zu), LanguageSwitcher component

---

## Product Vision

Transform Soralia Village from a static demo into a fully functional SPA with:

- **Stack Auth** for secure user authentication
- **Prisma + Supabase PostgreSQL** for data persistence
- **Supabase Realtime** for real-time messaging
- **Next.js 16 SPA architecture** with React
- **Role-based access** for residents, board members, and admins
- **Interest Groups** - Residents can join groups and create content
- **CMS** - Admins and group members can publish content

---

## User Personas

| Persona      | Role        | Access Level                                                                           |
| ------------ | ----------- | -------------------------------------------------------------------------------------- |
| Resident     | RESIDENT    | View directory, submit requests, book facilities, join interest groups, create content |
| Owner        | OWNER       | Homeowner - full resident access + property-specific privileges                        |
| Renter       | RENTER      | Tenant - may have restricted access to certain groups/content                          |
| Group Admin  | GROUP_ADMIN | Manage own group: add/remove members, delete own group content                         |
| Committee    | COMMITTEE   | Committee duties, group admin + platform reporting access                              |
| Board Member | BOARD       | HOA Board: oversight, platform management                                              |
| Admin        | ADMIN       | SuperAdmin: user management, content moderation, suspend users, full platform access   |

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
- Grid/List view toggle
- **External Cards**: Public view (homepage, /directory) - read-only
- **Internal Cards**: Authenticated view (/dashboard/directory) - with chat/messaging

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
- Pool, gym, tennis court bookings
- Calendar view of availability
- Booking confirmation
- Cancellation/modification

### 6. Interest Groups & User Dashboard

**Groups Hub (`/groups`)**

- Search/browse groups by category (fitness, gardening, sports, etc.)
- Filter by access type (open to join, invite-only, application required)
- Filter by resident type (owners only, renters only, all)
- Join/leave groups directly from hub
- Group pages with member list

**User Dashboard (`/dashboard`)**

- Personalized breadcrumbs navigation
- Quick access to:
  - My Profile: Edit name, phone, address, avatar
  - My Interests: Select interests (gardening, fitness, sports, etc.)
  - My Groups: Manage group memberships
  - Notifications: Activity alerts
  - My Requests: Maintenance request history
  - Messages: Conversation center
  - Create Content: Blog posts for public/village access

**Interests Visualization (`/interest`)**

- React Flow network graph showing connections between residents
- Nodes = residents, Edges = shared interests
- Interactive exploration of community connections
- Click resident to view profile card

### 7. Content Management (CMS)

- Rich text editor (Tiptap) for content creation
- Categories: News, Announcement, Event, Blog
- Associate content with interest groups
- Featured/published flags
- Author attribution

### 8. Events & Announcements

- Community event calendar
- Announcement board
- RSVP functionality
- Event reminders

### 9. Admin Panel

- Resident management (CRUD)
- Maintenance request management
- Booking management
- Content management for pages (CMS)
- Interest group management
- Analytics dashboard

---

## Technical Architecture

### Stack Implementation

| Layer     | Technology              | Justification                                   |
| --------- | ----------------------- | ----------------------------------------------- |
| Frontend  | Next.js 14 + React      | App Router, SSR/SSG, Turbopack for fast builds  |
| Styling   | Tailwind CSS v3         | Already in use, efficient                       |
| Auth      | Stack Auth              | Full auth solution, pre-built UI components     |
| Database  | PostgreSQL via Supabase | Serverless Postgres + real-time, Prisma support |
| ORM       | Prisma 5                | Type-safe, excellent Supabase integration       |
| Real-time | Supabase Realtime       | Chat/messaging, notifications                   |
| Forms     | React Hook Form + Zod   | Validation with TypeScript inference            |
| Editor    | Tiptap                  | WYSIWYG rich text editing                       |
| Maps      | Leaflet + OpenStreetMap | Continue existing implementation                |
| Deploy    | Vercel                  | Native Next.js support, zero-config             |
| Package   | pnpm                    | Disk space efficient                            |

### Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  role          Role      @default(RESIDENT)
  street        String?
  unit          String?
  phone         String?
  interests     String[]
  avatar        String?
  isPublic      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  requests      MaintenanceRequest[]
  bookings      Booking[]
  notifications Notification[]
  conversations Conversation[]
  messages      Message[]
  groupMemberships UserGroup[]
  ownedGroups   Group[]
  contents     Content[]
}

enum Role {
  RESIDENT
  BOARD
  ADMIN
}

model MaintenanceRequest {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    String
  priority    Priority
  description String
  status      RequestStatus @default(SUBMITTED)
  images      String[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum Priority { LOW, MEDIUM, HIGH, EMERGENCY }
enum RequestStatus { SUBMITTED, IN_PROGRESS, COMPLETED, CANCELLED }

model Booking {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  facility    String
  date        DateTime
  startTime   String
  endTime     String
  purpose     String?
  status      BookingStatus @default(CONFIRMED)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum BookingStatus { CONFIRMED, CANCELLED, COMPLETED }

model Event {
  id          String   @id @default(cuid())
  title       String
  description String
  date        DateTime
  location    String
  organizer   String
  image       String?
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Content {
  id          String         @id @default(cuid())
  title       String
  content     String         @db.Text
  excerpt     String?
  image       String?
  category    ContentCategory
  authorId    String?
  author      User?          @relation(fields: [authorId], references: [id])
  groupId     String?
  group       Group?         @relation(fields: [groupId], references: [id])
  published   Boolean        @default(false)
  featured    Boolean        @default(false)
  priority    String         @default("normal")
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  publishedAt DateTime?
  expiresAt   DateTime?
}

enum ContentCategory {
  ANNOUNCEMENT
  NEWS
  EVENT
  BLOG
}

model Group {
  id          String   @id @default(cuid())
  name        String
  description String?
  category    String
  image       String?
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members     UserGroup[]
  contents    Content[]
}

enum GroupRole {
  MEMBER
  MODERATOR
  ADMIN
}

model UserGroup {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  groupId   String
  group     Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  role      GroupRole @default(MEMBER)
  joinedAt  DateTime  @default(now())

  @@unique([userId, groupId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  type      String
  link      String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Conversation {
  id           String    @id @default(cuid())
  name         String?
  type         ConversationType @default(DIRECT)
  participants User[]
  messages     Message[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

enum ConversationType { DIRECT, GROUP }

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation(fields: [senderId], references: [id])
  content        String
  type           MessageType  @default(TEXT)
  createdAt      DateTime     @default(now())
}

enum MessageType { TEXT, IMAGE, SYSTEM }
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

- [x] Users can register and log in securely (Stack Auth)
- [x] Residents can view and search the directory
- [x] Interest groups with join/leave functionality
- [x] CMS with Tiptap rich text editor (admin content management)
- [x] Admins can manage content and groups via admin panel
- [ ] Users can submit and track maintenance requests
- [ ] Users can book community facilities
- [ ] Real-time messaging/notifications
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

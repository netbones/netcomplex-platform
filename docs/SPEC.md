# Soralia Village - Technical Specification

## 1. Technology Stack

### Frontend

- **Framework:** Next.js 16 (App Router) with Turbopack
- **Language:** TypeScript 6
- **Styling:** Tailwind CSS v3
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **Rich Text Editor:** Tiptap
- **Maps:** Leaflet + react-leaflet

### Backend

- **Runtime:** Next.js API Routes (Serverless)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma 5
- **Authentication:** Better Auth
- **Real-time:** Supabase Realtime (for chat/messaging)

### DevOps

- **Version Control:** Git
- **CI/CD:** GitHub Actions
- **Hosting:** Vercel
- **Package Manager:** pnpm
- **Database Hosting:** Supabase (PostgreSQL + Realtime)

---

## 2. Framework Decision

### React (Default with Next.js 16)

**Why:**

1. **Next.js 16 native** - Works out of the box with Turbopack
2. **Better Auth compatibility** - No aliasing needed
3. **Full ecosystem** - All third-party components work
4. **Turbopack** - Fast dev builds and optimized production builds

---

## 3. Project Structure

```

soralia-village/
├── prisma/
│ └── schema.prisma
├── src/
│ ├── app/
│ │ ├── (auth)/
│ │ │ ├── login/page.tsx
│ │ │ └── register/page.tsx
│ │ ├── (dashboard)/
│ │ │ ├── layout.tsx
│ │ │ ├── page.tsx
│ │ │ └── directory/page.tsx
│ │ ├── (public)/
│ │ │ ├── page.tsx
│ │ │ └── services/page.tsx
│ │ ├── api/
│ │ │ ├── auth/route.ts
│ │ │ ├── users/route.ts
│ │ │ ├── requests/route.ts
│ │ │ ├── bookings/route.ts
│ │ │ └── events/route.ts
│ │ ├── layout.tsx
│ │ └── globals.css
│ ├── components/
│ │ ├── ui/
│ │ ├── auth/
│ │ ├── directory/
│ │ ├── dashboard/
│ │ └── layout/
│ ├── lib/
│ │ ├── prisma.ts
│ │ └── utils.ts
│ └── types/
│ └── index.ts
├── public/
│ └── assets/
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json

```

---

## 4. Database Schema (Prisma)

### Full Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

enum Priority {
  LOW
  MEDIUM
  HIGH
  EMERGENCY
}

enum RequestStatus {
  SUBMITTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

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

enum BookingStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
}

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

model Announcement {
  id        String   @id @default(cuid())
  title     String
  content   String
  author    String
  priority  String   @default("normal")
  createdAt DateTime @default(now())
  expiresAt DateTime?
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
  id          String       @id @default(cuid())
  name        String
  description String?
  category    String
  image       String?
  isPublic    Boolean      @default(true)
  accessType  GroupAccess  @default(OPEN)
  residentFilter ResidentFilter @default(ALL)
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  ownerId     String
  owner      User        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members    UserGroup[]
  contents   Content[]
  membershipRequests GroupMembershipRequest[]
}

enum GroupAccess {
  OPEN        // Anyone can join
  INVITE_ONLY // Requires invitation from group admin
  APPLICATION // Requires application approval
}

enum ResidentFilter {
  ALL         // All residents can join
  OWNERS_ONLY // Homeowners only
  RENTERS_ONLY // Renters only
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

model Survey {
  id          String     @id @default(cuid())
  title       String
  description String?
  type        SurveyType @default(INTERNAL)
  status      SurveyStatus @default(DRAFT)
  questions   Question[]
  responses   Response[]
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum SurveyType {
  INTERNAL   // Community polls, HOA votes
  EXTERNAL   // Third-party integration (bitlabs, cpx-research)
}

enum SurveyStatus {
  DRAFT
  ACTIVE
  CLOSED
}

model Question {
  id         String   @id @default(cuid())
  surveyId   String
  survey     Survey   @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  text       String
  type       QuestionType
  options    String[] // JSON array for MCQ options
  required   Boolean  @default(false)
  order      Int      @default(0)
  responses  Answer[]
}

enum QuestionType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  TEXT
  RATING
  YES_NO
}

model Response {
  id        String   @id @default(cuid())
  surveyId  String
  survey    Survey   @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  userId    String?  // Null for anonymous external surveys
  answers   Answer[]
  createdAt DateTime @default(now())
}

model Answer {
  id         String   @id @default(cuid())
  responseId String
  response   Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  questionId String
  value      String   // JSON string for complex answers
}

model ExternalSurvey {
  id          String   @id @default(cuid())
  name        String
  provider    String   // "bitlabs", "cpx-research", etc.
  externalId  String   // ID on external platform
  embedUrl    String   // IFrame/script embed URL
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value String
}

// Supabase Realtime for Messaging
model Conversation {
  id           String    @id @default(cuid())
  name         String?   // Group chat name, null for direct messages
  type         ConversationType @default(DIRECT)
  participants User[]
  messages     Message[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

enum ConversationType {
  DIRECT     // Two people
  GROUP      // 3+ people, community chats
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation(fields: [senderId], references: [id])
  content        String
  type           MessageType  @default(TEXT)
  readBy         MessageRead[]
  createdAt      DateTime     @default(now())
}

enum MessageType {
  TEXT
  IMAGE
  SYSTEM // "User joined chat", etc.
}

model MessageRead {
  id         String   @id @default(cuid())
  messageId  String
  message    Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId     String
  readAt     DateTime @default(now())

  @@unique([messageId, userId])
}
```

---

## 5. Authentication Specification (Better Auth)

### Better Auth Setup

```bash
npm install better-auth prisma-adapter
```

### Better Auth Configuration

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  passkey: {
    enabled: true,
  },
  emailVerification: {
    enabled: true,
  },
});
```

### Route Protection (Next.js 16 proxy.ts)

```typescript
// src/app/proxy.ts
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function proxy(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Protected routes check permissions
  // Redirect to /sign-in if unauthorized
}
```

### Auth Components (Better Auth UI)

```typescript
// src/components/auth/SignIn.tsx
"use client";
import { useAuth } from 'better-auth/react';

export function SignIn() {
  const { signIn } = useAuth();

  return (
    <button onClick={() => signIn.email({ email, password })}>
      Sign In
    </button>
  );
}
```

### Better Auth Environment Variables

```env
# Better Auth
BETTER_AUTH_SECRET="secret-key..."
BETTER_AUTH_TRUSTED_ORIGINS="https://soralia-village.vercel.app"

# Database (PostgreSQL via Supabase)
DATABASE_URL="postgresql://..."
```

---

## 6. API Endpoints

### Authentication (Better Auth)

- Handled by Better Auth SDK (no custom API needed)
- `POST /api/auth/sign-in` - Better Auth handles
- `POST /api/auth/sign-up` - Better Auth handles

### Users

- `GET /api/users` - List users (admin)
- `GET /api/users/[id]` - Get user profile
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user (admin)

### Maintenance Requests

- `GET /api/requests` - List requests (filtered by user/role)
- `POST /api/requests` - Create request
- `GET /api/requests/[id]` - Get request details
- `PATCH /api/requests/[id]` - Update request status (admin)

### Bookings

- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `DELETE /api/bookings/[id]` - Cancel booking

### Events

- `GET /api/events` - List upcoming events
- `POST /api/events` - Create event (admin)

### Surveys (Internal)

- `GET /api/surveys` - List surveys (filtered by status/type)
- `POST /api/surveys` - Create survey (admin)
- `GET /api/surveys/[id]` - Get survey with questions
- `PATCH /api/surveys/[id]` - Update survey (admin)
- `DELETE /api/surveys/[id]` - Delete survey (admin)
- `POST /api/surveys/[id]/responses` - Submit response
- `GET /api/surveys/[id]/results` - Get aggregated results (admin)

### External Surveys

- `GET /api/external-surveys` - List external integrations
- `POST /api/external-surveys` - Add external survey (admin)
- `GET /api/external-surveys/[id]/embed` - Get embed code

### Messaging (Supabase Realtime)

- `GET /api/conversations` - List user's conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]/messages` - Get messages in conversation
- `POST /api/conversations/[id]/messages` - Send message
- `PATCH /api/messages/[id]/read` - Mark message as read

### Interest Groups & User Dashboard

**Groups Hub (`/groups`)**

- `GET /api/groups` - List all groups with pagination
- `POST /api/groups` - Create new group (GROUP_ADMIN, COMMITTEE, BOARD, ADMIN)
- `GET /api/groups/[id]` - Get group with members and content
- `PATCH /api/groups/[id]` - Update group (owner/admin)
- `DELETE /api/groups/[id]` - Delete group (owner/admin)
- `POST /api/groups/members` - Join group
- `DELETE /api/groups/members` - Leave group

**User Dashboard (`/dashboard`)**

- `PATCH /api/users/profile` - Update user profile
- `PATCH /api/users/interests` - Update user interests
- `GET /api/groups/my-groups` - Get user's group memberships
- `POST /api/content` - Create content (blog post)
- `GET /api/notifications` - Get user notifications

**Interests Visualization (`/interest`)**

- React Flow network graph
- `GET /api/users/network` - Get interest connections

### Content (CMS)

- `GET /api/content` - List content (with filters: category, published, groupId)
- `POST /api/content` - Create content
- `GET /api/content/[id]` - Get content
- `PATCH /api/content/[id]` - Update content
- `DELETE /api/content/[id]` - Delete content

---

## 7. Form Validation & Schemas

### Technology

- **React Hook Form**: Uncontrolled components for optimal performance
- **Zod v3**: Schema validation with TypeScript inference

### Schema Library (`src/lib/schemas.ts`)

```typescript
import { z } from 'zod';

export const contentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  category: z.enum(['NEWS', 'ANNOUNCEMENT', 'EVENT', 'BLOG']),
  groupId: z.string().optional(),
  featured: z.boolean(),
  published: z.boolean(),
});

export const groupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: z.string().min(1),
  isPublic: z.boolean(),
});

export const maintenanceRequestSchema = z.object({
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURAL', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  description: z.string().min(10).max(2000),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
});

export const bookingSchema = z.object({
  facility: z.enum(['POOL', 'GYM', 'COMMUNITY_CENTER', 'TENNIS', 'BBQ_AREA']),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  purpose: z.string().max(500).optional(),
});
```

### Form Components Pattern

```typescript
// Use manual validation (simpler than RHF + Zod conflicts)
// Future: migrate to RHF + ZodResolver when types align

interface FormErrors {
  fieldName?: string;
}

const validate = (data: FormData): boolean => {
  const errors: FormErrors = {};
  // Validation logic
  setErrors(errors);
  return Object.keys(errors).length === 0;
};
```

---

## 8. Component Specifications

### Auth Components

- `<SignIn />` - Better Auth built-in sign-in
- `<SignUp />` - Better Auth built-in sign-up
- `<PasswordReset />` - Better Auth built-in
- `<UserButton />` - Better Auth user menu

### Directory Components

- `ResidentCard` - Grid/list item for resident (external - public view)
- `ResidentCardInternal` - Grid/list item for resident (internal - with chat/messaging)
- `ResidentGrid` - Grid view of directory
- `ResidentTable` - Table view of directory
- `SearchFilters` - Filter sidebar
- `StreetMap` - Leaflet map with markers

### Card Specifications

**External Cards (Homepage `/` & Directory `/directory` - Public)**

- Read-only view of resident information
- Shows: Name, address, avatar, role badge (Owner/Renter), interests
- Color-coded header (cycles through theme colors)
- Contact info shown if `isPublic: true`
- No interactive features beyond filtering/search

**Internal Cards (Dashboard `/dashboard/directory` - Authenticated)**

- All external card features PLUS:
- Chat/Messaging button to start conversation
- Quick action menu (view profile, send message)
- Online status indicator
- Last active timestamp
- Requires authentication to view

### Dashboard Components

- `DashboardStats` - Quick stats cards
- `NotificationList` - Recent notifications
- `RequestTracker` - Maintenance request status
- `BookingCalendar` - Facility availability
- `QuickActions` - Action buttons

### Admin Components

- `UserTable` - Manage users
- `RequestQueue` - Maintenance queue
- `Analytics` - Dashboard charts
- `ContentList` - List/manage news/articles (CMS)
- `ContentForm` - Create/edit content with Tiptap editor
- `GroupList` - List/manage interest groups
- `GroupForm` - Create/edit interest groups
- `RichTextEditor` - Tiptap-based WYSIWYG editor

### Survey Components

- `SurveyList` - List available surveys
- `SurveyBuilder` - Create/edit survey (admin)
- `SurveyTaker` - Render survey form with validation
- `SurveyResults` - View aggregated results (admin)
- `ExternalSurveyEmbed` - IFrame/script embed for external surveys
- `SurveyStatusBadge` - Active/Draft/Closed status indicator

### Chat/Messaging Components

- `ConversationList` - Sidebar with all user conversations
- `ChatWindow` - Main message view with real-time updates
- `MessageBubble` - Individual message component
- `MessageInput` - Text input with send button
- `NewChatModal` - Start new conversation
- `ChatTypingIndicator` - Show when other user is typing
- `UnreadBadge` - Badge showing unread message count

---

## 9. Environment Variables

```env
# Better Auth (Authentication only)
BETTER_AUTH_URL="https://your-domain.com"
BETTER_AUTH_SECRET="your-secret-key"

# Supabase (Database + Real-time)
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Vercel
NEXT_PUBLIC_VERCEL_URL="https://soralia-village.vercel.app"

# File Upload (optional - Cloudinary/S3)
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

---

## 10. Security Requirements

1. **Password Handling:** Better Auth manages securely
2. **Session:** Better Auth HTTP-only cookies
3. **CSRF:** Built-in Next.js protection
4. **Rate Limiting:** Vercel Edge or Upstash Redis
5. **Input Validation:** Zod schemas on all forms
6. **SQL Injection:** Prisma parameterized queries (if using external DB)
7. **XSS:** Preact auto-escaping
8. **Environment:** Secrets in environment variables, never committed

---

## 11. Supabase Realtime Configuration

### Setup

```bash
npm install @supabase/supabase-js
```

### Client Initialization

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Real-time Subscription Pattern

```typescript
// src/hooks/useMessages.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useMessages(conversationId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Initial fetch
    async function fetchMessages() {
      const { data } = await supabase
        .from('Message')
        .select('*')
        .eq('conversationId', conversationId)
        .order('createdAt', { ascending: true });
      if (data) setMessages(data);
    }
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        payload => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return messages;
}
```

### Database Setup (PostgreSQL)

```sql
-- Enable realtime on message table
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";

-- Create trigger for new messages
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_message', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON "Message"
  FOR EACH ROW EXECUTE FUNCTION handle_new_message();
```

### Message Pruning (Cron Job)

```typescript
// src/app/api/cron/prune-messages/route.ts
import { prisma } from '@/lib/prisma';

export async function POST() {
  const cutoff = new Date();
  cutoff.setDays(cutoff.getDate() - 30); // Keep 30 days

  await prisma.message.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      conversation: {
        type: 'DIRECT', // Keep group chat longer
      },
    },
  });

  return Response.json({ deleted: true });
}
```

---

## 10. Performance Targets

| Metric                 | Target                        |
| ---------------------- | ----------------------------- |
| First Contentful Paint | < 1.2s (improved with Preact) |
| Time to Interactive    | < 2.5s                        |
| Lighthouse Score       | > 90                          |
| Bundle Size            | < 80KB (Preact advantage)     |
| API Response Time      | < 200ms                       |
| Database Query Time    | < 100ms                       |

---

## 11. Deployment Configuration

### Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["cpt1"],
  "env": {
    "BETTER_AUTH_URL": "@soralia-better-auth-url",
    "BETTER_AUTH_SECRET": "@soralia-better-auth-secret"
  }
}
```

### Next.js with Preact Config

```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
    },
  },
  webpack: config => {
    // Preact aliasing for Better Auth
    Object.keys(config.resolve.alias).forEach(alias => {
      if (alias.startsWith('react')) {
        delete config.resolve.alias[alias];
      }
    });
    return config;
  },
};
```

---

## 12. Testing Strategy

| Type        | Tool              | Coverage Target |
| ----------- | ----------------- | --------------- |
| Unit        | Vitest            | > 70%           |
| Integration | Playwright        | Core flows      |
| E2E         | Playwright        | Critical paths  |
| Lint        | ESLint + Prettier | Pre-commit      |

### Critical Test Flows

1. User registration and login (Better Auth)
2. Directory search and filtering
3. Maintenance request submission
4. Facility booking flow
5. Admin user management

---

## 13. Accessibility (WCAG 2.1 AA)

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast ratio > 4.5:1
- Focus indicators visible
- Screen reader compatible
- Form error messages announced

---

## 14. Browser Support

| Browser       | Version |
| ------------- | ------- |
| Chrome        | 90+     |
| Firefox       | 88+     |
| Safari        | 14+     |
| Edge          | 90+     |
| Mobile Chrome | 90+     |
| Mobile Safari | 14+     |

---

## 15. Migration Path from Current Demo

1. **Setup** - Initialize Next.js with Preact aliasing
2. **Auth** - Integrate Better Auth SDK
3. **Components** - Port current HTML pages to React components
4. **Data** - Create Prisma schema and seed data
5. **API** - Build serverless API routes
6. **Deploy** - Push to Vercel with environment vars

---

## 16. External Service Integrations

### OpenAPI Standard

All external integrations will follow OpenAPI 3.0 specification for:

- Consistent REST API documentation
- Client SDK generation for service partners
- Version control and deprecation strategies
- Rate limiting and API key management

### Core Service Integrations

#### Healthcare & Pharmaceuticals

- Direct medication ordering from verified pharmacies
- Prescription management and delivery coordination
- Health service provider integration (physiotherapy, home nursing)
- Emergency medical information access for authorized personnel

#### Vendor Services

- Pre-vetted contractor booking system
- Service history and rating integration
- Payment processing with community fee structures
- Warranty and follow-up service tracking

#### Third-Party Payments

- Utility bill management and group purchasing
- Service provider payments with dispute resolution
- Group buying coordination for bulk purchases (Solar Panels, Bulk Energy, Internet)
- Community levy payments with transparent tracking (depends on API interface with existing Residentia site)

#### Lifestyle Services

- Gym and fitness facility partnerships
- Local business loyalty programs
- Event booking and community space management
- Transportation coordination (ride-sharing, delivery services)

#### Education Services

- College & University Digital Campus integration
- Tutoring and ExtraCurricular instruction
- Access to Textbooks & Learner Resources
- Bursary & Grant portal access

### Integration Architecture

```typescript
// Service integration pattern
interface ExternalService {
  id: string;
  name: string;
  apiBase: string;
  authType: 'api-key' | 'oauth2' | 'jwt';
  capabilities: ServiceCapability[];
}

interface ServiceCapability {
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  rateLimit: number; // requests per minute
}
```

### Configuration

```env
# Service Integrations
INTEGRATION_ENABLED=true
INTEGRATION_API_KEY=...

# Healthcare
PHARMACY_API_URL=
HEALTH_PROVIDER_API_URL=

# Vendors
CONTRACTOR_API_URL=
SERVICE_MARKETPLACE_API_URL=

# Payments
UTILITY_BILL_API_URL=
LEVY_API_URL=

# Lifestyle
GYME_API_URL=
TRANSPORT_API_URL=
```

### Security Requirements

1. **API Key Management** - Rotate keys quarterly
2. **OAuth2 Flows** - For services requiring user consent
3. **Data Encryption** - TLS 1.3 for all external traffic
4. **Audit Logging** - Track all service API calls
5. **Rate Limiting** - Per-service limits to prevent abuse

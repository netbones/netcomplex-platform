# Soralia Village - Technical Specification

## 1. Technology Stack

### Frontend

- **Framework:** Next.js 14 (App Router) with Preact
- **Language:** TypeScript
- **Styling:** Tailwind CSS (existing)
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **Maps:** Leaflet + react-leaflet

### Backend

- **Runtime:** Next.js API Routes (Serverless)
- **Database:** PostgreSQL (Supabase - includes real-time)
- **ORM:** Prisma
- **Authentication:** Stack Auth (managed auth with SDK)
- **Real-time:** Supabase Realtime (for chat/messaging)

### DevOps

- **Version Control:** Git
- **CI/CD:** GitHub Actions
- **Hosting:** Vercel (Frontend + Serverless Functions)
- **Database Hosting:** Supabase (PostgreSQL + Realtime)

---

## 2. Preact vs React Decision

### Rationale for Preact

| Factor                   | React (~40KB)     | Preact (~3KB)     | Verdict             |
| ------------------------ | ----------------- | ----------------- | ------------------- |
| Bundle Size              | ~40KB gzipped     | ~3KB gzipped      | **Preact wins**     |
| Initial Load (3G)        | ~2-3s extra       | Baseline          | **Preact wins**     |
| Android Performance      | Slower on low-end | 10x faster        | **Preact wins**     |
| Ecosystem Compatibility  | Full              | 95%+ compatible   | React wins slightly |
| Next.js Support          | Native            | Requires config   | React wins          |
| Stack Auth Compatibility | Native            | Requires aliasing | React wins slightly |

### Decision: **Preact with aliasing to React**

**Why:**

1. **Performance gains** - 22x smaller bundle, faster on mobile devices
2. **Community compatibility** - Preact provides `preact/compat` alias to React
3. **Stack Auth works** - SDK works with aliasing via Next.js config
4. **Same developer experience** - Identical API, same hooks

**Configuration:**

```javascript
// next.config.js
module.exports = {
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
    },
  },
};
```

**Trade-offs:**

- Some React-only features (Concurrent Mode, Suspense improvements) don't work
- Some third-party React components may have edge cases
- Stack Auth UI components may need minor adjustments

---

## 3. Project Structure

```
soralia-village/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── directory/page.tsx
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   └── services/page.tsx
│   │   ├── api/
│   │   │   ├── auth/route.ts
│   │   │   ├── users/route.ts
│   │   │   ├── requests/route.ts
│   │   │   ├── bookings/route.ts
│   │   │   └── events/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── auth/
│   │   ├── directory/
│   │   ├── dashboard/
│   │   └── layout/
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── public/
│   └── assets/
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

## 5. Authentication Specification (Stack Auth)

### Stack Auth Setup

```bash
npm install @stackframe/stack-server @stackframe/stack-client
```

### Stack Auth Configuration

```typescript
// src/lib/stack.ts
import { Stackserver } from '@stackframe/stack-server';

export const stackServer = new Stackserver({
  publishableKey: process.env.STACK_PUBLISHABLE_KEY || '',
  projectId: process.env.STACK_PROJECT_ID || '',
  apiKey: process.env.STACK_API_KEY || '',
});
```

### Middleware for Auth Protection

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('stack-session-token');

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin-only routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for admin role via Stack API
    // Redirect if not admin
  }

  return NextResponse.next();
}
```

### Auth Components (Stack Auth UI)

```typescript
// src/components/auth/SignIn.tsx
"use client";
import { useStack } from "@stackframe/stack-client";

export function SignIn() {
  const { signInWithOAuth, signInWithPassword } = useStack();

  return (
    <div>
      {/* Stack Auth provides pre-built components */}
      <stack-auth-sign-in />
    </div>
  );
}
```

### Stack Auth Environment Variables

```env
# Stack Auth
STACK_PUBLISHABLE_KEY="pk_live_..."
STACK_PROJECT_ID="proj_..."
STACK_API_KEY="sk_..."

# Database (if using external)
DATABASE_URL="postgresql://..."

# Optional: Use Stack's built-in database (no Prisma needed)
# STACK_DATABASE_URL will be provided by Stack Auth
```

---

## 6. API Endpoints

### Authentication (Stack Auth)

- Handled by Stack Auth SDK (no custom API needed)
- `POST /api/auth/sign-in` - Stack Auth handles
- `POST /api/auth/sign-up` - Stack Auth handles

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

---

## 7. Component Specifications

### Auth Components

- `<SignIn />` - Stack Auth built-in sign-in
- `<SignUp />` - Stack Auth built-in sign-up
- `<PasswordReset />` - Stack Auth built-in
- `<UserButton />` - Stack Auth user menu

### Directory Components

- `ResidentCard` - Grid/list item for resident
- `ResidentGrid` - Grid view of directory
- `ResidentTable` - Table view of directory
- `SearchFilters` - Filter sidebar
- `StreetMap` - Leaflet map with markers

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

## 8. Environment Variables

```env
# Stack Auth (Authentication only)
STACK_PUBLISHABLE_KEY="pk_live_..."
STACK_PROJECT_ID="proj_..."
STACK_API_KEY="sk_..."

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

## 9. Security Requirements

1. **Password Handling:** Stack Auth manages securely
2. **Session:** Stack Auth HTTP-only cookies
3. **CSRF:** Built-in Next.js protection
4. **Rate Limiting:** Vercel Edge or Upstash Redis
5. **Input Validation:** Zod schemas on all forms
6. **SQL Injection:** Prisma parameterized queries (if using external DB)
7. **XSS:** Preact auto-escaping
8. **Environment:** Secrets in environment variables, never committed

---

## 10. Supabase Realtime Configuration

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
    "STACK_PUBLISHABLE_KEY": "@soralia-stack-publishable",
    "STACK_PROJECT_ID": "@soralia-stack-project",
    "STACK_API_KEY": "@solar ia-stack-api"
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
    // Preact aliasing for Stack Auth
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

1. User registration and login (Stack Auth)
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
2. **Auth** - Integrate Stack Auth SDK
3. **Components** - Port current HTML pages to React components
4. **Data** - Create Prisma schema and seed data
5. **API** - Build serverless API routes
6. **Deploy** - Push to Vercel with environment vars

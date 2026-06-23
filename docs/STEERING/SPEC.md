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
- **Schema Management:** Prisma 5 (source of truth, migrations)
- **Query Layer:** Drizzle ORM (edge-compatible queries)
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
├── docs/
│   ├── IDENTITY_MODEL.md      # Identity & routing structure
│   ├── SPEC.md
│   └── PRD.md
├── prisma/
│   └── schema.prisma
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

## 4. Database Schema (Prisma + Drizzle)

> **Note:** Identity and seat types are defined in [IDENTITY_MODEL.md](./IDENTITY_MODEL.md).

### Dual ORM Architecture

This project uses **Prisma for schema management** and **Drizzle for queries**:

```
prisma/schema.prisma ──prisma generate──► prisma/drizzle/*.ts
       │                                              │
       │  Edit models here                            │  Used in code
       ▼                                              ▼
prisma migrate / db push                    src/lib/db.ts
       │                                              │
       ▼                                              ▼
  PostgreSQL                              Drizzle queries
```

**Why this setup?**

- Prisma: Schema definition, migrations, type safety during development
- Drizzle: Edge-compatible queries for serverless/edge functions

### Database Tables

All tables include `tenantId` for multi-tenant data isolation (NetComplex platform).

> **Canonical source of truth:** `prisma/schema.prisma` at repo root. The schema below is a curated subset of architecturally significant models. For the complete schema with all fields, enums, and indexes, see `prisma/schema.prisma` (1916 lines).

> See [IDENTITY_MODEL.md](../architecture/IDENTITY_MODEL.md) for the Household/Seat/Alias model.

> See [TIER_MODEL.md](./TIER_MODEL.md) for the module-based tier system.

### Core Schema (Curated)

```prisma
// ── User & Identity ──

model user {
  id                String   @id
  tenantId          String
  email             String   @unique
  name              String
  role              Role     @default(RESIDENT)
  isActive          Boolean  @default(true)
  phone             String?
  interests         String[]
  avatar            String?
  profileSlug       String?
  isPlatformAdmin   Boolean  @default(false)
  banned            Boolean  @default(false)
  profileData       Json?    @default("{}")
  standardSeat      StandardSeat[]
  soloSeat          SoloSeat[]
  premiumSeat       PremiumSeat?
  Profile           Profile[]
  ServiceProvider   ServiceProvider?  // linked via registration
  // ... relations omitted for brevity
}

enum Role { RESIDENT | GROUP_ADMIN | COMMITTEE | BOARD | ADMIN | AGENT | MANAGER | ASSOCIATE | PROVIDER }

// ── Seat Types (see IDENTITY_MODEL.md) ──

model StandardSeat {
  id              String   @id
  tenantId        String
  userId          String
  propertyId      String
  isPrimaryOwner  Boolean  @default(true)
  platformAddress String   @unique
  property        Property @relation(fields: [propertyId], references: [id])
  user            user     @relation(fields: [userId], references: [id])
  @@unique([userId, propertyId])
}

model SoloSeat {
  id                  String       @id
  tenantId            String
  userId              String
  platformAddress     String       @unique
  propertyId          String?
  seatType            SoloSeatType // RESIDENT | MEMBER
  isComplimentary     Boolean      @default(false)
  linkedFromProfileId String?
  property            Property?    @relation
  user                user         @relation
}

model PremiumSeat {
  id                   String   @id
  tenantId             String
  userId               String   @unique
  platformAddress      String   @unique
  subscriptionTier     String   @default("basic")
  maxProperties        Int      @default(5)
  messageRetentionDays Int      @default(30)
  tier                 String   @default("foundation")
  user                 user     @relation
  propertyPremiumSeats PropertyPremiumSeat[]
}

// ── Household & Property ──

model Property {
  id              String     @id
  tenantId        String
  platformAddress String
  street          String
  unit            String
  ownerId         String?
  standardSeat    StandardSeat[]
  households      Household[]
}

model Household {
  id            String      @id
  tenantId      String
  propertyId    String
  occupancyType OccupancyType // OWNER_OCCUPIED | RENTAL | VACANT
  status        HouseholdStatus // ACTIVE | ARCHIVED
  profiles      Profile[]
  property      Property    @relation
}

model Profile {
  id              String        @id
  tenantId        String
  householdId     String
  displayName     String
  profileAddress  String        @unique  // name.unitNNN@domain
  userId          String?
  occupantSince   DateTime
  householdRole   HouseholdRole // OCCUPANT | MINOR | FAMILY
  status          ProfileStatus
  residencyType   ResidencyType // FAMILY | RENTER | OWNER
  landlordId      String?
  household       Household     @relation
}

// ── Chat & Messaging ──

model Conversation {
  id                      String   @id
  tenantId                String
  name                    String?
  type                    ConversationType // DIRECT | GROUP | SECURE_DIRECT | SECURE_GROUP
  ConversationParticipant ConversationParticipant[]
  Message                 Message[]
}

model ConversationParticipant {
  id                String       @id
  conversationId    String
  userId            String
  lastReadAt        DateTime?
  lastReadMessageId String?
  Conversation      Conversation @relation
  user              user         @relation
  @@unique([conversationId, userId])
}

model Message {
  id             String       @id
  tenantId       String
  conversationId String
  senderId       String
  content        String
  type           MessageType  // TEXT | IMAGE | SYSTEM | VOICE | FILE
  messageVersion Int          @default(1)
  payload        Json?
  expiresAt      DateTime?
  deletedAt      DateTime?
  Conversation   Conversation @relation
  user           user         @relation
}

// ── Service Providers ──

model ServiceProvider {
  id          String   @id
  tenantId    String
  companyName String
  contactName String?
  email       String?
  trade       String
  isActive    Boolean  @default(true)
  verifications   ProviderVerification[]
  legalAgreements ProviderLegalAgreement[]
  reputation      ProviderReputation?
  merits          ProviderMerit[]
  subscriptions   ProviderSubscription[]
  transactions    PaymentTransaction[]
  revenue         RevenueRecord[]
  charges         ProviderCharge[]
  invoices        ProviderInvoice[]
}

// ── Tenant & Platform ──

model Tenant {
  id               String   @id @default(uuid())
  name             String
  slug             String   @unique
  customDomain     String?  @unique
  tier             Tier     @default(STANDARD)
  modules          Json?
  featureFlags     Json     @default("{}")
  tenantModules    TenantModule[]
}

model PlatformModule {
  id             String         @id
  key            String         @unique
  label          String
  minTier        Tier           @default(STANDARD)
  defaultEnabled Boolean        @default(false)
  tenantModules  TenantModule[]
}

model TenantModule {
  id        String         @id
  tenantId  String
  moduleKey String
  enabled   Boolean        @default(false)
  config    Json?
  module    PlatformModule @relation(fields: [moduleKey], references: [key])
  tenant    Tenant         @relation
  @@unique([tenantId, moduleKey])
}
```

> **For the complete schema** including: Auth & Sessions (account, verification, passkey, session, twoFactor), Content & Community (Content, ContentLike, Group, GroupMember, Album, Resource, ResourceVersion, Announcement), Events & Bookings (Event, EventAttendee, Booking), Maintenance (MaintenanceRequest, MaintenanceTeam, MaintenanceCategory, RequestNote, RequestHistory), Surveys (Survey, SurveySection, Question, Response), Community Services (CommunityServiceListing, CommunityServiceInquiry, CommunityServiceReview), Provider Billing (ProviderSubscription, PaymentTransaction, RevenueRecord, ProviderCharge, ProviderInvoice, SubscriptionTier), Community Merits, Competitions, Agent Access, Platform Suspensions, and all enums — see `prisma/schema.prisma`.

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

**Route Structure (per IDENTITY_MODEL.md)**

| Route                         | Type      | Description                                       |
| ----------------------------- | --------- | ------------------------------------------------- |
| `/unit/{id}`                  | Household | Standard Seat (1 per household, required)         |
| `/unit/{id}/member/{aliasId}` | Alias     | Address Alias sub-profile (up to 5 per household) |
| `/resident/{id}`              | Premium   | Premium Seat for residents (owner or tenant)      |
| `/member/{id}`                | Premium   | Premium Seat for non-resident HOA members         |

**Card Types**

- **Household Card** (`/unit/{id}`): Shows household head + alias avatar stack
- **Alias Card** (`/unit/{id}/member/{aliasId}`): Individual alias profile
- **Resident Card** (`/resident/{id}`): Premium seat holder who lives in community
- **Member Card** (`/member/{id}`): Premium seat holder (non-resident, board/committee)

#### Directory Card Layouts

**Grid View (Homepage `/`)**

- HomeImage banner at top (h-32)
- Colored header with avatar + name + address
- White body with contact info, interests
- No interactive features beyond filtering/search

**List View (Homepage `/`)**

- Colored section left (w-64) with avatar + name + address
- Content center (flex-1) with contact info + interests
- HomeImage absolute positioned right (w-48, full height)
- HomeImage only visible if user.homeImage exists

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

#### Common Features

- **Link**: Entire card is clickable based on seat type (`/unit/{id}`, `/resident/{id}`, or `/member/{id}`)
- **Hover**: Scale up + shadow increase
- **Colors**: HEADER_COLORS = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600']
- **Interests**: INTEREST_COLORS maps interest names to badge colors

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

### Tooltip System

**Technology**: Radix UI tooltips with custom styling

#### Usage Guidelines

**WHEN to use tooltips:**

- **Icon-only buttons** - Explain button action without visible text
- **Complex UI elements** - Clarify non-obvious interactions
- **Status indicators** - Explain status meanings
- **Helpful hints** - Provide additional context without cluttering UI

**WHEN NOT to use tooltips:**

- **Obvious buttons** - Don't tooltip "Save" or "Cancel" buttons
- **Mobile-first** - Avoid reliance on hover interactions
- **Critical information** - Don't hide important details in tooltips

#### Design System

**Color Variants:**

- **Default**: `bg-popover text-popover-foreground` (neutral)
- **Warning/Destructive**: `bg-yellow-100 text-yellow-800 border-yellow-200`
- **Success**: `bg-green-100 text-green-800 border-green-200`
- **Info**: `bg-blue-100 text-blue-800 border-blue-200`

**Positioning:**

- **Primary**: `side="top"` for most cases
- **Secondary**: `side="bottom"` for bottom-positioned elements
- **Fallback**: Auto-adjusts if tooltip would overflow viewport

**Animation:**

- **Fade in/out** with smooth transitions
- **Zoom effect** for modern feel
- **Slide from origin** for directional awareness

#### Accessibility

- **Keyboard navigation** - Tooltips accessible via keyboard focus
- **Screen reader support** - Proper ARIA labels and descriptions
- **Reduced motion** - Respects user's motion preferences
- **High contrast** - Sufficient color contrast ratios

#### Implementation Pattern

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/ui';

<Tooltip>
  <TooltipTrigger asChild>
    <button
      title={t('actionLabel', 'Action description')} // Fallback for no-JS
      aria-label={t('actionLabel', 'Action description')}
    >
      <i className="fas fa-icon"></i>
    </button>
  </TooltipTrigger>
  <TooltipContent side="top" className="bg-blue-100 text-blue-800">
    {t('tooltipText', 'Detailed explanation')}
  </TooltipContent>
</Tooltip>;
```

#### Provider Setup

Tooltips require `TooltipProvider` at the app root level:

```tsx
// src/app/providers.tsx
import { TooltipProvider } from '@shared/ui';

<TooltipProvider>
  <App />
</TooltipProvider>;
```

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
9. **Bot Protection:** Honeypot fields + Cloudflare Turnstile CAPTCHA
10. **User Privacy:** showEmail/showPhone settings for profile visibility

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

## 15. Logging Standards

### Overview

All error logging in the application uses **Pino** logger via the centralized logging utility in `src/lib/logging.ts`. This ensures consistent log formatting, proper error tracking, and enables centralized log management.

### Logging Utility

```typescript
// src/lib/logging.ts
import pino from 'pino';

// Root logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

// Create a child logger with component context
export function createComponentLogger(componentName: string) {
  return logger.child({ component: componentName });
}

// Legacy function for server-side API logging
export function logError(context: Record<string, unknown>, message: string, error?: unknown) {
  logger.error({ ...context, error: error instanceof Error ? error.message : error }, message);
}
```

### Usage Pattern

**DO** - Use child loggers for each module to avoid repeating component names:

```typescript
// src/components/admin/MyWidget.tsx
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('MyWidget');

export function MyWidget() {
  // ... component code ...

  try {
    await fetch('/api/data');
  } catch (error) {
    log.error({}, 'Failed to fetch data', error);
  }
}
```

**DO** - Use the correct logging API:

```typescript
// Correct: log.error(contextObject, message, error)
log.error({}, 'Failed to fetch user', error);
log.error({ userId }, 'User not found', error);

// Wrong: console.error or other patterns
console.error('Failed to fetch user:', error); // DO NOT USE
```

**DO** - Define the logger at the top of the file, outside component functions:

```typescript
// Correct - module-level logger
const log = createComponentLogger('MyComponent');

export function MyComponent() {
  // ... uses log.error() in handlers
}

// Also correct - for utility files
const log = createComponentLogger('my-utils');
export function doSomething() { ... }
```

### When to Log

Log errors in these contexts:

- API fetch failures
- Form submission errors
- Authentication errors
- Database operation failures
- Third-party service errors

### What NOT to Log

- Sensitive user data (passwords, tokens)
- Stack traces in production (Pino handles this)
- Debug information in production (use appropriate log levels)

### Environment Variables

```env
# Logging
LOG_LEVEL=info      # Trace, debug, info, warn, error, fatal
```

---

## 16. Migration Path from Current Demo

1. **Setup** - Initialize Next.js with Preact aliasing
2. **Auth** - Integrate Better Auth SDK
3. **Components** - Port current HTML pages to React components
4. **Data** - Create Prisma schema and seed data
5. **API** - Build serverless API routes
6. **Deploy** - Push to Vercel with environment vars

---

## 16. Bot Protection & Security

### Honeypot Fields

Hidden form fields that bots fill but humans don't see. Reusable across all forms.

```typescript
// src/components/ui/Honeypot.tsx
export function Honeypot({ name = 'website' }: HoneypotProps) {
  return (
    <div className="absolute -left-[9999px]" aria-hidden="true">
      <input type="text" name={name} defaultValue="" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function checkHoneypot(formData: FormData, fieldName = 'website'): boolean {
  const value = formData.get(fieldName);
  return Boolean(value && typeof value === 'string' && value.length > 0);
}
```

### Cloudflare Turnstile CAPTCHA

Privacy-friendly, free CAPTCHA for registration and key forms.

```typescript
// src/components/ui/Turnstile.tsx
export function TurnstileWidget({ siteKey, theme = 'auto', size = 'normal' }) { ... }
export function verifyTurnstile(token: string): Promise<boolean> { ... }
```

### User Privacy Settings

Users can control visibility of their contact information on public profiles.

```prisma
model User {
  // ... existing fields
  isPublic    Boolean @default(true)  // Profile visibility
  showEmail   Boolean @default(true)  // Show email on public profile
  showPhone   Boolean @default(true)  // Show phone on public profile
}
```

### Environment Variables

```env
# Cloudflare Turnstile (bot protection)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

---

## 17. External Service Integrations

### OpenAPI Standard

All external integrations will follow OpenAPI 3.1 specification for:

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

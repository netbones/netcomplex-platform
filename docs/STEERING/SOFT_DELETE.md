# Soft-Delete Policy

## Principles

1. **Soft-delete by default** — domain records are soft-deleted via `deletedAt` timestamp (nullable `DateTime`). Hard deletes are exceptional.
2. **Hard-delete for auth, ledger, and join tables** — records that must never be recovered or that represent immutable facts.
3. **Soft-deleted records are excluded from all user-facing queries** — enforced at the query level (no global middleware).
4. **Hard deletes require admin role + audit trail** — logged with actor ID, target table, target ID, and reason.
5. **Parent-child consistency** — if a parent model soft-deletes, its children should also support soft-delete (or vice-versa, children should handle orphaned parent references).

## When to Soft-Delete vs Hard-Delete

| Category                                                                                                                               | Strategy                      | Rationale                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Domain entities** (Content, Event, Booking, Property, ServiceProvider, Conversation, Message, Group, Survey, DisputeCase, etc.)      | `deletedAt`                   | User-facing data that may need recovery. Admins can restore.                                              |
| **Auth & identity** (user, account, session, passkey, twoFactor, verification)                                                         | **Hard-delete**               | Never soft-deleted. Users are suspended via `PlatformSuspension` or `banned` flags, not deleted.          |
| **Join / junction tables** (EventAttendee, ConversationParticipant, ContentLike, GroupMember) | **Soft-delete** (`deletedAt`) | Pure associations that track user actions. Soft-delete preserves audit trail (e.g., attendee cancelled). See §Resolved Parent-Child Inconsistencies below. |
| **Billing join tables** (PropertyPremiumSeat)                                                                                            | **Hard-delete**               | Billing construct with no audit value post-cleanup. No `deletedAt` column.                                      |
| **Immutable ledger / audit trails** (WalletTransaction, RequestHistory, PaymentTransaction, RevenueRecord, DisputeEvent, AiUsageEvent) | **Hard-delete**               | Immutable records of past events. Never deleted in practice; hard-delete only via legal/compliance purge. |
| **Reference / config data** (PlatformModule, SubscriptionTier, AiCapabilityCost, TaxRate, TaxJurisdiction)                             | **Hard-delete or `isActive`** | Static lookup tables. Soft-delete adds no value; use `isActive` flag if status tracking is needed.        |
| **Auth sub-records** (UserKey, UserDevice, AgentToken, AssistSession)                                                                  | `revokedAt` or `deletedAt`    | `revokedAt` is preferred for tokens/sessions (semantic: "this was revoked, not deleted").                 |
| **Seats** (PremiumSeat, SoloSeat, StandardSeat)                                                                                        | `archivedAt` + `status`       | Status-based lifecycle (ACTIVE → ARCHIVED). `archivedAt` serves the same purpose as `deletedAt`.          |
| **Address / Handle**                                                                                                                   | `status` enum                 | Status-based soft-delete (`DELETED`, `RELEASED`) with explicit lifecycle.                                 |
| **Soft-delete NOT suitable** (BillingPlan, BillingAdjustment, Coupon, DataRevenueStream)                                               | `isActive`                    | Boolean flag is sufficient for toggling availability; no recovery timeline needed.                        |

## Models With `deletedAt` (62 models)

```typescript
(AchievementDefinition,
  AgentAccess,
  AgentProfile,
  Album,
  Announcement,
  Booking,
  Bursary,
  BursaryField,
  CommunityMerit,
  CommunityServiceInquiry,
  CommunityServiceListing,
  CommunityServiceReview,
  Competition,
  CompetitionEntry,
  Content,
  ContentLike,
  Conversation,
  ConversationParticipant,
  DisputeCase,
  DisputeEvent,
  DisputeEvidence,
  DisputeMessage,
  DisputeMessageVersion,
  DisputeNotification,
  Event,
  EventAttendee,
  ExternalSurvey,
  Group,
  GroupMember,
  GroupMembershipRequest,
  Household,
  InternalMaintenanceNote,
  Invitation,
  MaintenanceCategory,
  MaintenanceRequest,
  MaintenanceTeam,
  Member,
  Message,
  Notification,
  PaymentTransaction,
  PlatformSuspension,
  Profile,
  Property,
  PropertyListing,
  ProviderCharge,
  ProviderInvoice,
  ProviderLegalAgreement,
  ProviderMerit,
  ProviderReputation,
  ProviderSubscription,
  ProviderVerification,
  Question,
  RequestNote,
  Resource,
  ResourceVersion,
  Response,
  RevenueRecord,
  ServiceBooking,
  ServiceProvider,
  Setting,
  Survey,
  SurveySection);
```

## Models Using Alternative Soft-Delete Mechanisms

| Pattern                 | Models                                                 |
| ----------------------- | ------------------------------------------------------ |
| `archivedAt` + `status` | PremiumSeat, SoloSeat, StandardSeat                    |
| `revokedAt`             | AgentToken, AssistSession, UserKey, ResidentDelegation |
| `status` enum           | Address (DELETED), Handle (RELEASED)                   |
| `isActive` boolean      | BillingPlan, Coupon, TaxRate, DataRevenueStream        |

## Query Pattern (Drizzle)

```typescript
import { isNull } from 'drizzle-orm';
import { content } from '@/db/schema/content';

// Fetch non-deleted records
await db.select().from(content).where(isNull(content.deletedAt));

// Or use the shared helper (preferred):
import { notDeleted } from '@/shared/api/db';
await db.select().from(content).where(notDeleted(content));
```

## Resolved Parent-Child Inconsistencies

All 6 known parent-child mismatches from migration `20260702040000` are now resolved. The following child models received `deletedAt`:

| Parent             | Children                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event              | EventAttendee                                                                                                                                                             |
| Conversation       | ConversationParticipant                                                                                                                                                   |
| MaintenanceRequest | RequestNote                                                                                                                                                               |
| ServiceProvider    | ProviderVerification, ProviderLegalAgreement, ProviderReputation, ProviderMerit, ProviderSubscription, PaymentTransaction, ProviderCharge, ProviderInvoice, RevenueRecord |
| DisputeCase        | DisputeEvent, DisputeNotification                                                                                                                                         |
| DisputeMessage     | DisputeMessageVersion                                                                                                                                                     |

## Admin Hard Delete

Hard deletion requires explicit `DELETE` privilege and is gated behind admin role check:

```typescript
if (session.user.role !== 'ADMIN') {
  return { error: 'FORBIDDEN' };
}
```

All hard deletes are logged to the audit trail with actor ID, target table, target ID, and reason.

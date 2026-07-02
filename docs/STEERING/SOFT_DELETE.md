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
| **Join / junction tables** (EventAttendee, ConversationParticipant, PropertyPremiumSeat)                                               | **Hard-delete**               | Pure associations. Deleting the parent cleans up the join.                                                |
| **Immutable ledger / audit trails** (WalletTransaction, RequestHistory, PaymentTransaction, RevenueRecord, DisputeEvent, AiUsageEvent) | **Hard-delete**               | Immutable records of past events. Never deleted in practice; hard-delete only via legal/compliance purge. |
| **Reference / config data** (PlatformModule, SubscriptionTier, AiCapabilityCost, TaxRate, TaxJurisdiction)                             | **Hard-delete or `isActive`** | Static lookup tables. Soft-delete adds no value; use `isActive` flag if status tracking is needed.        |
| **Auth sub-records** (UserKey, UserDevice, AgentToken, AssistSession)                                                                  | `revokedAt` or `deletedAt`    | `revokedAt` is preferred for tokens/sessions (semantic: "this was revoked, not deleted").                 |
| **Seats** (PremiumSeat, SoloSeat, StandardSeat)                                                                                        | `archivedAt` + `status`       | Status-based lifecycle (ACTIVE → ARCHIVED). `archivedAt` serves the same purpose as `deletedAt`.          |
| **Address / Handle**                                                                                                                   | `status` enum                 | Status-based soft-delete (`DELETED`, `RELEASED`) with explicit lifecycle.                                 |
| **Soft-delete NOT suitable** (BillingPlan, BillingAdjustment, Coupon, DataRevenueStream)                                               | `isActive`                    | Boolean flag is sufficient for toggling availability; no recovery timeline needed.                        |

## Models With `deletedAt` (47 models)

```typescript
(Profile,
  Member,
  Notification,
  ServiceBooking,
  AgentProfile,
  Setting,
  Property,
  Household,
  PropertyListing,
  Invitation,
  Conversation,
  Message,
  Content,
  ContentLike,
  Group,
  GroupMember,
  GroupMembershipRequest,
  Album,
  Resource,
  ResourceVersion,
  Announcement,
  Event,
  Booking,
  MaintenanceRequest,
  MaintenanceTeam,
  MaintenanceCategory,
  BursaryField,
  InternalMaintenanceNote,
  ServiceProvider,
  CommunityServiceInquiry,
  CommunityServiceListing,
  CommunityServiceReview,
  Survey,
  Question,
  Response,
  SurveySection,
  ExternalSurvey,
  CommunityMerit,
  Competition,
  CompetitionEntry,
  AgentAccess,
  PlatformSuspension,
  AchievementDefinition,
  DisputeCase,
  DisputeEvidence,
  DisputeMessage,
  Bursary);
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

## Known Parent-Child Inconsistencies

These parent-child pairs have mismatched delete strategies. Tracked for follow-up:

| Parent                         | Child                                           | Issue                                                                     |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Event (deletedAt)              | EventAttendee (hard-delete)                     | Attendees orphaned on event soft-delete                                   |
| Conversation (deletedAt)       | ConversationParticipant (hard-delete)           | Participants orphaned on conversation soft-delete                         |
| MaintenanceRequest (deletedAt) | RequestNote (hard-delete)                       | Notes orphaned — but InternalMaintenanceNote has deletedAt (inconsistent) |
| ServiceProvider (deletedAt)    | 9 children\* (hard-delete)                      | Verifications, subscriptions, transactions orphaned                       |
| DisputeCase (deletedAt)        | DisputeEvent, DisputeNotification (hard-delete) | Events and notifications orphaned                                         |
| DisputeMessage (deletedAt)     | DisputeMessageVersion (hard-delete)             | Version history orphaned                                                  |

_\*ProviderVerification, ProviderLegalAgreement, ProviderReputation, ProviderMerit, ProviderSubscription, PaymentTransaction, ProviderCharge, ProviderInvoice, RevenueRecord_

## Admin Hard Delete

Hard deletion requires explicit `DELETE` privilege and is gated behind admin role check:

```typescript
if (session.user.role !== 'ADMIN') {
  return { error: 'FORBIDDEN' };
}
```

All hard deletes are logged to the audit trail with actor ID, target table, target ID, and reason.

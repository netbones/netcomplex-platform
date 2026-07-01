# Soft-Delete Policy

## Principles

- Records are soft-deleted via a `deletedAt` timestamp (nullable `DateTime`)
- Soft-deleted records are excluded from all user-facing queries
- Hard deletes are reserved for legal/compliance data purge only (with audit trail)

## Query Pattern

All data-access functions filter `deletedAt: null` at the query level:

```typescript
await db.query.Content.findMany({
  where: eq(Content.deletedAt, null),
});
```

Services with `deletedAt` column:

- Content
- Event
- Booking
- MaintenanceRequest
- Message
- Notification
- Survey
- ExternalSurvey
- Poll
- PollOption
- Listing
- Refund
- SignupToken

## Admin Hard Delete

Hard deletion requires explicit `DELETE` privilege and is gated behind admin role check:

```typescript
if (session.user.role !== 'ADMIN') {
  return { error: 'FORBIDDEN' };
}
```

All hard deletes are logged to the audit trail with actor ID, target table, target ID, and reason.

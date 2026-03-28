# Notification System Research

## Current State

The project has a basic `Notification` model in Prisma but no actual notification delivery system.

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)
  title     String
  message   String
  type      String
  link      String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

## Notification Types Needed

1. **In-App Notifications** - Real-time alerts in the app
2. **Email Notifications** - For important events, announcements
3. **SMS Notifications** - For emergencies (South Africa context)

## Approaches to Research

### Option A: Build Custom (In-House)

**Pros:**

- Full control over design/behaviour
- No external dependencies
- Use existing Supabase Realtime for real-time

**Cons:**

- Development time
- Email/SMS delivery needs provider integration

### Option B: notifme-sdk

**Pros:**

- Unified API for email, SMS, push, webpush
- Multiple provider support (SendGrid, Twilio, etc.)
- MIT licensed, active maintenance

**Cons:**

- Only handles sending, not in-app UI
- No real-time delivery (just API)

### Option C: Novu (Open Source)

**Pros:**

- Complete notification infrastructure
- In-app UI components ready
- Multi-channel (email, SMS, push, in-app)
- Self-hostable
- Real-time via WebSocket

**Cons:**

- More complex setup
- Additional service to maintain

### Option D: MagicBell

**Pros:**

- Ready-made React components
- Real-time included
- Email/SMS via integrations

**Cons:**

- Paid service (free tier limited)
- Less control

## Recommendation

For Soralia Village (180 homes, community use):

1. **In-App**: Build custom using Supabase Realtime + existing Notification model
2. **Email**: Use existing email provider (if any) or add later
3. **SMS**: Add later when needed (emergency contacts already in DB)

This keeps dependencies minimal while using what we already have (Supabase).

## Implementation Notes

- Use Supabase Realtime to subscribe to notifications for logged-in users
- Create notification preferences (allow/deny by type)
- Notification types: maintenance_update, booking_confirmation, new_message, announcement, group_update

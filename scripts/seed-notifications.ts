/**
 * Seed notifications for Phase 122 NotificationLink E2E testing.
 *
 * Inserts idempotent notification records with /properties/... link fields
 * so deep-link workspace switching can be exercised. Uses PUT /api/notifications
 * which respects Idempotency-Key — safe to run multiple times.
 *
 * Usage: npx tsx scripts/seed-notifications.ts
 */

const BASE = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000';

const SEEDS = [
  {
    idempotencyKey: 'seed-122-deep-link-palm-avenue',
    title: 'Maintenance update: 14 Palm Avenue',
    message: 'New maintenance request created for 14 Palm Avenue — roof inspection scheduled.',
    type: 'maintenance',
    link: '/properties/palm-avenue-14',
    read: false,
  },
  {
    idempotencyKey: 'seed-122-deep-link-sunset-close',
    title: 'Booking confirmed: 22 Sunset Close',
    message: 'Your booking at 22 Sunset Close has been confirmed.',
    type: 'booking',
    link: '/properties/sunset-close-22',
    read: false,
  },
  {
    idempotencyKey: 'seed-122-deep-link-oak-lane',
    title: 'Document uploaded: 8 Oak Lane',
    message: 'A new inspection document was uploaded for 8 Oak Lane.',
    type: 'document',
    link: '/properties/oak-lane-8',
    read: false,
  },
  {
    idempotencyKey: 'seed-122-deep-link-maple-drive',
    title: 'Message from owner: 5 Maple Drive',
    message: 'You have a new message from the property owner at 5 Maple Drive.',
    type: 'message',
    link: '/properties/maple-drive-5',
    read: false,
  },
];

async function main() {
  for (const seed of SEEDS) {
    const res = await fetch(`${BASE}/api/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': seed.idempotencyKey,
      },
      body: JSON.stringify({
        ...seed,
        idempotencyKey: seed.idempotencyKey,
      }),
    });

    const status = res.status;
    const body = await res.json().catch(() => ({}));

    if (status === 200 && body.success) {
      console.log(`✓ ${seed.title}`);
    } else {
      console.log(`✗ ${seed.title} (${status}):`, body);
    }
  }
}

main().catch(console.error);

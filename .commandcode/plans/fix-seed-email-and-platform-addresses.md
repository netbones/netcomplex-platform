# Fix seed email + platform address patterns

## Context

The current seed data uses the **tenant domain** (`@soralia.org`, `@solarisheights.org`)
as the `user.email` value. That's wrong: the production signup flow expects a real
personal email (what a person types at signup), with the tenant domain reserved
for **platform addresses** bound to a property or seat.

Three platform-address fields are also wrong:

| Field | Current (wrong) | Should be |
|---|---|---|
| `user.email` | `john.smith@soralia.org` (tenant domain) | `john.smith@example.com` (real personal email) |
| `StandardSeat.platformAddress` | `john.unit012@soralia.org` (user-prefixed) | `unit012@soralia.org` (= property's address) |
| `Profile.profileAddress` | `john.unit012@soralia.org` (same as seat) | `john.smith.12@soralia.org` (per `identity.ts:836`) |

This aligns the seed with how the application actually creates users at runtime
(see `src/server/routers/identity.ts:836` for the profile format, and
`src/app/api/premium/portfolio/route.ts:84` for the vanity-address pattern).

The `.example` TLD is reserved by RFC 2606, so it can't collide with real users.

## Changes

### 1. `scripts/seed-data/soralia-village.ts`

For every `user`, change `email` from `@soralia.org` to `@example.com` (12 users
plus 6 service-provider users = 18 total). For service providers, also rename
the email so it doesn't look like a tenant-internal address:

- `gardener.mike@soralia.org` to `mike.johnson.gardener@example.com`
- `plumber.susan@soralia.org` to `susan.van.der.merwe@example.com`
- `electrician.peter@soralia.org` to `peter.nkosi@example.com`
- `cleaner.linda@soralia.org` to `linda.fourie@example.com`
- `hoa.services@soralia.org` to `hoa.services@example.com`
- `trusted.plumbing@soralia.org` to `cape.plumbing@example.com`

For `StandardSeat.platformAddress`, change from `name.unitNNN@tenant` to the
property's own address:

- `john.unit012@soralia.org` to `unit012@soralia.org` (matches `prop-001.platformAddress`)
- `sarah.unit008@soralia.org` to `unit008@soralia.org`
- `michael.unit003@soralia.org` to `unit003@soralia.org`
- `robert.unit005@soralia.org` to `unit005@soralia.org` (twice - for Robert and Anna, both on `prop-004`)
- `priya.unit017@soralia.org` to `unit017@soralia.org`
- `marcus.unit022@soralia.org` to `unit022@soralia.org`

For `Profile.profileAddress`, change to the format from `identity.ts:836`:
`${displayName.toLowerCase().replace(/\s+/g, '.')}.${property.unit}@${tenantDomain}`

- `john.unit012@soralia.org` to `john.smith.12@soralia.org`
- `emma.unit012@soralia.org` to `emma.williams.12@soralia.org`
- `sarah.unit008@soralia.org` to `sarah.mitchell.8@soralia.org`
- `michael.unit003@soralia.org` to `michael.chen.3@soralia.org`
- `lisa.unit003@soralia.org` to `lisa.chen.3@soralia.org`
- `anna.unit005@soralia.org` to `anna.patel.5@soralia.org`
- `priya.unit017@soralia.org` to `priya.naidoo.17@soralia.org`
- `marcus.unit022@soralia.org` to `marcus.johnson.22@soralia.org`
- `james.unit022@soralia.org` to `james.okonkwo.22@soralia.org`
- `fatima.unit017@soralia.org` to `fatima.hassan.17@soralia.org`

### 2. `scripts/seed-data/solaris-heights.ts`

Same pattern. 16 users total.

For `user.email`:
- `thandi.mokoena@solarisheights.org` to `thandi.mokoena@example.com`
- (and 15 more - every `*@solarisheights.org` user)

For service providers with mixed domains, normalize all to `@example.com`:
- `electric.mike@solarisheights.org` to `mike.electric@example.com`
- `lift.tech@solarisheights.org` to `capelift.services@example.com`
- `gardener.svc@solarisheights.org` to `urban.garden.svc@example.com`
- `cleaning.svc@solarisheights.org` to `shine.cleaning@example.com`

For `StandardSeat.platformAddress`, use the property's `platformAddress`:
- `thandi.a101@solarisheights.org` to `a101@solarisheights.org`
- `lerato.a201@solarisheights.org` to `a201@solarisheights.org`
- (and 9 more)

For `Profile.profileAddress`:
- `thandi.a101@solarisheights.org` to `thandi.mokoena.101@solarisheights.org`
- `lerato.a201@solarisheights.org` to `lerato.khumalo.201@solarisheights.org`
- (and 9 more)

### 3. `scripts/seed-data/types.ts`

Update the `ProfileInput.profileAddress` field doc comment to call out the
correct format, so future tenants get it right.

## Verification

1. `pnpm exec tsc --noEmit` - confirm no new type errors in the seed files.
2. Re-run `pnpm db:seed` - should now hit the `Property_street_unit_key` unique
   constraint that previously blocked inserts (pre-existing dev DB has legacy
   data with the same `(street, unit)` pairs as the new seed). This is a
   separate cleanup issue documented in the previous turn, not a regression
   from these changes.
3. Spot-check one row in the DB: `select id, email, tenantId from "user" where id = 'soralia-user-john-smith'` - should show `john.smith@example.com`.
4. Spot-check a StandardSeat: `select id, "platformAddress" from "standardSeat" where id = 'soralia-seat-john'` - should show `unit012@soralia.org`.
5. Spot-check a Profile: `select id, "profileAddress" from profile where id = 'soralia-prof-john'` - should show `john.smith.12@soralia.org`.

## Out of scope

- The `Property_street_unit_key` unique constraint that conflates tenants - needs a
  schema migration. Documented separately.
- Legacy `prisma/seed.ts` data with un-prefixed IDs (e.g. `user-john-smith`,
  `prop-001`) sitting in the dev DB - needs a cleanup script before re-seeding
  will succeed end-to-end.
- The DB-vs-schema drift on `updatedAt` defaults - schema has `defaultNow()` but
  the live column has no default. Not blocking this change; the orchestrator
  already passes `updatedAt` explicitly.

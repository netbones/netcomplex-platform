# Profile URL Guide

## Overview

This document describes how SEO-friendly profile URLs are implemented in the platform using slugs instead of numeric IDs.

## Profile Slug Feature

### Purpose

Public profile URLs use readable, SEO-friendly slugs instead of numeric UUIDs:

- ❌ `/member/abc123-def456-ghi789`
- ✅ `/member/sarah-johnson-k8m2`

### Implementation

#### Database Field

Added `profileSlug` field to the User model in `prisma/schema.prisma`:

```prisma
model user {
  // ... other fields
  profileSlug String?  // SEO-friendly public profile URL
}
```

#### Slug Generation Utility

Created `src/lib/slug.ts` with the following functions:

| Function                       | Description                  | Example               |
| ------------------------------ | ---------------------------- | --------------------- |
| `generateWordSlug(3)`          | Random word slug             | `brave-blue-water`    |
| `generateNameSlug(name)`       | Name-based slug              | `sarah-johnson`       |
| `generateUniqueNameSlug(name)` | Name + random suffix         | `sarah-johnson-k8m2`  |
| `generateHybridSlug(name)`     | Name + random noun           | `sarah-johnson-river` |
| `generateProfileSlug(name?)`   | Main function (auto-chooses) | `sarah-johnson-7x2k`  |
| `isValidSlug(slug)`            | Validate slug format         | `true`                |

#### Usage

```typescript
import { generateProfileSlug, generateUniqueNameSlug } from '@/lib/slug';

// Generate from user name (recommended)
const slug = generateProfileSlug(user.name);
// Output: "sarah-johnson-7x2k"

// Or generate randomly (if no name available)
const randomSlug = generateProfileSlug();
// Output: "brave-blue-water"

// Validate a slug
const isValid = isValidSlug('sarah-johnson-k8m2'); // true
const isValid2 = isValidSlug('invalid@slug!'); // false
```

### Word Lists

The slug generator uses curated word lists in `src/lib/slug.ts`:

- **Adjectives**: brave, calm, eager, gentle, happy, jolly, kind, lively, merry, nice, proud, quick, smart, sweet, warm, wise, bold, cool, fair, free, good, bright, clean, dry, easy, fast, fine, fresh, gold, green, light, new, open, peace, quiet, rich, safe, soft, strong, tall, young, clear...
- **Nouns**: water, sky, sun, moon, star, cloud, tree, flower, forest, mountain, river, ocean, beach, garden, field, bird, fish, lion, bear, fox, rabbit, deer, horse, cat, dog, apple, orange, grape, book, song, dance, art, rain, snow, wind, fire, stone, leaf, seed...

## Route Structure

### Current Routes (Numeric ID)

| Route                           | Component                                       | Description         |
| ------------------------------- | ----------------------------------------------- | ------------------- |
| `/member/[id]`                  | `src/app/member/[id]/page.tsx`                  | Solo Seat profile   |
| `/resident/[id]`                | `src/app/resident/[id]/page.tsx`                | Resident profile    |
| `/unit/[id]`                    | `src/app/unit/[id]/page.tsx`                    | Household/unit page |
| `/unit/[id]/member/[profileId]` | `src/app/unit/[id]/member/[profileId]/page.tsx` | Occupant profile    |

### Updating to Use Slugs

To update routes to use slugs:

1. **Add lookup by slug** in tRPC router:

   ```typescript
   // In identity router
   getSoloSeatBySlug: publicProcedure
     .input(z.object({ slug: z.string() }))
     .query(async ({ ctx, input }) => {
       const user = await db.query.users.findFirst({
         where: eq(users.profileSlug, input.slug),
       });
       // ... return profile
     });
   ```

2. **Update page to accept slug**:

   ```typescript
   // src/app/member/[slug]/page.tsx
   // Rename [id] folder to [slug]
   const { slug } = params;
   const { data } = trpc.identity.getSoloSeatBySlug.useQuery({ slug });
   ```

3. **Add slug generation on user updates**:
   - When user updates their name
   - On initial user creation
   - Via admin batch migration for existing users

### Best Practices

1. **Always generate unique slugs** — Add random suffix to avoid collisions
2. **Regenerate on name change** — When user updates their name
3. **Keep legacy ID routes** — For backward compatibility, support both slug and ID
4. **Add slug to user creation** — Generate automatically when creating new users
5. **Index the column** — Add database index on `profileSlug` for fast lookups

### Migration for Existing Users

To generate slugs for existing users:

```typescript
// In a migration script
import { generateProfileSlug } from '@/lib/slug';

const users = await db.query.users.findMany({
  where: isNull(users.profileSlug),
});

for (const user of users) {
  await db
    .update(users)
    .set({ profileSlug: generateProfileSlug(user.name) })
    .where(eq(users.id, user.id));
}
```

---

_Last Updated: 2026-04-07_

## Problem statement:

src/app/(tenant)/dashboard/admin/page.tsx does NOT exist — the admin space currently renders through src/app/(tenant)/dashboard/[space]/page.tsx , this is an important observation, we need to consider how our admin system is interacting with dashboard spaces? Please advise on how to resolve this contradiction?

## The Contradiction

The current routing works like this:

```
/dashboard/[space]/page.tsx
  ↓
validates space slug against SPACE_SLUGS
  ↓
renders <SpaceLayout spaceId={space} />
  ↓
SpaceLayout reads userWidgets[spaceId] from widget store
  ↓
renders widget grid
```

Every space — including `admin` — goes through this single dynamic route. There is no `admin/page.tsx`. The 30-04 SUMMARY references creating `src/app/(tenant)/dashboard/admin/[domain]/page.tsx` (which does exist) but the admin _space_ itself (`/dashboard/admin`) is just `[space]` with `space = 'admin'`.

The AdminLayer plan assumed `admin/page.tsx` exists as a dedicated file that could be swapped out. It doesn't. The admin space is rendered by the same `SpaceLayout` path as every other space.

---

## Why This Matters

The `[space]/page.tsx` file almost certainly looks something like this:

```tsx
export default function SpacePage({ params }: { params: { space: string } }) {
  const space = resolveSpace(params.space); // validates against SPACE_SLUGS
  if (!space) return <NotFound />;

  return (
    <ErrorBoundary>
      <SpaceLayout spaceId={params.space} />
    </ErrorBoundary>
  );
}
```

It has no knowledge of _which_ space it's rendering — it delegates everything to `SpaceLayout`. There's no branch for admin.

The admin domain sub-pages at `/dashboard/admin/[domain]` work differently — they exist as actual files _beneath_ the `admin` path segment, so Next.js resolves them before trying `[space]`. But `/dashboard/admin` itself hits `[space]`.

---

## Three Options

### Option A — Conditional render inside `[space]/page.tsx`

Add a branch in the dynamic route for the admin space:

```tsx
export default function SpacePage({ params }) {
  const { space } = params;

  if (!SPACE_SLUGS.includes(space)) return <NotFound />;

  // Admin space gets its own component
  if (space === 'admin') {
    return (
      <ErrorBoundary>
        <AdminLayer />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SpaceLayout spaceId={space} />
    </ErrorBoundary>
  );
}
```

**Pros:** Minimal change. One file touched. No routing changes. The admin domain pages at `admin/[domain]` continue working unchanged.

**Cons:** The `[space]/page.tsx` file starts accumulating space-specific logic. If `home` also gets a custom component (HomeLayer is already different from a widget grid), this file becomes a router-in-a-router. It's a pattern that tends to grow.

---

### Option B — Dedicated `admin/page.tsx` route file

Create `src/app/(tenant)/dashboard/admin/page.tsx` as an actual Next.js route file. Next.js resolves static segments before dynamic ones, so `admin/page.tsx` wins over `[space]/page.tsx` when the URL is exactly `/dashboard/admin`. The `[space]` route continues handling `services`, `community`, `messages`, `home`.

```tsx
// src/app/(tenant)/dashboard/admin/page.tsx
export default function AdminSpacePage() {
  return (
    <ErrorBoundary>
      <AdminLayer />
    </ErrorBoundary>
  );
}
```

**Pros:** Clean separation. Each space that needs custom behaviour gets its own file. `[space]/page.tsx` stays generic and only handles the spaces that genuinely are just widget grids. Aligns with how Next.js App Router is designed — static routes over dynamic routes.

**Cons:** You need to ensure `[space]/page.tsx` doesn't also match `admin` and conflict. It won't — Next.js static-over-dynamic resolution handles this — but the team needs to understand the routing model clearly.

**Important:** The existing `admin/[domain]/page.tsx` already lives at this path, meaning the `admin/` directory already exists in the filesystem. Adding `admin/page.tsx` alongside `admin/[domain]/page.tsx` is straightforward and consistent with how the directory is already structured.

---

### Option C — Refactor `[space]/page.tsx` into a space renderer registry

A more architectural approach: instead of hardcoding space names in conditionals, create a `SPACE_RENDERERS` map:

```typescript
// src/widgets/dashboard/model/space-renderers.ts
export const SPACE_RENDERERS: Partial<Record<SpaceId, React.ComponentType>> = {
  admin: AdminLayer,
  home: HomeLayer, // if home also needs custom rendering
};
```

Then `[space]/page.tsx` becomes:

```tsx
export default function SpacePage({ params }) {
  const { space } = params;
  if (!SPACE_SLUGS.includes(space)) return <NotFound />;

  const CustomRenderer = SPACE_RENDERERS[space as SpaceId];
  if (CustomRenderer)
    return (
      <ErrorBoundary>
        <CustomRenderer />
      </ErrorBoundary>
    );

  return (
    <ErrorBoundary>
      <SpaceLayout spaceId={space} />
    </ErrorBoundary>
  );
}
```

**Pros:** Clean, extensible, no file proliferation. Adding a custom space renderer is a one-line change in the registry. `[space]/page.tsx` never accumulates inline conditionals.

**Cons:** Slightly more indirection. Requires understanding the registry pattern. Also still keeps everything in the dynamic route rather than using Next.js's own static-over-dynamic resolution.

---

## Recommendation

**Option B for the admin space specifically, Option C as the general pattern going forward.**

Here's the reasoning:

The `admin/` directory already exists (because of `admin/[domain]/`). Adding `admin/page.tsx` is the most natural Next.js expression of "this route is special." It requires zero refactoring of `[space]/page.tsx`, zero new abstractions, and is immediately obvious to anyone reading the file tree.

But the `[space]/page.tsx` file will eventually need to handle `home` as a custom render too (HomeLayer vs widget grid). When that moment comes, rather than adding a second conditional, introduce the `SPACE_RENDERERS` registry at that point. The registry pattern is the right long-term answer — just not worth the complexity of introducing it solely for the admin space today.

**So the resolution for your plan is:**

1. Add `src/app/(tenant)/dashboard/admin/page.tsx` as a real route file rendering `<AdminLayer />`. Next.js will prefer it over `[space]` for the URL `/dashboard/admin`.

2. No changes needed to `[space]/page.tsx` — it continues handling the other four spaces generically.

3. Update the plan task 4 to reflect this — the file being _created_ rather than _modified_.

4. Add a note in the plan (or in an ADR) documenting why `admin/page.tsx` exists alongside `[space]/page.tsx` so the next developer doesn't think it's a mistake and delete it.

One line to add to the verify step: confirm that `/dashboard/admin` routes to `admin/page.tsx` and NOT to `[space]/page.tsx` by checking the Next.js route resolution in the build output or via a quick `console.log` in both files during dev.

# ADVISORY-004 — Deprecate Local `listings.json` in Favour of Neon DB

**Status:** Active  
**Severity:** Medium  
**Issued:** 2026-06-09  
**Applies to:** `apps/web` (Next.js app)  
**References:**

- [SPEC.md](../STEERING/SPEC.md) — Data fetching patterns, listing queries
- ADVISORY-003 — Supply-chain hygiene (data source integrity)

---

## Background

`apps/web/src/shared/data/listings.json` (629 lines, 42 listings) is a static JSON snapshot of market and food truck listings. It was introduced as seed/placeholder data during early development before the Neon database schema was finalised.

The file has since become a source of **stale data** — it is never updated in sync with the database, so query results differ depending on whether a component reads from `listings.json` or from the DB via tRPC/Drizzle. This causes inconsistent behaviour across pages: a listing visible in the Explorer may not appear in search results, or vice versa.

Additionally, a broken import in `SearchBar.tsx:6` references `../app/data/listings.json` which does not exist on disk — this would fail at build time if the module resolution chain didn't happen to resolve through the workspace hoisting to the `shared/data/` copy. The file "keeps reappearing" because the import survives refactors and the file is never explicitly removed, creating a zombie dependency.

---

## Current Usages (3 imports, 2 files)

| File                                                     | Import                        | Status                                                        |
| -------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `apps/web/src/entities/listing/ui/Listings.tsx:3`        | `@/shared/data/listings.json` | Active — renders trending listings                            |
| `apps/web/src/components/SearchBar.tsx:6`                | `../app/data/listings.json`   | Broken — path does not exist, works accidentally via hoisting |
| `apps/web/src/app/(shared-platform)/explorer/page.tsx:5` | `../../data/listings.json`    | Active — drives Explorer page                                 |

---

## Threat Model

| Risk                                                                         | Impact                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Stale listings** — JSON reflects data at commit time, not current DB state | Users see outdated or missing market/vendor info           |
| **Inconsistent UI** — some components use JSON, others use DB                | Confusing UX: listing shown on one page but not on another |
| **Silent fallback** — new developers don't realise the data is fake          | Accidental ship of demo data to production                 |
| **Broken import** — `SearchBar.tsx` references a non-existent path           | Future module resolution change could break the build      |

---

## Required Actions

### 1. Replace all three imports with a tRPC or server-side DB query

Each consumer should fetch listings from the database via the existing tRPC router or a server component query using Drizzle. The local JSON is no longer authoritative.

**Server component pattern (recommended for `explorer/page.tsx`):**

```typescript
// Server component — no JSON import
async function getListings() {
    const { db } = await import('@/lib/db');
    return db.query.listings.findMany({ limit: 50 });
}

export default async function ExplorerPage() {
    const listings = await getListings().catch(() => null);
    if (!listings) return <EmptyState />;
    return <Explorer listings={listings} />;
}
```

**Client component pattern (for `SearchBar.tsx`):**

```typescript
'use client';
import { trpc } from '@/lib/trpc/client';

export default function SearchBar() {
  const { data: listings = [] } = trpc.listing.search.useQuery({ limit: 100 });
  // … use listings directly
}
```

### 2. Fail gracefully when the DB is unreachable

Replace any remaining JSON fallback with a `<NoData />` or `<EmptyState />` component. Do **not** keep a stale JSON file as a silent fallback — this is what caused the file to "keep reappearing."

```typescript
function EmptyState() {
    return (
        <div className="text-center py-12 text-gray-500">
            <p>No listings available right now. Check back soon.</p>
        </div>
    );
}
```

### 3. Delete the stale file

Once all imports are migrated:

```bash
git rm apps/web/src/shared/data/listings.json
```

Verify no remaining references:

```bash
git grep 'listings\.json'
```

### 4. Verify the broken import in SearchBar.tsx

Confirm that `SearchBar.tsx:6` currently breaks when the shared JSON is removed. If the module resolution silently resolves through a hoisted copy, the import path should be corrected to the canonical tRPC query — not fixed to point at a new JSON path.

---

## Quick-Start: Implementation Order

1. **Explorer page** — server component path (simplest, no client-side changes)
2. **SearchBar** — tRPC query with Fuse.js running client-side on fetched data
3. **Listings.tsx** — server component or tRPC query, same pattern
4. **Delete `listings.json`** — verify zero imports remain
5. **Remove the stale `app/data/` path** from SearchBar.tsx

---

## What This Does and Does Not Buy Us

| Outcome                                               | Result |
| ----------------------------------------------------- | ------ |
| Listings always reflect current DB state              | ✅     |
| Consistent data across Explorer, Search, and Listings | ✅     |
| Graceful "no data" state when offline                 | ✅     |
| No more zombie file reappearing                       | ✅     |
| Build-time detection of broken imports                | ✅     |
| Eliminates demo-data-shipped-to-production risk       | ✅     |

---

_Issued by platform engineering. Review and acknowledgement required before migrating the first consumer._

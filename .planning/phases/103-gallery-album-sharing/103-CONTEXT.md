# Phase 103: Tenant Gallery & Album Sharing — Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

## Phase Boundary

Two-part delivery: (A) tenant-level system gallery for dashboard header images and system banners, (B) public album sharing making user albums discoverable across the community.

---

## Implementation Decisions

### A: Tenant System Gallery

- **D-01:** Admin-only upload to a dedicated tenant-level S3 prefix (`tenants/{tenantId}/system/`). BOARD/ADMIN roles can upload, list, and delete. Residents are read-only consumers.
- **D-02:** New storage functions in `src/shared/api/storage.ts` — `uploadTenantImage(tenantId, file)`, `listTenantImages(tenantId)`, `deleteTenantImage(tenantId, key)`. These do NOT verify user ownership prefix like the user-level functions.
- **D-03:** New API route `src/app/api/admin/media/route.ts` — admin-gated POST (upload), GET (list), DELETE. Uses `hasPermission(authData.role, 'admin')` guard.
- **D-04:** Dashboard header image picker is a **modal with two tabs**: "System Gallery" (tenant-curated images) and "My Images" (user's personal uploads from `/api/media`). User clicks to select.
- **D-05:** Selected header image URL stored in `profileData.headerImage` (extends the `ProfileData` interface in `TabbedProfile.tsx`).
- **D-06:** Dashboard applies the selected image as a CSS background (or hero banner) using the value from `profileData.headerImage`. Falls back to default gradient/no-image.
- **D-07:** PromoBanner CTA on `/dashboard` routes to the header picker modal.

### B: Public Album Sharing

- **D-08:** `isPublic = true` on an album = immediate community visibility. No separate opt-in or approval flow.
- **D-09:** New API endpoint `GET /api/user/albums/public` lists all public albums across the tenant (filtered by `tenantId` + `isPublic = true`). Returns album metadata including owner info.
- **D-10:** New widget `community-gallery` registered in the widget registry under `community` space. Shows public albums from all users in a card grid. Clicking an album expands/reveals its media.
- **D-11:** Update `MyAlbumWidget` — clearer visual indicator for public/private status. Show "Visible to community" label when public.

### Agent's Discretion

- Header image CSS implementation details (full-bleed hero vs contained banner, height, overlay gradients)
- The exact modal component structure for the header picker
- Community gallery widget layout details (grid columns, pagination)
- Album owner display in community gallery (name, avatar)

---

## Canonical References

### Storage

- `src/shared/api/storage.ts` — existing user-level S3 functions (model for tenant versions)
- `src/app/api/upload/route.ts` — existing upload pattern (rate-limited, validated)

### Existing APIs

- `src/app/api/user/albums/route.ts` — album CRUD (model for public listing)
- `src/app/api/media/route.ts` — user media list/delete
- `src/app/api/settings/route.ts` — tenant settings (for potential future settings key)

### Frontend

- `src/widgets/dashboard/ui/MyAlbumWidget.tsx` — personal album widget (update for sharing UI)
- `src/shared/ui/MediaLibrary.tsx` — reusable media grid/carousel (model for community gallery)
- `src/widgets/dashboard/ui/MediaWidget.tsx` — current media wrapper (11 lines, reference)
- `src/widgets/dashboard/ui/HomeLayer.tsx` — dashboard main component (header image rendered here)
- `src/widgets/dashboard/ui/TabbedProfile.tsx` — ProfileData interface (extend with headerImage)
- `src/shared/ui/PromoBanner.tsx` — banner on dashboard that routes to header picker
- `src/app/(tenant)/dashboard/page.tsx` — dashboard page with PromoBanner + HomeLayer

### Widget System

- `src/widgets/dashboard/model/widgets.ts` — widget registry (add community-gallery widget here)
- `src/entities/widget/model/default-layouts.ts` — default dashboard layouts
- `src/entities/tenant/api/features/registry.ts` — feature flag registry
- `src/widgets/dashboard/model/spaces.ts` — space definitions

---

## Existing Code Insights

### Reusable Assets

- `MediaLibrary` component — grid view, carousel view, upload, delete. Can be adapted for tenant gallery with admin mode.
- `MyAlbumWidget` — album card grid, create/delete/edit patterns. Model for community gallery widget.
- `ImageUpload` (referenced in TabbedProfile) — existing image upload primitive.
- `Tooltip` component — used in MediaLibrary for hover actions.

### Established Patterns

- Admin API routes use `hasPermission(role, 'admin')` guard pattern.
- S3 storage uses per-user prefix `users/{userId}/` for ownership isolation — tenant prefix `tenants/{tenantId}/system/` extends this pattern.
- Widget registration uses lazy-loaded components with `spaces: ['community']`.
- Feature gating via `featureFlag` on widget manifests.
- Rate limiting via `rateLimitByIP` and `rateLimitByUser`.
- `profileData` is a JSONB field on user — extendable without schema migration.

### Integration Points

- Dashboard `page.tsx` — add header image logic, wire PromoBanner CTA.
- `HomeLayer.tsx` — render header image as background.
- Widget registry (`widgets.ts`) — register `community-gallery` widget.
- Feature registry (`registry.ts`) — add feature flags if gating is needed.
- User profile API (`users/[id]/route.ts`) — already handles `profileData` updates.

---

## Specific Ideas

- Keep it simple — the PromoBanner already says "Customise your dashboard with a header image or choose from the gallery." Just wire it up.
- Community gallery should feel like browsing photo albums, not a media dump.

---

## Deferred Ideas

None — discussion stayed within phase scope.

---

_Phase: 103-GalleryAlbumSharing_
_Context gathered: 2026-06-24_

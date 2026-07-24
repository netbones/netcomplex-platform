---
phase: 125-proxy-vote-module
plan: 06
subsystem: storage
tags: [s3, supabase, document-upload, proxy-vote, pdf]

# Dependency graph
requires:
  - phase: 125-01
    provides: storage extension target — adds uploadDocument() to existing storage.ts while preserving uploadImage()
provides:
  - uploadDocument() function — PDF/JPG/PNG upload to Supabase Storage with 10MB cap, separate from image-only uploadImage()
  - ALLOWED_DOCUMENT_TYPES and MAX_DOCUMENT_SIZE constants — exported for downstream consumers (form widgets, server-side validation)
  - Wave 0 unit tests for client-side validation gates (MIME type + size)
  - Tenant-scoped key format: tenants/{tenantId}/documents/proxy-forms/{uuid}-{filename}
affects: [proxy-vote-procedure-flow, proxy-form-upload-widget, server-side-storage-routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Separate validation function (uploadDocument) per file-type family — image-only guard on uploadImage preserved'
    - 'Constants exported as readonly tuples via const-array pattern'
    - 'vi.hoisted mock state for S3Client + mediaUploads db inserts in unit tests'

key-files:
  created:
    - src/features/proxy-vote/__tests__/upload.test.ts
  modified:
    - src/shared/api/storage.ts

key-decisions:
  - 'Separate uploadDocument() from uploadImage() — preserves image-only type guard on uploadImage() (existing 18 callsites unaffected)'
  - 'ALLOWED_DOCUMENT_TYPES = [application/pdf, image/jpeg, image/png] — covers both signed paper scans (JPG/PNG) and digital signatures (PDF)'
  - 'MAX_DOCUMENT_SIZE = 10MB — CONTEXT.md requirement; prevents DoS via large uploads while accommodating full signed proxy forms'
  - 'Key format uses crypto.randomUUID() — ensures uniqueness without coordination'
  - 'File name sanitised: [^a-zA-Z0-9._-] → _ — prevents path traversal if filename has slashes/etc.'
  - "Subfolder defaults to 'proxy-forms' but is overridable — supports reuse beyond proxy vote (constitution attachments, etc.)"
  - 'Test mocks @aws-sdk/client-s3 via vi.hoisted + S3Client as a function declaration (not arrow) — vitest v4 cannot construct arrow-as-class mocks'

patterns-established:
  - 'Wave 0 stub pattern: client-side validation tests cover the security-critical rejection gates before any upload happens'
  - 'Validation-before-upload: file.type and file.size guards return synchronously BEFORE the S3 PutObjectCommand fires'

requirements-completed: [PV-04]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: 'uploadDocument() function in src/shared/api/storage.ts accepts PDF/JPG/PNG with 10MB cap, tenant-scoped key path'
    requirement: PV-04
    verification:
      - kind: unit
        ref: 'src/features/proxy-vote/__tests__/upload.test.ts#uploadDocument() — MIME type validation'
        status: pass
      - kind: unit
        ref: 'src/features/proxy-vote/__tests__/upload.test.ts#uploadDocument() — size validation'
        status: pass
      - kind: unit
        ref: 'src/features/proxy-vote/__tests__/upload.test.ts#ALLOWED_DOCUMENT_TYPES constant'
        status: pass
      - kind: unit
        ref: 'src/features/proxy-vote/__tests__/upload.test.ts#MAX_DOCUMENT_SIZE constant'
        status: pass
    human_judgment: false
  - id: D2
    description: 'Constants ALLOWED_DOCUMENT_TYPES + MAX_DOCUMENT_SIZE exported for downstream server-side validation and UI guards'
    requirement: PV-04
    verification:
      - kind: unit
        ref: 'src/features/proxy-vote/__tests__/upload.test.ts#ALLOWED_DOCUMENT_TYPES constant'
        status: pass
    human_judgment: false
  - id: D3
    description: 'Existing uploadImage() image-only type guard preserved unchanged (must_haves prohibition verified)'
    requirement: PV-04
    verification:
      - kind: manual_procedural
        ref: 'git diff e01b4a44..HEAD -- src/shared/api/storage.ts — uploadImage() function body untouched (only +74 lines at end of file)'
        status: pass
    human_judgment: false

# Metrics
duration: 16min
completed: 2026-07-24
status: complete
---

# Phase 125 Plan 06: Document Upload Extension Summary

**PDF/JPG/PNG upload extension to storage.ts with separate uploadDocument() function and 10MB cap, preserving uploadImage() image-only guard.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-24T08:13:46Z
- **Completed:** 2026-07-24T08:30:09Z
- **Tasks:** 2 (both complete)
- **Files modified:** 2

## Accomplishments

- Added `uploadDocument()` to `src/shared/api/storage.ts` — separate function from `uploadImage()` so the image-only type guard on the existing 18 callsites is preserved unchanged.
- Added exported constants `ALLOWED_DOCUMENT_TYPES` (`['application/pdf', 'image/jpeg', 'image/png']`) and `MAX_DOCUMENT_SIZE` (`10 * 1024 * 1024`) for downstream server-side validation and UI guards.
- Tenant-scoped Storage key path: `tenants/{tenantId}/documents/{subfolder || 'proxy-forms'}/{crypto.randomUUID()}-{sanitised-filename}`. File names are sanitised to prevent path-traversal injection via filename.
- Wave 0 unit tests (10 tests, all GREEN): constants layout, four invalid MIME type rejections (`text/html`, `video/mp4`, `application/zip`, `application/x-executable`), and oversize-file rejection. Mocks `@aws-sdk/client-s3` and `@shared/api/db` to keep tests offline and side-effect-free.
- Verification by `git diff` confirms `uploadImage()` function body is untouched (`+74` lines at end of file only).

## Task Commits

Each task was committed atomically:

1. **Task 1 (125-06-01): Add uploadDocument() function** — `8dfe8ab6` (feat)
2. **Task 2 (125-06-02): Wave 0 upload test stub + storage unit tests** — `cc8b9218` (test)

## Files Created/Modified

- `src/shared/api/storage.ts` — Added `ALLOWED_DOCUMENT_TYPES`, `MAX_DOCUMENT_SIZE` constants and `uploadDocument()` function (+74 lines). `uploadImage()` and all other existing functions preserved.
- `src/features/proxy-vote/__tests__/upload.test.ts` — New Wave 0 file. 10 vitest cases covering client-side upload validation. Mocks `s3Client.send`, `db.insert(mediaUploads)` via `vi.hoisted`.

## Decisions Made

- **Separate function, not parameter on uploadImage()** — keeps image-only guard logic on existing 18 callers untouched (must_haves prohibition); new proxy-form flow imports `uploadDocument()` directly.
- **10MB cap (CONTEXT.md requirement)** — no per-tenant override for MVP; tier-aware caps are deferred to a future plan.
- **Reuse BUCKET_NAME (`content-image`)** — Supabase Storage bucket policy is tenant-scoped via the `tenants/{tenantId}/documents/` key path, not the bucket name. Single bucket simplifies admin tooling.
- **Sanitisation on file name only** — tenantId and subfolder values are server-derived, never user-supplied, so they bypass sanitisation. Path traversal via filename is blocked by `[^a-zA-Z0-9._-]` → `_`.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 125-07 (proxy-vote procedure-flow) can consume `uploadDocument()` for the proxy-form upload widget.
- Server-side route at `/api/proxy-vote/form-upload` should be added in plan 125-09 (admin/HOA review) — this would call `uploadDocument()` from a Next.js route handler with the authenticated user's `tenantId`.
- Supabase Storage bucket policy should be reviewed to confirm `tenants/{tenantId}/documents/` paths enforce tenant isolation (server-side defensive measure; client-side guards alone are not authoritative).

---

_Phase: 125-proxy-vote-module_
_Completed: 2026-07-24_

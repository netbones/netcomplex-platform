# Content Context

> **Last updated:** 2026-06-01

## Purpose

Content management for articles, resources, and pages. Supports scheduling, visibility scoping, and Tiptap rich editing.

## Directory

`src/entities/content/`

## Key Models

| Model         | Description                                 |
| ------------- | ------------------------------------------- |
| `ContentItem` | Managed content: articles, pages, resources |

## Exports

- `buildContentConditions`, `listContent`, `createContent` services
- `canManageContent`, `canManageOwnContent` permission wrappers

## Dependencies

- **Tenant** — permissions, tenant isolation
- **User** — author reference

## API Surface

- REST: `/api/content/*`

## DTOs

- `@shared/api/dto/content.ts` (exists but not in shared barrel export)

## Prisma Models

`Content`, `ContentCategory`

## Open Issues

- [ ] **No `index.ts` barrel export** — files exist (permissions, schema, dto, api, services) but no public barrel
- [ ] Content DTO not in shared barrel (`@shared/api/dto/index.ts`)
- [ ] Service entity defines its own `ContentItem` interface — overlapping boundary (see CONTEXT_MAP.md)

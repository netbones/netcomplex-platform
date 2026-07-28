---
title: Document Conventions
status: current
reviewed: 2026-07-28
tags: [standards, conventions, frontmatter]
audience: all
---

# Document Conventions

All `.md` files in `docs/` SHOULD include YAML front matter.

## Front Matter Schema

```yaml
---
title: Events System Review
status: current # draft | current | stale | archived
reviewed: 2026-07-22 # ISO date of last content review
tags: [events, audit] # categorization tags (optional)
audience: developer # developer | admin | product | all (optional)
supersedes: # paths of docs this replaces (optional)
superseded_by: # single path if this doc is replaced (optional)
bd_issues: [tepl, e4fy] # linked BD issue IDs (optional)
---
```

### Required

- `title` — human-readable document title (NOT the filename)
- `status` — one of `draft`, `current`, `stale`, `archived`

### Strongly Recommended

- `reviewed` — last substantive review date. If absent, treat as stale.

### Optional

- `tags` — list of categorization tags for grep-based discovery
- `audience` — who should read this
- `supersedes` / `superseded_by` — establishes an ownership chain for stale docs
- `bd_issues` — directly linked BD issue IDs (short form, e.g. `tepl`)

## Status Lifecycle

```
draft → current → stale → archived
         ↑           │
         └───────────┘ (re-review resets to current)
```

- **draft** — work in progress, not ready for reference
- **current** — reflects the current state of the codebase
- **stale** — content may not match the codebase; needs review
- **archived** — kept for history, should not be referenced for implementation

## INDEX.md Rules

1. Every file in `docs/` MUST be listed in `docs/INDEX.md` (exception: files in `assets/`).
2. INDEX.md entries use relative paths from `docs/`.
3. When a file is moved or renamed, INDEX.md is updated in the same commit.
4. INDEX.md is sorted by section, then alphabetically within sections (case-insensitive).

## Marker Conventions

Use these progress markers for pending/follow-up items **within** a doc:

| Marker | Meaning            |
| ------ | ------------------ |
| ⏳     | Pending / not done |
| 🟡     | In progress        |
| ✅     | Complete           |
| ⏭️     | Superseded         |
| ❌     | Won't do           |

## BD Issue Cross-References

When a doc section describes work tracked by a BD issue:

```markdown
| Item                     | BD                     |
| ------------------------ | ---------------------- |
| Recurring events support | `soralia-village-tepl` |
```

Use the short ID (`tepl`) in YAML front matter `bd_issues: [tepl]`.
Use the full ID (`soralia-village-tepl`) in markdown tables.

## Conventions Checklist

- [ ] Front matter block present with `title`, `status`, `reviewed`
- [ ] File is listed in `docs/INDEX.md`
- [ ] Progress markers use the standard set (⏳ 🟡 ✅ ⏭️ ❌)
- [ ] BD issue IDs are documented where work is tracked
- [ ] `reviewed` date updated when content changes

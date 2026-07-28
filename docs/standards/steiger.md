---
title: Steiger
status: current
reviewed: 2026-07-28
tags: [standards, best-practices]
audience: developer
---

The Steiger allow list has a config issue (even @api/server still shows 123 violations despite being listed). But the categories are clear — here's what Steiger surfaces:

327 warnings across 2 rules:
|Rule| Count| Issue|
|----|-------|-------|
|fsd/no-public-api-sidestep| 312| Files importing from sub-barrels or internal paths instead of slice public API|
|fsd/insignificant-slice 15 Slices with zero or one consumer — candidates for removal/merge

|Top import targets (no-public-api-sidestep):
|Target| Count |Status|
|------|--------|------|
|@api/server| 123| In allow list (not suppressing — config bug)|
|@entities/tenant/server 111 In allow list (not suppressing — config bug)|
|@api/client| 38| In allow list|
|@api/shared| 22| In allow list|
|@/shared/api/db| 5| Bare path — needs own allow entry or barrel|
|@/shared/api/auth-utils| 4| Bare path — needs own allow entry or barrel|

|Insignificant slices (0-1 references):
|Slice| Ref| Count|
|-----|----|------|
|entities/admin| 1| (features/admin)|
|entities/survey| 1| (features/survey-builder)|
|entities/user| 1| (widgets/admin)|
|entities/widget | 1 (widgets/dashboard)|
|features/admin| 0| |
|features/booking| 0| |
|features/chat| 0| |
|features/gate| 0| |
|features/dashboard| 1| |
|features/i18n| 1| |
|features/service| 1| |
|features/survey-builder| 0| |
|widgets/booking| 0| |
|widgets/chat| 0| |
|widgets/maintenance| 0| |

The Steiger allow list config needs investigation — even the existing @api/server entry doesn't suppress its 123 violations. The @entities/\*/server glob was also tried and didn't work, and explicit per-slice entries don't work either. This may be a Steiger version issue or a config format mismatch. But the violations themselves are fully categorized.

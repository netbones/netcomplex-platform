# Feature Management Console

The **Feature Management Console** is a centralized administrative interface that allows tenant administrators to manage the visibility and access levels of platform modules defined in the `NAV_REGISTRY`.

## Overview

This console replaces legacy, hardcoded settings pages. It dynamically iterates over all navigation items registered in `src/shared/lib/navigation.ts`, ensuring that new features are instantly manageable by admins.

## Key Capabilities

- **Dynamic Visibility Toggle**: Enable or disable features globally for all residents.
- **Unified Registry Integration**: Automatic detection of new features.
- **RBAC Enforcement**: Clear visualization of required permissions for each feature.

## Accessing the Console

The console is located in the **Admin Dashboard** under **System Settings > Feature Management**.

## Governance Rules

All changes made via this console are governed by the `docs/architecture/NAVIGATION_GOVERNANCE.md`.

- **Header Limits**: Ensure you do not exceed the 6-item limit for the header navigation.
- **Contextual Access**: Prefer feature-specific widgets over new top-level pages.

## Configuration Logic

- **API Endpoint**: `/api/admin/settings/page-flags`
- **Persistence**: Settings are stored in the tenant-specific configuration database.

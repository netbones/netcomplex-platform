# Phase 32 — Users List Refactor: Summary

## What Changed

Broke the 1,431-line `UsersListSection.tsx` monolith into 13 focused files totaling 1,675 lines (all under 500-line limit). Zero behavioral changes — pure structural refactor.

## Files Created (13 new)

| File                                                     | Lines | Purpose                                                                                                                                    |
| -------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/entities/user/model/types.ts`                       | 86    | AdminUser, Invitation, SeatInfo, InviteFormData, AllocateSeatFormData, PropertyInfo, PremiumSeat, AdminUserProfile, roleOptions, PAGE_SIZE |
| `src/widgets/admin/ui/users/lib/resolve-user-helpers.ts` | 60    | Pure functions: resolveAddress, resolveType, resolveSeatInfo                                                                               |
| `src/widgets/admin/ui/users/lib/use-users-data.ts`       | 106   | Custom hook: fetch, filter, pagination state                                                                                               |
| `src/shared/ui/ModalOverlay.tsx`                         | 24    | Reusable modal overlay primitive (backdrop + centered card)                                                                                |
| `src/widgets/admin/ui/users/InviteModal.tsx`             | 134   | Invite form modal                                                                                                                          |
| `src/widgets/admin/ui/users/DeleteUserModal.tsx`         | 56    | Delete confirmation modal                                                                                                                  |
| `src/widgets/admin/ui/users/SuspendUserModal.tsx`        | 56    | Suspend confirmation modal                                                                                                                 |
| `src/widgets/admin/ui/users/AllocateSeatModal.tsx`       | 96    | Seat allocation modal                                                                                                                      |
| `src/widgets/admin/ui/users/RemoveSeatModal.tsx`         | 67    | Seat removal confirmation modal                                                                                                            |
| `src/widgets/admin/ui/users/UserRow.tsx`                 | 164   | Read-only table row with inline role/status                                                                                                |
| `src/widgets/admin/ui/users/UserEditRow.tsx`             | 237   | Expanded edit row (forms, dropdowns, save/cancel)                                                                                          |
| `src/widgets/admin/ui/users/UserTable.tsx`               | 127   | Table shell with pagination                                                                                                                |
| `src/widgets/admin/ui/users/UsersListSection.tsx`        | 462   | Slim orchestrator (state, handlers, composition)                                                                                           |

## Files Modified (2)

| File                                        | Change                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/ui/index.ts`                    | Added ModalOverlay export                                                                                                       |
| `src/widgets/admin/ui/UsersListSection.tsx` | Replaced 1,431-line monolith with backward-compat re-export shim: `export { UsersListSection } from './users/UsersListSection'` |

## Verification Results

- **TypeScript**: Zero new errors in refactored files (pre-existing errors in seed/test files unchanged)
- **ESLint**: Zero warnings in refactored files (3 fixed: unused `Property` import, unused `isExpanded` prop, unused `platformAddress` param)
- **Line limit**: All files under 500 lines ✓
- **No raw overlay patterns**: `grep -r 'fixed inset-0 bg-black/50' src/widgets/admin/ui/users/` returns nothing ✓
- **ModalOverlay used by all 5 modals**: Confirmed ✓
- **Backward compat**: Old path re-exports from new location ✓
- **Types from entity layer**: No type duplication in orchestrator ✓
- **Helpers from lib**: resolveSeatInfo/resolveAddress/resolveType all imported from `lib/resolve-user-helpers` ✓

## Key Decisions

- **PropertyInfo separate from entity Property**: Admin API returns a lighter shape, no need to couple
- **PremiumSeat in user entity types**: User-scoped in admin context, not tenant-scoped
- **Re-export shim at old path**: Two consumers (`dashboard/admin/[domain]/page.tsx`, `dashboard/[space]/page.tsx`) continue importing from same path
- **ModalOverlay**: `onClick` backdrop dismiss + `stopPropagation` on content card

## Commit

`3b656d1` — `refactor(32): break 1,431-line UsersListSection into focused sub-components`

## What's Next

Phase 32 is complete. The UsersListSection is now maintainable with each file under 500 lines and a clear separation of concerns:

- Types → entity layer
- Pure logic → lib helpers
- Data fetching → custom hook
- UI primitives → shared ModalOverlay
- Modals → individual focused components
- Table structure → UserTable/UserRow/UserEditRow
- Orchestration → slim UsersListSection (462 lines)

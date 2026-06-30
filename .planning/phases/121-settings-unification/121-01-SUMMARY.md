# 121-01 Summary: Single Source of Truth

**Status:** Complete
**Date:** 2026-06-30

## Result

Created `src/entities/tenant/api/settings-defs.ts` (287 lines) as the single source of truth for all settings definitions. The master `SETTING_DEFS` array contains 37 entries, each specifying dbKey, optional flagKey, type, optional enumValues, and defaultValue. From this array we generate:

- `SETTINGS_KEYS` (explicitly preserved original key names: PAGE_CONSERVATION_URL, etc.)
- `SettingValueMap` type (derived from SETTING_DEFS)
- `SETTINGS_VALUE_SCHEMAS` (Zod validators per type)
- `FLAG_DEFS` (page flag → db key mapping)
- `DEFAULT_PAGE_FLAGS` (default values for all page flags)
- `validateSettingValue()` and `getTypedSetting()` (runtime helpers)

### Files Changed

| File                                              | Action                                                 |
| ------------------------------------------------- | ------------------------------------------------------ |
| `src/entities/tenant/api/settings-defs.ts`        | NEW — SSOT with 287 lines                              |
| `src/entities/tenant/api/settings.ts`             | Simplified to 2-line re-export                         |
| `src/shared/lib/settings/validation.ts`           | Simplified to 3-line re-export                         |
| `src/shared/lib/settings/types.ts`                | Simplified to 2-line re-export                         |
| `src/shared/lib/settings/defaults.ts`             | Simplified to 2-line re-export                         |
| `src/entities/tenant/api/flags/platform-flags.ts` | Removed inline FLAG_DEFS (30 lines), imports from SSOT |

### Verification

- 77 tests pass (6 test files)
- ESLint: clean
- All existing exports preserved — no consumer breakage
- Adding a new setting now requires only one insertion in SETTING_DEFS

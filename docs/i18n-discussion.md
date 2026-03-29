# i18n Translation Workflow Discussion

## Current State

Translations are currently stored as inline JavaScript objects in `src/lib/i18n.ts`. This file contains hardcoded translations for all 4 supported languages (English, Afrikaans, Xhosa, Zulu).

### Why This Approach Was Taken

The project originally had JSON translation files at `public/locales/[lang]/*.json` but they were never wired up to i18next. Setting up the HTTP backend would require:

1. Installing `i18next-http-backend` package
2. Configuring it in the i18n initialization
3. Handling async loading of translation files

The inline approach was chosen as a pragmatic solution to get translations working quickly.

## Problems

### 1. Machine Translation Quality

All non-English translations were generated using machine translation (likely Google Translate or similar). These translations may contain:

- Grammatical errors
- Incorrect word choices (especially for culturally-specific terms)
- Awkward phrasing that native speakers would not use
- Inconsistent terminology

### 2. No Editor Workflow

Currently there is no way for non-technical team members to:

- View current translations
- Suggest corrections
- Approve/reject changes
- Track translation progress

### 3. Maintenance Burden

- All translations are in one file (`lib/i18n.ts`)
- Adding new strings requires code changes
- No separation of concerns between UI code and translations
- Risk of merge conflicts when multiple people work on translations

## Proposed Solution

### Option A: Wire Up JSON Files (Recommended)

1. **Install backend**: `npm install i18next-http-backend`
2. **Configure i18n**: Update `src/lib/i18n.ts` to load from `public/locales/`
3. **Migrate existing translations**: Move current translations to JSON files
4. **Create editor guidelines**: Document how to edit JSON files
5. **Set up review process**: PR workflow for translation changes

### Option B: Use Translation Management System (TMS)

Consider using a TMS like:

- **Lokalise** - Free tier available, good UI for editors
- **POEditor** - Free tier available
- **Crowdin** - Free for open source, good collaboration features

Benefits:

- Web UI for non-technical editors
- Translation memory (reuse common phrases)
- Quality checks (missing translations, variable consistency)
- Integration with GitHub

### Option C: Hybrid

Keep inline translations for development speed, but set up TMS for production with professional human translation.

## Recommended Next Steps

1. **Wire up existing JSON files** (Option A) - Low effort, immediate improvement
2. **Create style guide** - Define terminology standards for each language
3. **Native speaker review** - Get Afrikaans/Xhosa/Zulu speakers to review key strings
4. **Consider professional translation** - For critical user-facing content (legal, safety)

## Files of Interest

- `src/lib/i18n.ts` - Current inline translations
- `public/locales/en/common.json` - English translations (partial)
- `public/locales/af/common.json` - Afrikaans (partial)
- `public/locales/xh/common.json` - Xhosa (partial)
- `public/locales/zu/common.json` - Zulu (partial)

## Related Issues

- soralia-village-8iy: Setup proper i18n workflow with external translation files

# Translation Workflow

This document describes how to manage translations for Soralia Village.

## Current Setup

Translations are stored in `public/locales/[lang]/[namespace].json`:

- `en` - English (default)
- `af` - Afrikaans
- `xh` - Xhosa
- `zu` - Zulu

Namespaces: `common`, `dashboard`, `services`, `messages`, `forms`

## Adding Translations

1. Edit the relevant JSON file in `public/locales/[lang]/`
2. Run `npm run typecheck` to verify
3. Commit and push changes

## For Non-Technical Editors

### Suggesting Corrections

1. Navigate to `public/locales/[lang]/`
2. Open the relevant JSON file (e.g., `common.json`)
3. Make edits to translation values only
4. Submit changes via GitHub PR or contact a developer

### Adding New Languages

1. Create a new folder `public/locales/[code]/`
2. Copy translation files from English
3. Update translations
4. Update `supportedLanguages` in `src/lib/i18n.ts`

## Key Principles

- Never change keys (the text before the colon)
- Keep translations concise (UI space is limited)
- Test in UI after changes

## CI/CD

- GitHub Actions workflow runs on translation file changes
- This notifies the team about new translation updates

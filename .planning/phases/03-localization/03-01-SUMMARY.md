---
phase: 03-localization
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/i18n.ts
  - src/components/platform/HeroSection.tsx
  - src/components/platform/MissionSection.tsx
  - src/components/platform/FeaturesSection.tsx
  - src/components/platform/CTASection.tsx
  - src/components/layout/PlatformHeader.tsx
  - src/components/ui/LanguageSwitcher.tsx
  - src/app/[lng]/platform/layout.tsx
  - src/app/[lng]/platform/home/page.tsx
  - public/locales/en/platform.json
  - public/locales/af/platform.json
  - public/locales/xh/platform.json
  - public/locales/zu/platform.json
autonomous: true
requirements: []
must_haves:
  truths:
    - Platform pages use distinct /[lng]/platform/ subdirectory for i18n routing
    - Users can switch language from platform header
    - Platform landing page content is translated
  artifacts:
    - path: src/app/[lng]/platform/home/page.tsx
      provides: Language-aware platform home page under /[lng]/platform/
    - path: src/app/[lng]/platform/layout.tsx
      provides: I18nextProvider wrapper for platform routes
    - path: public/locales/en/platform.json
      provides: English translations for platform content
    - path: src/components/ui/LanguageSwitcher.tsx
      provides: Language switching with light/dark variants
---

## Summary

Successfully implemented internationalization (i18n) support for the NetComplex platform landing page with the following changes:

### Route Structure

- Created `src/app/[lng]/platform/` directory with language-aware routing
- Added `layout.tsx` with I18nextProvider for i18n context
- Platform pages now accessible at `/en/platform/home`, `/af/platform/home`, etc.

### Translation Infrastructure

- Added 'platform' namespace to `src/lib/i18n.ts`
- Created translation files at `public/locales/{en,af,xh,zu}/platform.json`
- Translations cover: hero, mission, features, CTA, and header sections

### Translated Components

- **HeroSection**: tagline, title, subtitle, attribution, CTAs
- **MissionSection**: title, description, core belief
- **FeaturesSection**: title, subtitle, 12 feature cards with details, show more/less
- **CTASection**: title, description, primary/secondary actions
- **PlatformHeader**: navigation items, sign in, get started, language switcher

### LanguageSwitcher Updates

- Added `variant` prop for light/dark themes
- Light variant uses: bg-white, text-lapis-deep, border-lapis-azure
- Integrated into PlatformHeader (desktop and mobile menus)

### Verification

- Dev server running at http://localhost:3000
- Platform page loads correctly at `/en/platform/home`
- Translated content renders properly (verified via curl)

### Next Steps

- Translate platform.json files for af, xh, zu languages
- Add translation switcher to platform footer
- Consider adding redirect from `/` to `/en/platform/home`

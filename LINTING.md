./src/app/api/platform/setup/settings/route.ts
15:14 Warning: 'and' is defined but never used. @typescript-eslint/no-unused-vars

./src/entities/setup/**tests**/api.test.ts
114:7 Warning: 'SETUP_ROW' is assigned a value but never used. @typescript-eslint/no-unused-vars

./src/features/setup/model/useSetupProgress.ts
41:52 Warning: 'initial' is defined but never used. Allowed unused args must match /^\_/u. @typescript-eslint/no-unused-vars

./src/features/setup/ui/sections/GrowSection.tsx
6:35 Warning: 'RecommendedMission' is defined but never used. @typescript-eslint/no-unused-vars

./src/features/setup/ui/sections/LaunchSection.tsx
214:15 Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to au▒▒▒▒▒matically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element @next/next/no-img-element
325:28 Warning: 'v' is defined but never used. Allowed unused args must match /^_/u. @typescript-eslint/no-unused-vars
335:28 Warning: 'v' is defined but never used. Allowed unused args must match /^_/u. @typescript-eslint/no-unused-vars
401:28 Warning: 'v' is defined but never used. Allowed unused args must match /^_/u. @typescript-eslint/no-unused-vars
411:28 Warning: 'v' is defined but never used. Allowed unused args must match /^_/u. @typescript-eslint/no-unused-vars
421:28 Warning: 'v' is defined but never used. Allowed unused args must match /^_/u. @typescript-eslint/no-unused-vars
431:28 Warning: 'v' is defined but never used. Allowed unused args must match /^_/u. @typescript-eslint/no-unused-vars

./src/features/setup/ui/sections/PopulateSection.tsx
57:43 Warning: 'tenantId' is defined but never used. Allowed unused args must match /^\_/u. @typescript-eslint/no-unused-vars

info - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
Failed to compile.

./prisma/seed/modules.ts:1:29
Type error: Module '"@prisma/client"' has no exported member 'Tier'.

> 1 | import { PrismaClient, type Tier } from '@prisma/client';

    |                             ^

2 |
3 | const prisma = new PrismaClient();
4 |
Next.js build worker exited with code: 1 and signal: null
[ELIFECYCLE] Command failed with exit code 1.
error: Recipe `build` failed on line 19 with exit code 1

THE EXACT IMPORT CHAIN (Client -> ioredis)
There are two paths from the barrel to ioredis:
Path A (direct)
src/shared/api/index.ts (the @shared/api barrel)
└─ export _ from './server' (line 3)
└─ src/shared/api/server/index.ts
└─ export { rateLimitByKey, rateLimitByIP, rateLimitByUser } from '../rate-limit' (line 92)
└─ export { DEFAULT_RATE_LIMITS } from '../rate-limit' (line 93)
└─ src/shared/api/rate-limit.ts
└─ import Redis from 'ioredis' (line 1) <-- THE PROBLEM
Path B (through provider-onboarding)
src/shared/api/index.ts (the @shared/api barrel)
└─ export _ from './provider-onboarding' (line 7)
└─ src/shared/api/provider-onboarding.ts
└─ import { db, now, providerLegalAgreements, ... } from '@api/server' (line 11)
└─ src/shared/api/server/index.ts
└─ export { rateLimitByKey... } from '../rate-limit' (line 92)
└─ import Redis from 'ioredis' (line 1)
Path B is moot because provider-onboarding.ts has import 'server-only' on line 1, which would throw before ioredis is the issue. Path A is the real culprit -- it has no server-only guard.
Why the barrel is the problem
/home/ubuntupunk/Projects/soralia-village/src/shared/api/index.ts (the @shared/api barrel):
export _ from './server'; // <-- leaks rate-limit -> ioredis
export _ from './client';
export _ from './shared';
export _ from './provider-platform'; // has import 'server-only'
export _ from './provider-onboarding'; // has import 'server-only'
export _ from './provider-billing'; // has import 'server-only'
The barrel itself has no import 'server-only'. The export _ from './server' pulls in the entire server barrel, including the rate-limit re-exports. Tree-shaking of export _ through barrel re-exports is unreliable in webpack/turbopack -- any consumer of @shared/api potentially pulls in ioredis.
Files OUTSIDE src/app/api/ that import @api/server or @shared/api
Direct @api/server imports (4 files, all server components):
File
/home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/resources/[id]/page.tsx (line 4)
/home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/providers/layout.tsx (line 1)
/home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/dashboard/admin/layout.tsx (line 3)
/home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/providers/register/page.tsx (line 5)
/home/ubuntupunk/Projects/soralia-village/src/app/resident/page.tsx (line 2)
@shared/api barrel imports (1 file outside src/app/api/):
File Has 'use client'? Verdict
/home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/providers/register/page.tsx (line 7) No (async server component) Safe -- but this imports getProviderRecordForUser and getProviderVerificationSnapshot which resolve through the barrel to provider-platform.ts, which itself imports from ./server
Relative ./server imports inside src/shared/api/:
File
/home/ubuntupunk/Projects/soralia-village/src/shared/api/provider-platform.ts (line 18)
/home/ubuntupunk/Projects/soralia-village/src/shared/api/provider-billing.ts (line 5)
/home/ubuntupunk/Projects/soralia-village/src/shared/api/index.ts (line 3)
provider-onboarding.ts analysis:
/home/ubuntupunk/Projects/soralia-village/src/shared/api/provider-onboarding.ts:

- Line 1: import 'server-only' -- protects it from client import at runtime
- Line 11: import { db, now, providerLegalAgreements, providerVerifications, serviceProviders } from '@api/server'
- Is it imported by any client component? No. It is re-exported by the @shared/api barrel (line 7), but the barrel itself is only imported by server components (the providers register page) and API routes.
- Does it import from @api/server? Yes. This is safe because of import 'server-only'.
  src/shared/index.ts:
  This file does not exist at /home/ubuntupunk/Projects/soralia-village/src/shared/index.ts.
  src/features/admin/index.ts exports:
  export { BrandingForm } from './ui/BrandingForm'; // 'use client'
  export { FeaturesForm } from './ui/FeaturesForm'; // 'use client'
  export { NewTenantForm } from './ui/NewTenantForm'; // 'use client'
  export { useAdminUrgency } from './model/useAdminUrgency'; // 'use client'
  export { useAdminStats } from './model/useAdminStats'; // 'use client'
  export { useSystemHealth } from './model/useSystemHealth'; // 'use client'
  export { useAdminActivity } from './model/useAdminActivity'; // 'use client'
  None of these import from @api/server or @shared/api. They are all client components but do not create a chain to ioredis.
  Why it leaks to the client
  The serverExternalPackages: ['ioredis'] in next.config.mjs (line 15) only prevents ioredis from being bundled on the server side. On the client side, if any module in the client bundle's import graph touches rate-limit.ts, webpack/turbopack will attempt to bundle ioredis (or fail with a "Module not found" error for native deps like net, tls, etc.).
  The barrel at src/shared/api/index.ts is the problem because:

1. It has no import 'server-only' guard
2. It does export \* from './server' which unconditionally re-exports the rate-limit symbols
3. Any consumer of the barrel risks pulling in ioredis via the re-export chain
   Currently no client component directly imports @shared/api or @api/server, but the barrel is one import away from leaking. If a 'use client' component anywhere adds import { anything } from '@shared/api', ioredis hits the client bundle.
   Summary of all relevant files
   File (absolute path) Role
   /home/ubuntupunk/Projects/soralia-village/src/shared/api/rate-limit.ts Source of import Redis from 'ioredis'
   /home/ubuntupunk/Projects/soralia-village/src/shared/api/server/index.ts Re-exports rate-limit (lines 92-94)
   /home/ubuntupunk/Projects/soralia-village/src/shared/api/index.ts Barrel: export _ from './server' (line 3)
   /home/ubuntupunk/Projects/soralia-village/src/shared/api/provider-onboarding.ts Imports @api/server (line 11)
   /home/ubuntupunk/Projects/soralia-village/src/shared/api/provider-platform.ts Imports ./server (line 18)
   /home/ubuntupunk/Projects/soralia-village/src/shared/api/provider-billing.ts Imports ./server (line 5)
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/resources/[id]/page.tsx Server component, imports @api/server
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/providers/layout.tsx Server component, imports @api/server
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/dashboard/admin/layout.tsx Server component, imports @api/server
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/providers/register/page.tsx Server component, imports both @api/server and @shared/api
   /home/ubuntupunk/Projects/soralia-village/src/app/resident/page.tsx Server component, imports @api/server
   /home/ubuntupunk/Projects/soralia-village/src/features/admin/index.ts Exports client components/hooks
   The root cause: /home/ubuntupunk/Projects/soralia-village/src/shared/api/index.ts is a barrel that mixes server and client exports, with export _ from './server' pulling in the rate-limit module that imports ioredis. The barrel lacks import 'server-only', making it a latent leak point.

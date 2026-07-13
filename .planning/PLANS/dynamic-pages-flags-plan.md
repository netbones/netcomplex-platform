---
phase: pages-dynamic-tenant
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/drizzle/settings.ts
  - src/lib/tenant/settings.ts
  - src/lib/flags/platform-flags.ts
  - src/lib/flags/statsig-flags.ts
  - src/components/layout/Header.tsx
  - src/components/ui/SideDrawer.tsx
  - src/app/conservation/page.tsx
  - src/app/api/conservation/route.ts
  - src/app/campaign/page.tsx
  - src/app/api/campaign/route.ts
  - src/lib/tenant/context.tsx
  - src/lib/features/registry.ts
  - src/app/api/flags/route.ts
autonomous: true
requirements:
  - Platform admin controls core page visibility (DB as source of truth)
  - Statsig used only for experimentation/A/B testing
  - Dynamic header showing pages based on tenant config
  - Per-tenant campaign page toggle
  - Per-tenant conservation page mode (default/managed/external)
  - Custom page definitions per tenant
  - Fix i18n child rendering error

must_haves:
  truths:
    - Tenant admin controls page visibility from platform admin UI
    - Core toggles stored in tenant settings (NOT in Statsig)
    - Statsig handles only A/B tests and phased rollouts
    - Header displays nav items based on tenant's page config
    - Campaign link hidden when tenant has it disabled
    - Conservation page renders in correct mode
    - No "Objects are not valid as React child" errors
  artifacts:
    - path: 'src/lib/flags/platform-flags.ts'
      provides: 'Platform-based flags (DB source of truth)'
      min_lines: 60
    - path: 'src/lib/flags/statsig-flags.ts'
      provides: 'Statsig-based flags (A/B tests)'
      min_lines: 50
    - path: 'src/lib/flags/index.ts'
      provides: 'Unified flag API with platform-first resolution'
      min_lines: 40
    - path: 'src/app/api/flags/route.ts'
      provides: 'Flag evaluation endpoint'
    - path: 'src/components/layout/Header.tsx'
      provides: 'Dynamic navigation using tenant config'
  key_links:
    - from: 'src/app/api/flags/route.ts'
      to: 'src/lib/flags/platform-flags.ts'
      via: 'getPlatformPageFlags(tenantId)'
      pattern: 'platform.*first'
    - from: 'src/app/api/flags/route.ts'
      to: 'src/lib/flags/statsig-flags.ts'
      via: 'getStatsigFlags()'
      pattern: 'statsig.*fallback'
    - from: 'src/app/conservation/page.tsx'
      to: 'src/lib/flags/index.ts'
      via: "await getPageFlag('conservation')"
---

<objective>
Implement dynamic page visibility with hybrid flag architecture. Platform DB is source of truth for core page visibility (tenant admin controls from admin UI). Statsig handles only experimentation and A/B testing. This ensures tenant self-service without requiring Statsig accounts while enabling advanced experimentation when needed.

Purpose: Allow tenants to control page visibility from platform admin UI. Use Statsig for A/B tests and phased rollouts. Enable external conservation portal for Cape Nature.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/skills/flags-sdk/references/providers.md
@/home/ubuntupunk/Projects/soralia-village/src/lib/features/registry.ts
@/home/ubuntupunk/Projects/soralia-village/prisma/drizzle/tenants.ts
@/home/ubuntupunk/Projects/soralia-village/prisma/drizzle/settings.ts
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add page toggle settings to schema</name>
  <files>prisma/drizzle/settings.ts</files>
  <action>
Add page visibility settings to the platform settings table.

The settings table already exists with key-value pairs. We'll use predefined keys:

```typescript
// In prisma/drizzle/settings.ts, the settings table already supports key-value
// We'll add constants for page toggle keys

export const SETTINGS_KEYS = {
  // Page visibility toggles (platform-controlled)
  PAGE_CAMPAIGN_ENABLED: 'page_campaign_enabled',
  PAGE_CONSERVATION_MODE: 'page_conservation_mode',
  PAGE_CONSERVATION_URL: 'page_conservation_external_url',
  PAGE_CHAT_ENABLED: 'page_chat_enabled',
  PAGE_NEWS_ENABLED: 'page_news_enabled',
  PAGE_EVENTS_ENABLED: 'page_events_enabled',
  PAGE_DIRECTORY_ENABLED: 'page_directory_enabled',

  // Feature flags (platform-controlled)
  CUSTOM_PAGES: 'custom_pages', // JSON array of custom pages
  CUSTOM_NAV: 'custom_nav', // JSON array of custom nav items
} as const;
```

For existing tenants, these default to tier-based values. New tenants inherit from chosen tier.
</action>
<verify>
grep -q "PAGE_CAMPAIGN_ENABLED" src/lib/tenant/settings.ts || grep -q "page_campaign" src/lib/tenant/settings.ts</verify>
<done>Page toggle keys defined in settings constants</done>
</task>

<task type="auto">
  <name>Task 2: Create platform flags module (DB source of truth)</name>
  <files>src/lib/flags/platform-flags.ts</files>
  <action>
Create src/lib/flags/platform-flags.ts - platform-based flag resolution (primary source):

```typescript
import { db } from '@/lib/db';
import { settings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { SETTINGS_KEYS } from '@/lib/tenant/settings';

// ============================================
// PLATFORM PAGE FLAGS
// Primary source of truth for core page visibility
// ============================================

export interface PlatformPageFlags {
  campaign: boolean;
  conservation: 'default' | 'managed' | 'external';
  conservationExternalUrl: string;
  chat: boolean;
  news: boolean;
  events: boolean;
  directory: boolean;
}

const DEFAULT_PAGE_FLAGS: PlatformPageFlags = {
  campaign: true,
  conservation: 'default',
  conservationExternalUrl: '',
  chat: true,
  news: true,
  events: true,
  directory: true,
};

/**
 * Get page flags for tenant from platform settings
 * This is the PRIMARY source of truth for page visibility
 */
export async function getPlatformPageFlags(tenantId: string): Promise<PlatformPageFlags> {
  try {
    const tenantSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));

    const flags: PlatformPageFlags = { ...DEFAULT_PAGE_FLAGS };

    for (const setting of tenantSettings) {
      switch (setting.key) {
        case SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED:
          flags.campaign = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_CONSERVATION_MODE:
          if (['default', 'managed', 'external'].includes(setting.value)) {
            flags.conservation = setting.value as PlatformPageFlags['conservation'];
          }
          break;
        case SETTINGS_KEYS.PAGE_CONSERVATION_URL:
          flags.conservationExternalUrl = setting.value;
          break;
        case SETTINGS_KEYS.PAGE_CHAT_ENABLED:
          flags.chat = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_NEWS_ENABLED:
          flags.news = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_EVENTS_ENABLED:
          flags.events = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_DIRECTORY_ENABLED:
          flags.directory = setting.value === 'true';
          break;
      }
    }

    return flags;
  } catch (error) {
    console.error('Failed to get platform page flags:', error);
    return DEFAULT_PAGE_FLAGS;
  }
}

/**
 * Update a page flag for tenant (used by admin UI)
 */
export async function setPlatformPageFlag(
  tenantId: string,
  key: keyof PlatformPageFlags,
  value: string | boolean
): Promise<boolean> {
  try {
    const settingKey = mapFlagToSettingKey(key);
    if (!settingKey) return false;

    // Upsert the setting
    await db
      .insert(settings)
      .values({
        tenantId,
        key: settingKey,
        value: String(value),
      })
      .onConflictDoUpdate({
        target: [settings.tenantId, settings.key],
        set: { value: String(value) },
      });

    return true;
  } catch (error) {
    console.error('Failed to set platform page flag:', error);
    return false;
  }
}

function mapFlagToSettingKey(key: keyof PlatformPageFlags): string | undefined {
  const mapping: Record<keyof PlatformPageFlags, string> = {
    campaign: SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED,
    conservation: SETTINGS_KEYS.PAGE_CONSERVATION_MODE,
    conservationExternalUrl: SETTINGS_KEYS.PAGE_CONSERVATION_URL,
    chat: SETTINGS_KEYS.PAGE_CHAT_ENABLED,
    news: SETTINGS_KEYS.PAGE_NEWS_ENABLED,
    events: SETTINGS_KEYS.PAGE_EVENTS_ENABLED,
    directory: SETTINGS_KEYS.PAGE_DIRECTORY_ENABLED,
  };
  return mapping[key];
}
```

Key patterns:

- **Primary source**: Platform DB is authoritative
- **Default values**: Fall back to tier defaults
- **Admin API**: setPlatformPageFlag for admin UI
- **Caching**: Can add cache layer later
  </action>
  <verify>
  ls src/lib/flags/platform-flags.ts && head -20 src/lib/flags/platform-flags.ts</verify>
  <done>Platform flags module created with DB as source of truth</done>
  </task>

<task type="auto">
  <name>Task 3: Create Statsig flags module with full targeting</name>
  <files>src/lib/flags/statsig-flags.ts</files>
  <action>
Create src/lib/flags/statsig-flags.ts with multi-entity targeting (tenant, user, household, role):

```typescript
import { flag, statsigAdapter } from '@flags-sdk/statsig';
import { dedupe } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';
import { db, users, households } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Statsig SDK is initialized at app startup
// Only used for A/B tests and phased rollouts

// ============================================
// IDENTIFY FUNCTION - Multi-entity targeting
// Supports: tenant, user, household, role
// ============================================

interface FlagEntities {
  tenant?: { id: string };
  user?: { id: string; role?: string; householdId?: string };
  household?: { id: string; type?: string };
}

const identify = dedupe(async ({ cookies }: { cookies: ReadonlyRequestCookies }) => {
  const tenantId = cookies.get('x-tenant-id')?.value;
  const userId = cookies.get('user-id')?.value;
  const authToken = cookies.get('better-auth-session')?.value;

  // If no user, return tenant-only context
  if (!userId && !authToken) {
    return {
      tenant: tenantId ? { id: tenantId } : undefined,
      user: undefined,
      household: undefined,
    };
  }

  // Get user details including household and role
  let userRole: string | undefined;
  let householdId: string | undefined;
  let householdType: string | undefined;

  if (userId) {
    const userData = await db
      .select({
        id: users.id,
        role: users.role,
        householdId: users.householdId,
        householdType: households.type,
      })
      .from(users)
      .leftJoin(households, eq(users.householdId, households.id))
      .where(eq(users.id, userId))
      .then(rows => rows[0]);

    userRole = userData?.role;
    householdId = userData?.householdId || undefined;
    householdType = userData?.householdType || undefined;
  }

  return {
    tenant: tenantId ? { id: tenantId } : undefined,
    user: userId
      ? {
          id: userId,
          role: userRole, // 'admin' | 'board' | 'resident' | 'user'
          householdId: householdId || undefined,
        }
      : undefined,
    household: householdId
      ? {
          id: householdId,
          type: householdType, // 'house' | 'apartment' | 'townhouse'
        }
      : undefined,
  };
});

// ============================================
// STATSIG EXPERIMENT FLAGS
// Secondary source - used for A/B testing and gradual rollouts
// ============================================

// Experiment: New dashboard design
export const newDashboard = flag<boolean, FlagEntities>({
  key: 'new_dashboard',
  identify,
  adapter: statsigAdapter.featureGate(gate => gate.value),
  defaultValue: false,
  decide() {
    return false;
  },
});

// Experiment: Chat UI v2
export const chatV2 = flag<boolean, FlagEntities>({
  key: 'chat_ui_v2',
  identify,
  adapter: statsigAdapter.featureGate(gate => gate.value),
  defaultValue: false,
  decide() {
    return false;
  },
});

// Phased rollout: New booking flow
export const newBookingFlow = flag<boolean, FlagEntities>({
  key: 'new_booking_flow',
  identify,
  adapter: statsigAdapter.featureGate(gate => gate.value),
  defaultValue: false,
  decide() {
    return false;
  },
});

// Tenant-specific: Custom branding for Soralia
export const customBrandingV2 = flag<boolean, FlagEntities>({
  key: 'custom_branding_v2',
  identify,
  adapter: statsigAdapter.featureGate(gate => gate.value),
  defaultValue: false,
  decide() {
    return false;
  },
});

// Household targeting: Premium features for houses only
export const premiumGardenFeatures = flag<boolean, FlagEntities>({
  key: 'premium_garden_features',
  identify,
  adapter: statsigAdapter.featureGate(gate => gate.value),
  defaultValue: false,
  decide({ entities }) {
    // Default: only houses have premium garden features
    if (!entities?.household) return false;
    return entities.household.type === 'house';
  },
});

// Role targeting: Admin-only analytics feature
export const adminAnalyticsPlus = flag<boolean, FlagEntities>({
  key: 'admin_analytics_plus',
  identify,
  adapter: statsigAdapter.featureGate(gate => gate.value),
  defaultValue: false,
  decide({ entities }) {
    // Default: only admins see it
    if (!entities?.user) return false;
    return entities.user.role === 'admin';
  },
});

// ============================================
// STATSIG FLAGS LIST (for batch evaluation)
// ============================================

export const EXPERIMENT_FLAGS = [
  newDashboard,
  chatV2,
  newBookingFlow,
  customBrandingV2,
  premiumGardenFeatures,
  adminAnalyticsPlus,
];

/**
 * Get all experiment flags
 */
export async function getStatsigExperimentFlags(): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};

  for (const experiment of EXPERIMENT_FLAGS) {
    flags[experiment.key] = await experiment();
  }

  return flags;
}
```

**Statsig Console Targeting Examples:**

```
GATE: new_dashboard
├── Targeting:
│   ├── tenant.id = 'soralia' → 100%
│   └── tenant.id = 'capenature' → 0%
│
GATE: new_booking_flow
├── Phased rollout:
│   ├── 10% → increase to 50% → 100%
│
GATE: premium_garden_features
├── Targeting:
│   ├── household.type = 'house' → 100%
│   └── household.type = 'apartment' → 0%
│
GATE: admin_analytics_plus
├── Targeting:
│   └── user.role = 'admin' → 100%
│
GATE: chat_v2
├── For authenticated users: 50% rollout
```

  </action>
  <verify>
ls src/lib/flags/statsig-flags.ts && grep -q "household" src/lib/flags/statsig-flags.ts</verify>
  <done>Statsig flags with tenant/user/household/role targeting</done>
</task>

<task type="auto">
  <name>Task 4: Create unified flags API</name>
  <files>src/lib/flags/index.ts</files>
  <action>
Create src/lib/flags/index.ts - unified flag resolution (platform-first, Statsig fallback):

```typescript
import { getPlatformPageFlags, type PlatformPageFlags } from './platform-flags';
import { getStatsigExperimentFlags } from './statsig-flags';
import { withTenantOptional } from '@/lib/tenant/with-tenant';

// ============================================
// UNIFIED FLAGS API
// Platform as primary source, Statsig as secondary
// ============================================

export interface AllPageFlags extends PlatformPageFlags {
  // Experiment flags (from Statsig)
  newDashboard: boolean;
  chatV2: boolean;
  newBookingFlow: boolean;
}

/**
 * Get all flags for page visibility
 * Platform is PRIMARY source of truth
 */
export async function getPageFlags(): Promise<AllPageFlags> {
  // Get tenant context
  const { tenantId } = await withTenantOptional();
  const resolvedTenantId = tenantId || 'default';

  // Platform flags (primary)
  const platformFlags = await getPlatformPageFlags(resolvedTenantId);

  // Statsig experiments (secondary)
  const statsigFlags = await getStatsigExperimentFlags();

  // Merge: platform + statsig experiments
  return {
    ...platformFlags,
    ...statsigFlags,
  };
}

/**
 * Get specific page visibility flag
 * Use this for individual page checks
 */
export async function getPageFlag(flag: keyof PlatformPageFlags): Promise<boolean | string> {
  const flags = await getPageFlags();
  return flags[flag];
}

/**
 * Get experiment flag
 */
export async function getExperimentFlag(experiment: string): Promise<boolean> {
  const experiments = await getStatsigExperimentFlags();
  return experiments[experiment] || false;
}

/**
 * Initialize Statsig SDK at app startup
 * Called once from app initialization
 */
export async function initializeStatsig(): Promise<void> {
  // Statsig SDK initialization happens automatically via @statsig/react-bindings provider
  // This function is for server-side initialization if needed
  console.log('Statsig SDK initialized');
}
```

Key patterns:

- **Platform-first**: Core page visibility from DB
- **Statsig fallback**: Experiments from Statsig
- **Unified API**: Single entry point for components
  </action>
  <verify>
  ls src/lib/flags/index.ts && head -20 src/lib/flags/index.ts</verify>
  <done>Unified flags API created</done>
  </task>

<task type="auto">
  <name>Task 5: Create flags API endpoint</name>
  <files>src/app/api/flags/route.ts</files>
  <action>
Create the flags API endpoint:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPageFlags, getPageFlag, getExperimentFlag } from '@/lib/flags';
import { withTenantOptional } from '@/lib/tenant/with-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const flagParam = searchParams.get('flag');
    const experiments = searchParams.get('experiments');

    // Get tenant context
    const { tenantId } = await withTenantOptional();

    // Return all flags
    if (!flagParam && !experiments) {
      const allFlags = await getPageFlags();
      return NextResponse.json({ flags: allFlags, tenantId });
    }

    // Return specific page flag
    if (flagParam) {
      const value = await getPageFlag(flagParam as any);
      return NextResponse.json({ flag: flagParam, value, tenantId });
    }

    // Return experiment flags only
    if (experiments === 'true') {
      const expFlags = await getStatsigExperimentFlags();
      return NextResponse.json({ experiments: expFlags, tenantId });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Flags API error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate flags', detail: String(error) },
      { status: 500 }
    );
  }
}
```

Add appropriate caching headers (no cache for flags).
</action>
<verify>
ls src/app/api/flags/route.ts && echo "Endpoint created"</verify>
<done>Flags API endpoint created at /api/flags</done>
</task>

<task type="auto">
  <name>Task 6: Fix i18n rendering error in Header</name>
  <files>src/components/layout/Header.tsx</files>
  <action>
Fix the "Objects are not valid as React child" error in Header.tsx line 104:

```typescript
// Replace this pattern (lines 102-105):
const campaignLabel = campaignConfig?.linkLabel
  ? campaignConfig.linkLabel[i18n.language] || campaignConfig.linkLabel.en
  : t('nav.campaign');

// With this safe pattern:
const getLocalizedLabel = (labelObj: Record<string, string> | null | undefined): string => {
  if (!labelObj || typeof labelObj !== 'object') return '';
  return labelObj[i18n.language] || labelObj.en || '';
};

const campaignLabel = getLocalizedLabel(campaignConfig?.linkLabel) || t('nav.campaign');
```

Search entire Header.tsx for any other multilingual objects rendered without localization.
</action>
<verify>
npm run typecheck 2>&1 | head -30</verify>
<done>i18n error fixed in Header.tsx</done>
</task>

<task type="auto">
  <name>Task 7: Update Header for dynamic pages</name>
  <files>src/components/layout/Header.tsx</files>
  <action>
Update Header.tsx to use unified flags API:

```typescript
// Add imports
import { getPageFlags, type AllPageFlags } from '@/lib/flags';

// Add state
const [pageFlags, setPageFlags] = useState<AllPageFlags | null>(null);

// Fetch on mount
useEffect(() => {
  async function fetchPageFlags() {
    try {
      const res = await fetch('/api/flags');
      const data = await res.json();
      setPageFlags(data.flags);
    } catch (error) {
      console.error('Failed to fetch page flags:', error);
    }
  }
  fetchPageFlags();
}, []);

// Conditional nav items based on flags
const navItems = [
  { label: t('nav.home'), href: '/' },
  pageFlags?.directory !== false && { label: t('nav.directory'), href: '/directory' },
  pageFlags?.news !== false && { label: t('nav.news'), href: '/news' },
  pageFlags?.events !== false && { label: t('nav.events'), href: '/events' },
  pageFlags?.conservation !== 'external' && { label: t('nav.conservation'), href: '/conservation' },
  pageFlags?.campaign !== false && { label: campaignLabel, href: '/campaign' },
].filter(Boolean);
```

Note: Use `!== false` to allow undefined (defaults to true).
</action>
<verify>
grep -q "pageFlags" src/components/layout/Header.tsx</verify>
<done>Header uses dynamic page flags</done>
</task>

<task type="auto">
  <name>Task 8: Update conservation page for mode support</name>
  <files>src/app/conservation/page.tsx</files>
  <action>
Update conservation page to support three modes:

```typescript
// Add import
import { getPageFlag } from '@/lib/flags';

// Add state
const [conservationMode, setConservationMode] = useState<'default' | 'managed' | 'external'>('default');
const [externalUrl, setExternalUrl] = useState<string>('');

// Fetch mode on mount
useEffect(() => {
  async function fetchMode() {
    const mode = await getPageFlag('conservation');
    const url = await getPageFlag('conservationExternalUrl');
    setConservationMode(mode as any);
    setExternalUrl(url as string);
  }
  fetchMode();
}, []);

// Render based on mode
switch (conservationMode) {
  case 'external':
    return <iframe src={externalUrl} className="w-full h-screen" title="Conservation Portal" />;
  case 'managed':
    return <ConservationManagedContent />;
  case 'default':
  default:
    return <ConservationDefaultContent />;
}
```

  </action>
  <verify>
grep -q "conservationMode" src/app/conservation/page.tsx</verify>
  <done>Conservation page supports mode flag</done>
</task>

<task type="auto">
  <name>Task 9: Update campaign page for toggle</name>
  <files>src/app/campaign/page.tsx</files>
  <action>
Update campaign page to respect toggle:

```typescript
// Add import
import { getPageFlag } from '@/lib/flags';

// Add state
const [campaignEnabled, setCampaignEnabled] = useState<boolean>(true);

// Fetch on mount
useEffect(() => {
  async function checkEnabled() {
    const enabled = await getPageFlag('campaign');
    setCampaignEnabled(enabled !== false);
  }
  checkEnabled();
}, []);

// Show "not available" when disabled
if (!campaignEnabled) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">Campaign is not available for this community.</p>
    </div>
  );
}
```

  </action>
  <verify>
grep -q "campaignEnabled" src/app/campaign/page.tsx</verify>
  <done>Campaign page respects toggle</done>
</task>

<task type="auto">
  <name>Task 10: Update SideDrawer for dynamic nav</name>
  <files>src/components/ui/SideDrawer.tsx</files>
  <action>
Update SideDrawer to use dynamic nav based on flags:

```typescript
// Similar to Header, fetch flags and filter links
import { getPageFlags } from '@/lib/flags';

// Add state and fetch in useEffect
const [pageFlags, setPageFlags] = useState<any>(null);

useEffect(() => {
  fetch('/api/flags')
    .then(res => res.json())
    .then(data => setPageFlags(data.flags));
}, []);

// Filter links based on flags
const getFilteredLinks = (links: NavLink[]) => {
  if (!pageFlags) return links; // Show all while loading
  return links.filter(link => {
    if (link.href === '/campaign') return pageFlags.campaign !== false;
    if (link.href === '/conservation') return pageFlags.conservation !== 'external';
    if (link.href === '/news') return pageFlags.news !== false;
    if (link.href === '/events') return pageFlags.events !== false;
    if (link.href === '/directory') return pageFlags.directory !== false;
    return true;
  });
};
```

  </action>
  <verify>
grep -q "pageFlags" src/components/ui/SideDrawer.tsx</verify>
  <done>SideDrawer uses dynamic nav</done>
</task>

<task type="auto">
  <name>Task 11: Add admin API for page toggles</name>
  <files>src/app/api/admin/settings/page-flags/route.ts</files>
  <action>
Create admin API for managing page toggles (admin UI will use this):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { setPlatformPageFlag, type PlatformPageFlags } from '@/lib/flags/platform-flags';
import { withTenant } from '@/lib/tenant/with-tenant';
import { authClient } from '@/lib/auth/client';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const session = await authClient.getSession();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tenantId } = await withTenant();
    const body = await request.json();
    const { key, value } = body as { key: keyof PlatformPageFlags; value: string | boolean };

    // Validate key
    const validKeys = [
      'campaign',
      'conservation',
      'conservationExternalUrl',
      'chat',
      'news',
      'events',
      'directory',
    ];
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    const success = await setPlatformPageFlag(tenantId, key, value);

    if (success) {
      // Optionally revalidate pages
      // revalidatePath('/');
      return NextResponse.json({ success: true, key, value });
    }

    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  const { tenantId } = await withTenant();
  const flags = await getPlatformPageFlags(tenantId);
  return NextResponse.json(flags);
}
```

  </action>
  <verify>
ls src/app/api/admin/settings/page-flags/route.ts</verify>
  <done>Admin page flags API created</done>
</task>

<task type="auto">
  <name>Task 12: Install Flags SDK (for Statsig adapter)</name>
  <files>package.json</files>
  <action>
Install Flags SDK if needed for Statsig adapter:

```bash
pnpm add flags @flags-sdk/statsig statsig-node
```

Only needed if using Statsig for experiments. Otherwise can skip.
</action>
<verify>echo "Optional - install only if using Statsig experiments"</verify>
<done>Flags SDK packages installed (optional)</done>
</task>

</tasks>

<verification>
```bash
# TypeScript
npm run typecheck

# ESLint

npm run lint

# Build

npm run build

# Test flags endpoint

curl http://localhost:3000/api/flags

```
</verification>

<success_criteria>
- [ ] Page toggles stored in platform settings (DB as source of truth)
- [ ] Platform flags module (src/lib/flags/platform-flags.ts) created
- [ ] Statsig flags module (src/lib/flags/statsig-flags.ts) for experiments only
- [ ] Unified flags API (src/lib/flags/index.ts) with platform-first resolution
- [ ] Flags API endpoint at /api/flags returns page visibility
- [ ] i18n error fixed in Header.tsx
- [ ] Header uses dynamic nav based on tenant flags
- [ ] Campaign page respects campaignEnabled flag
- [ ] Conservation page supports default/managed/external modes
- [ ] SideDrawer uses dynamic nav based on flags
- [ ] Admin API for page toggles (/api/admin/settings/page-flags)
- [ ] Statsig SDK installed (optional - only for experiments)
</success_criteria>

<output>
After completion, create `.planning/phases/pages-dynamic-tenant/{phase}-01-SUMMARY.md`
</output>

<user_setup>
Optional (only for A/B testing):
1. Create Statsig account at statsig.com
2. Get client key from Statsig console
3. Add to .env.local: STATSIG_CLIENT_KEY=client-xxx
4. Create experiment gates in Statsig console
5. Target experiments by tenant ID custom property
</user_setup>

## ADMINISTRATION MODEL

### Platform UI Controls (Primary Source)
```

┌─────────────────────────────────────────────┐
│ TENANT ADMIN PANEL │
├─────────────────────────────────────────────┤
│ Page Visibility Settings: │
│ □ Campaign Page [toggle] │
│ □ Conservation Mode [default ▼] │
│ External URL: [____________] │
│ □ Chat Page [toggle] │
│ □ News Page [toggle] │
│ □ Events Page [toggle] │
│ □ Directory [toggle] │
│ │
│ [Save Changes] │
└─────────────────────────────────────────────┘
│
▼ Settings table (per tenant)

```

### Statsig Console (Experiments Only - Optional)
```

┌─────────────────────────────────────────────┐
│ STATSIG CONSOLE │
├─────────────────────────────────────────────┤
│ Experiments (NOT page visibility): │
│ - new_dashboard: A/B test │
│ - chat_ui_v2: 50% rollout │
│ - new_booking_flow: 10% → 100% │
│ │
│ Targeting: by tenant ID │
└─────────────────────────────────────────────┘
│
▼ Experiment flags (merged in)

```

### Flag Resolution Flow
```

Component requests /api/flags
│
▼
┌─────────────────────────────────┐
│ Platform DB (primary) │
│ - page_campaign_enabled = true │
│ - page_conservation_mode = external│
└─────────────────────────────────┘
│ (if Statsig enabled)
▼
┌─────────────────────────────────┐
│ Statsig (experiments only) │
│ - new_dashboard = false │
│ - chat_v2 = true │
└─────────────────────────────────┘
│
▼
┌─────────────────────────────────────┐
│ Unified response: │
│ { campaign: true, │
│ conservation: 'external', │
│ conservationExternalUrl: '...',│
│ newDashboard: false, ... } │
└─────────────────────────────────────┘

```

### Tenant Onboarding Integration
```

1. Tenant chooses tier (Foundation/Core/Pro-Max)
2. Tier modules → tenant.modules (existing)
3. Default page toggles → settings table (NEW)
4. tenant.settings['page_campaign_enabled'] = true (from tier defaults)
5. Admin can override from Admin UI

```

```

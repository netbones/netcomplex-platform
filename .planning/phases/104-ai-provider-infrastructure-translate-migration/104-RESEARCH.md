# Phase 104: AI Provider Infrastructure & Translate Migration - Research

**Researched:** 2026-06-25
**Domain:** AI Provider Abstraction / Platform Infrastructure
**Confidence:** HIGH

## Summary

Phase 104 creates a platform-wide AI provider abstraction at `src/shared/api/ai/` that serves as the single choke point for all AI API calls. It supports Anthropic (Claude Haiku 4.5 via `@anthropic-ai/sdk`), OpenAI (GPT-4o-mini via `openai` SDK), and DeepSeek (via OpenAI SDK with `baseURL: 'https://api.deepseek.com/v1'`). The existing translate route is migrated from raw `fetch()` to the provider abstraction. Tenant API keys are stored encrypted with AES-256-GCM in the existing `Setting` table.

**Primary recommendation:** Create the provider layer as a pure server-side shared module following the established `src/shared/api/server/index.ts` barrel convention. Implement `getTenantModule()` as a new helper (does not exist yet). Build the `getAiProvider()` factory as a null-safe pattern that always returns a provider — either a real one or a `NullProvider`.

## Architectural Responsibility Map

| Capability                           | Primary Tier     | Secondary Tier | Rationale                                                              |
| ------------------------------------ | ---------------- | -------------- | ---------------------------------------------------------------------- |
| AI provider abstraction              | API / Backend    | —              | All AI calls are server-side; provider logic must never leak to client |
| API key encryption/decryption        | API / Backend    | —              | Node.js `crypto` module, server-only                                   |
| Admin key management UI              | Browser / Client | API / Backend  | Widget renders in admin space; API routes handle encryption            |
| Capacity check (isCapabilityEnabled) | API / Backend    | —              | Reads TenantModule.config, never client-exposed                        |
| Translate route                      | API / Backend    | —              | Existing route, migrated to provider abstraction                       |

## Phase Requirements

| ID         | Description                                                  | Research Support                                                               |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| AI-PROV-01 | AI Provider abstraction layer (shared/api/ai/)               | §§2–5 below confirm SDK availability, factory pattern, FSD placement           |
| AI-PROV-02 | Encryption infrastructure for tenant API keys                | §6 below confirms Setting table capability, no existing encryption, crypto API |
| AI-PROV-03 | Translate route migration + LocaleAwareEditor degraded state | §1 below documents current route; §8 documents current editor state            |

---

## 1. Existing Code Analysis

### 1.1 Translate Route (`src/app/api/translate/route.ts`)

**Current behavior:**

- Uses raw `fetch()` to `https://api.openai.com/v1/chat/completions` — **no OpenAI SDK**
- Reads settings from `settings` Drizzle table using `SETTINGS_KEYS.TRANSLATION_API_KEY` (`'translation_api_key'`) and `SETTINGS_KEYS.TRANSLATION_PROVIDER` (`'translation_provider'`)
- Provider key maps: `'translation_provider'` → `'openai'` (only supported value; else 400 error)
- Model hardcoded: `gpt-4o-mini`, temperature `0.1`, max_tokens `4096`
- Calls `await withTenant()` on line 48 **but does not destructure the return value** — tenant context is validated but tenantId is not passed into settings queries (settings table queries filter only by `key`, not by `tenantId`). This may rely on RLS or may be a latent tenant-isolation gap — **NOT in scope to fix in this phase per advisory**.
- Uses `apiSuccess`, `apiError`, `apiInternalError` from `@api/server`
- Auth via `getSessionAndRole()` — requires authentication
- Input validation via Zod: `sourceLocale`, `targetLocale`, `content`
- Error codes: `TRANSLATION_NOT_CONFIGURED` (402), `TRANSLATION_FAILED` (502), `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401)
- `maxDuration = 15` (seconds)

**Provider field values (current SETTINGS_KEYS):**

```typescript
TRANSLATION_PROVIDER: 'translation_provider',  // snake_case
TRANSLATION_API_KEY: 'translation_api_key',     // snake_case
```

**Key constraint for migration:** The advisory specifies new setting keys using dot-notation (`ai.openai.key`, `ai.anthropic.key`, `ai.provider.default`). The existing translate route uses snake_case. The migration must:

1. Keep the existing `translation_api_key` / `translation_provider` settings for backward compatibility during transition, OR
2. Migrate the existing key to the new namespace during the phase

**Recommendation:** Keep existing settings keys for backward compat for 1 release cycle, but have the new `getAiProvider()` factory prefer the new `ai.*` keys. If neither exists, return `NullProvider`.

### 1.2 API Response Patterns

**Established pattern (`src/shared/api/server/index.ts`):**

- `apiSuccess(data)` — wraps data in `{ success: true, data }`
- `apiError(code, message, status, details?)` — `{ success: false, error: { code, message, details } }`
- `apiInternalError()` — 500 with `INTERNAL_ERROR` code
- Canonical error codes: `UNAUTHORIZED`, `VALIDATION_ERROR`, `FEATURE_DISABLED`, `NOT_FOUND`, `INTERNAL_ERROR`
- For this phase: use `apiError('FEATURE_DISABLED', ..., 403)` when AI capability is disabled; use `apiError('VALIDATION_ERROR', ..., 400)` for invalid provider config; use `apiError('INTERNAL_ERROR', ..., 500)` for encryption/decryption failures

**Server barrel (`@api/server`):** Re-exports Drizzle tables, auth helpers, api-response functions, rate-limit, revalidation, etc. The `@api/server` alias maps to `src/shared/api/server/index.ts` per tsconfig.

### 1.3 Settings Table (`prisma/schema.prisma`)

```prisma
model Setting {
  id            String   @id
  tenantId      String
  key           String
  value         String     // plain text — sufficient for storing encrypted strings (base64/hex)
  schemaVersion Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @default(now()) @updatedAt

  @@unique([tenantId, key])
}
```

**Encrypted storage verdict: SUITABLE.** The `value` field is a plain `String` — AES-256-GCM ciphertext (with IV + auth tag) can be stored as hex or base64. No schema migration needed.

**Current settings key convention:** snake_case (`translation_api_key`, `page_chat_enabled`). The advisory proposes dot-notation (`ai.anthropic.key`, `ai.openai.key`). Both conventions coexist in this codebase — the key is just a string identifier, not a database constraint. No issue mixing conventions.

### 1.4 Tenant Module System

**`TenantModule` model:**

```prisma
model TenantModule {
  id        String         @id @default(cuid())
  tenantId  String
  moduleKey String
  enabled   Boolean        @default(false)
  config    Json?           // ← stores per-module config including AI capabilities
  enabledAt DateTime?
  module    PlatformModule @relation(fields: [moduleKey], references: [key])
  tenant    Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, moduleKey])
  @@index([moduleKey])
}
```

**Critical finding: `getTenantModule()` does NOT exist.** The advisory's pseudocode calls `getTenantModule(tenantId, 'ai-provider')` which returns the full `TenantModule` record (including `config`). The existing helpers only provide:

- `isModuleEnabled(tenantId, moduleKey): boolean` — does NOT return config
- `assertModuleEnabled(tenantId, moduleKey): void` — throws if not enabled

**Required new helper:**

```typescript
// src/entities/tenant/lib/modules/get-tenant-module.ts
export async function getTenantModule(tenantId: string, moduleKey: string) {
  const [tm] = await db
    .select()
    .from(tenantModules)
    .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.moduleKey, moduleKey)))
    .limit(1);
  return tm ?? null; // null if no explicit record (module not activated for tenant)
}
```

Similarly, `getSettingValue()` does NOT exist. Settings are currently read inline via `db.select().from(settings).where(eq(settings.key, ...))`. The advisory's pseudocode uses `getSettingValue(tenantId, 'ai.anthropic.key')` — this needs to be created or the existing inline pattern should be used.

**Recommendation:** Create `getTenantModule()` and `getSettingValue()` as small helpers. Place `getTenantModule()` in `src/entities/tenant/lib/modules/` alongside `assert-module-enabled.ts`. Place `getSettingValue()` in a new `src/entities/tenant/api/settings-service.ts`.

### 1.5 Module Seeding Pattern

**Current pattern (`prisma/seed/modules.ts`):**

```typescript
import { PrismaClient, type Tier } from '@prisma/client';

const prisma = new PrismaClient();
const tierMap: Record<string, Tier> = {
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
  ENTERPRISE: 'ENTERPRISE',
} as const;

const modules = [
  {
    key: 'dashboard', // module key — unique identifier
    label: 'Dashboard', // display name
    minTier: tierMap.STANDARD, // Tier enum from Prisma
    defaultEnabled: true, // auto-enabled for tenants at sufficient tier
    description: 'User dashboard with widgets',
  },
  // ...
];

async function main() {
  for (const m of modules) {
    await prisma.platformModule.upsert({
      where: { key: m.key },
      update: m,
      create: m,
    });
  }
}
```

**New entry to add:**

```typescript
{
  key: 'ai-provider',
  label: 'AI Provider',
  description: 'Connect an AI provider (Anthropic, OpenAI, or DeepSeek) to enable AI-powered features across the platform',
  minTier: tierMap.STANDARD,
  defaultEnabled: false,  // tenant must explicitly enable
},
```

**Key naming convention:** Lowercase kebab-case (`ai-provider`, `community-services`, `agent-marketplace`). Follows existing convention exactly.

### 1.6 Widget Registration Pattern

**Pattern from `src/widgets/dashboard/model/widgets.ts`:**

```typescript
registry.register({
  id: 'admin-ai-provider', // unique widget ID (kebab-case)
  version: '1.0.0',
  name: 'AI Provider',
  description: 'Configure AI provider keys and features',
  author: 'internal',
  category: 'core',
  icon: Sparkles, // LucideIcon component (imported at top)
  featureFlag: 'ai-provider', // module key — hidden when module disabled
  permissions: ['admin'], // admin-only widget
  component: lazy(() =>
    import('../../admin/ui/AiProviderSettingsWidget').then(m => ({
      default: m.AiProviderSettingsWidget,
    }))
  ),
  loader: () => import('../../admin/ui/AiProviderSettingsWidget'),
  defaultSize: { width: 3, height: 3 },
  minSize: { width: 3, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
  spaces: ['admin'], // Focus Spaces architecture — admin space only
});
```

**Verified:**

- `Sparkles` icon exists in `lucide-react` (node_modules/lucide-react/dist/esm/icons/sparkles.js)
- Admin-only pattern: `permissions: ['admin']` in combination with `spaces: ['admin']` (see `admin-stats`, `admin-system`, `page-settings` for identical pattern)
- Widget imports use `lazy(() => import(...).then(m => ({ default: m.ComponentName })))` pattern
- The `loader` field duplicates the import path for preloading

**WidgetManifest interface key fields:**

```typescript
interface WidgetManifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  author: 'internal' | 'netcomplex-premium' | string;
  icon: LucideIcon;
  category: 'core' | 'content' | 'communication' | 'premium' | 'utility';
  component: LazyExoticComponent<WidgetComponent>;
  featureFlag?: string;
  premium?: boolean;
  permissions?: ('resident' | 'board' | 'admin' | 'agent')[];
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  dragHandleClassName?: string;
  spaces: SpaceId[]; // REQUIRED field since Phase 30
}
```

### 1.7 LocaleAwareEditor (`src/features/i18n/ui/LocaleAwareEditor.tsx`)

**Current translation behavior:**

- Calls `POST /api/translate` with `{ sourceLocale, targetLocale, content }`
- Reads response as JSON: `const body = await res.json();`
- On success: extracts `body?.data?.content ?? body?.content`, writes to locale content
- On failure: sets `translateError` state (shown as red text in footer: `{translateError && <span className="ml-2 text-rose-600">{translateError}</span>}`)
- Loading state: `translatingLocale` state disables the translate button and shows `animate-spin` spinner on the Globe icon
- **No degraded state for AI-unavailable** — error is shown reactively but there's no pre-flight check or capability check

**Degraded state needed:** When the translate route returns 503 (AI not configured), the editor should show a contextual message: "AI translation is not available for your community. Contact your administrator to configure an AI provider." The Globe button should remain visible but show a tooltip explaining why translation is unavailable.

**Implementation approach for degraded state:**

1. Add a `translationCapable` boolean prop or context value
2. Fetch capability server-side and pass to client
3. When `translationCapable === false`: show the Globe icon with a muted style + tooltip; clicking shows an info toast instead of making an API call

---

## 2. Encryption Strategy

### 2.1 Node.js AES-256-GCM via `crypto` Module

**No existing encryption in the codebase.** The only `crypto` usage is `crypto.randomUUID()` and `crypto.createHmac('sha512', ...)` (Paystack webhook verification). No AES, no encrypt/decrypt — this is a completely new implementation.

**API reference (Node.js built-in `crypto` module):**

```typescript
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — recommended for GCM

// Key derivation: AI_SETTINGS_ENCRYPTION_KEY must be 32 bytes (256 bits)
// Accept hex or base64 encoded key in env var

export function encryptKey(plaintext: string, encryptionKey: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptKey(encrypted: string, encryptionKey: Buffer): string {
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted key format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Key length:** AES-256 requires a 32-byte (256-bit) key. The `AI_SETTINGS_ENCRYPTION_KEY` env var must be exactly 32 bytes. Accept hex (64 chars) or base64 (44 chars) and decode to Buffer.

**IV handling:** 12-byte random IV generated per encryption operation, prepended to ciphertext. No IV reuse risk since each encryption is a fresh random IV.

**Auth tag:** GCM provides authenticated encryption — tampered ciphertext will fail decryption with an error. This is a feature, not a bug.

**Storage format:** `hex(iv):hex(authTag):hex(ciphertext)` — stored in `Setting.value` as a plain string. ~200-300 chars for a typical API key (sk-ant-... is ~80 chars).

### 2.2 Encryption Key Management

**Environment variable:**

```bash
# Generate: openssl rand -hex 32
AI_SETTINGS_ENCRYPTION_KEY="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
```

**Key rotation:** Per advisory, a migration script (`scripts/rotate-ai-keys.ts`) reads all `ai.*.key` Settings, decrypts with old key, re-encrypts with new key, in a transaction per tenant. NOT in scope for this phase but the format is designed to support it.

**Startup validation:** The app should validate `AI_SETTINGS_ENCRYPTION_KEY` is present and 32 bytes at startup. If absent, log a warning (not crash — the app should work without AI features).

---

## 3. Provider Architecture

### 3.1 SDK Availability

| Provider  | SDK Package              | Installed?       | Action                                                          |
| --------- | ------------------------ | ---------------- | --------------------------------------------------------------- |
| Anthropic | `@anthropic-ai/sdk`      | ❌ NOT installed | `pnpm add @anthropic-ai/sdk`                                    |
| OpenAI    | `openai`                 | ❌ NOT installed | `pnpm add openai`                                               |
| DeepSeek  | None — uses `openai` SDK | —                | Same `openai` SDK with `baseURL: 'https://api.deepseek.com/v1'` |

**Note:** DeepSeek is OpenAI-API-compatible. The `openai` SDK constructor accepts `baseURL` — set it to `https://api.deepseek.com/v1` and pass the DeepSeek API key. No separate SDK required.

### 3.2 AiProvider Interface

```typescript
// src/shared/api/ai/provider.ts

export interface AiCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

export interface AiCompletionResult {
  text: string;
  provider: 'anthropic' | 'openai' | 'deepseek' | 'null';
  tokensUsed?: number;
}

export interface AiProvider {
  readonly name: 'anthropic' | 'openai' | 'deepseek' | 'null';
  complete(userPrompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult>;
  isAvailable(): boolean;
}
```

**Provider naming:** The advisory calls the third provider "openai" in the enum (since DeepSeek uses the OpenAI SDK under the hood). However, the completion result should distinguish `'deepseek'` from `'openai'` for observability. Decision: the `provider.ts` factory maps DeepSeek to `OpenAiProvider` but sets `name = 'deepseek'` internally. The interface supports this — `name` is a string union, not an SDK identifier.

### 3.3 Provider Implementations

**AnthropicProvider:**

```typescript
// src/shared/api/ai/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  isAvailable() {
    return true;
  }

  async complete(userPrompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20241022', // [ASSUMED] verify exact model ID against Anthropic docs
      max_tokens: options?.maxTokens ?? 1000,
      temperature: options?.temperature ?? 0,
      system: options?.systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return {
      text: response.content[0]?.type === 'text' ? response.content[0].text : '',
      provider: 'anthropic',
      tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
    };
  }
}
```

**OpenAiProvider:**

```typescript
// src/shared/api/ai/openai.ts
import OpenAI from 'openai';

export class OpenAiProvider implements AiProvider {
  readonly name: 'openai' | 'deepseek';
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.name = baseURL?.includes('deepseek') ? 'deepseek' : 'openai';
    this.client = new OpenAI({ apiKey, baseURL });
  }

  isAvailable() {
    return true;
  }

  async complete(userPrompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: this.name === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
      max_tokens: options?.maxTokens ?? 1000,
      temperature: options?.temperature ?? 0,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user' as const, content: userPrompt },
      ],
      ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    return {
      text: response.choices[0]?.message?.content ?? '',
      provider: this.name,
      tokensUsed: response.usage?.total_tokens,
    };
  }
}
```

**NullProvider:**

```typescript
// src/shared/api/ai/null-provider.ts
export class NullProvider implements AiProvider {
  readonly name = 'null' as const;
  isAvailable() {
    return false;
  }
  async complete(): Promise<AiCompletionResult> {
    return { text: '', provider: 'null', tokensUsed: 0 };
  }
}
```

### 3.4 Factory Function

```typescript
// src/shared/api/ai/provider.ts
import { getTenantModule } from '@entities/tenant/lib/modules/get-tenant-module';
import { db, settings } from '@api/server';
import { eq } from 'drizzle-orm';

export async function getAiProvider(tenantId: string): Promise<AiProvider> {
  const module = await getTenantModule(tenantId, 'ai-provider');
  if (!module?.enabled) return new NullProvider();

  const config = module.config as AiProviderModuleConfig | null;
  const provider = config?.defaultProvider ?? 'none';

  if (provider === 'anthropic') {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'ai.anthropic.key'))
      .limit(1);
    if (!row?.value) return new NullProvider();
    const apiKey = decryptKey(row.value, getEncryptionKey());
    return new AnthropicProvider(apiKey);
  }

  if (provider === 'openai') {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'ai.openai.key'))
      .limit(1);
    if (!row?.value) return new NullProvider();
    const apiKey = decryptKey(row.value, getEncryptionKey());
    return new OpenAiProvider(apiKey);
  }

  if (provider === 'deepseek') {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'ai.deepseek.key'))
      .limit(1);
    if (!row?.value) return new NullProvider();
    const apiKey = decryptKey(row.value, getEncryptionKey());
    return new OpenAiProvider(apiKey, 'https://api.deepseek.com/v1');
  }

  return new NullProvider();
}
```

**Setting keys for DeepSeek:** The advisory doesn't explicitly mention a DeepSeek setting key (it focuses on Anthropic + OpenAI). Since Gate G6 resolved to include DeepSeek, add `ai.deepseek.key` as a setting key. This is also needed for the admin UI's third provider slot.

---

## 4. FSD Layer Placement

### 4.1 Directory Structure

```
src/shared/api/ai/
├── index.ts              # Public barrel: getAiProvider, isAiCapabilityEnabled, AiCapabilityKey
├── provider.ts           # AiProvider interface + getAiProvider factory
├── anthropic.ts          # AnthropicProvider
├── openai.ts             # OpenAiProvider (also used for DeepSeek)
├── null-provider.ts      # NullProvider (graceful degradation)
├── encryption.ts         # encryptKey / decryptKey / getEncryptionKey
└── __tests__/
    ├── provider.test.ts
    └── encryption.test.ts
```

### 4.2 Server-Only Enforcement

All files in `src/shared/api/ai/` are server-only (use `crypto`, `@anthropic-ai/sdk`, `openai` SDK). Each file should import `'server-only'` at the top.

**Barrel re-export:** Add to `src/shared/api/server/index.ts`:

```typescript
export { getAiProvider, isAiCapabilityEnabled, assertAiCapabilityEnabled } from '../ai';
export type { AiProvider, AiCompletionOptions, AiCompletionResult, AiCapabilityKey } from '../ai';
```

### 4.3 Entity Layer Re-export (FSD compliance)

Per advisory Section 9, create:

```
src/entities/tenant/api/ai-capabilities.ts   # wraps shared/api/ai for entity barrel
```

This wraps `isAiCapabilityEnabled` and re-exports it from the entity barrel so features don't import from shared directly. However, the advisory also says `shared/api/ai/` is a shared layer — entities may import from it. The entity wrapper is for semantic grouping, not FSD enforcement.

### 4.4 New Entity Helpers

Files to create:

- `src/entities/tenant/lib/modules/get-tenant-module.ts` — `getTenantModule(tenantId, moduleKey)` returns `TenantModule | null`
- `src/entities/tenant/api/settings-service.ts` — `getSettingValue(tenantId, key)` / `setSettingValue(tenantId, key, value)` / `deleteSettingValue(tenantId, key)`

---

## 5. Provider SDK Installation

**Required packages (not installed):**

```bash
pnpm add @anthropic-ai/sdk openai
```

**Verification:**

- `@anthropic-ai/sdk` — latest as of 2026-06 is ~0.39.x
- `openai` — latest is ~4.x

Neither package is currently in `package.json`. Both are in the `dependencies` section.

---

## 6. Package Legitimacy Audit

| Package             | Registry | Age    | Downloads | Source Repo                                    | Verdict   | Disposition          |
| ------------------- | -------- | ------ | --------- | ---------------------------------------------- | --------- | -------------------- |
| `@anthropic-ai/sdk` | npm      | ~3 yrs | High      | github.com/anthropics/anthropic-sdk-typescript | [ASSUMED] | Pending verification |
| `openai`            | npm      | ~4 yrs | Very High | github.com/openai/openai-node                  | [ASSUMED] | Pending verification |

> **Note:** Both packages are established, well-known SDKs from the respective AI providers. However, per the provenance protocol, they are tagged `[ASSUMED]` until verified via official documentation or Context7 + `gsd-tools query package-legitimacy check`. The planner must gate installation behind a `checkpoint:human-verify` task.

---

## 7. Admin API Routes

### 7.1 Route Structure

```
src/app/api/admin/ai-provider/
├── status/route.ts     # GET  — returns { anthropicConfigured, openaiConfigured, deepseekConfigured, defaultProvider }
├── key/route.ts        # POST — encrypts and stores API key in Setting table
├── delete/route.ts     # DELETE — removes key Setting record
└── test/route.ts       # POST — performs a minimal completion to validate key works
```

### 7.2 Status Route

Returns configuration status WITHOUT exposing key values:

```typescript
// GET /api/admin/ai-provider/status
// Returns: { data: { anthropicConfigured: boolean, openaiConfigured: boolean, deepseekConfigured: boolean, defaultProvider: string, capabilities: Record<string, boolean> } }
```

### 7.3 Key Route

Accepts `{ provider: 'anthropic' | 'openai' | 'deepseek', key: 'sk-...' }`:

1. Validates auth (admin role)
2. Encrypts key via `encryptKey()`
3. Upserts into `settings` table with key `ai.<provider>.key`
4. Returns `{ stored: true }`

### 7.4 Test Route

Accepts `{ provider: 'anthropic' | 'openai' | 'deepseek' }`:

1. Creates provider instance
2. Calls `provider.complete('ping', { maxTokens: 5 })`
3. Returns `{ ok: true, provider, latencyMs }` or error

### 7.5 Auth Pattern

All routes use the established pattern:

```typescript
import { getSessionAndRole, apiSuccess, apiError } from '@api/server';
import { withTenant } from '@entities/tenant/server';

export async function GET(request: Request) {
  const auth = await getSessionAndRole(request);
  if (!auth) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (auth.role !== 'admin' && auth.role !== 'board') {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }
  const { tenantId } = await withTenant();
  // ...
}
```

---

## 8. Translate Route Migration

### 8.1 Migration Target

Current `src/app/api/translate/route.ts` → refactored to use `getAiProvider()`:

```typescript
import { getAiProvider, isAiCapabilityEnabled } from '@api/server'; // via server barrel
import { withTenant } from '@entities/tenant/server';

export async function POST(request: Request) {
  const auth = await getSessionAndRole(request);
  if (!auth) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const parsed = translateRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
  }

  const { sourceLocale, targetLocale, content } = parsed.data;
  if (sourceLocale === targetLocale) {
    return apiError('VALIDATION_ERROR', 'Source and target locales must differ', 400);
  }

  const { tenantId } = await withTenant();

  const capable = await isAiCapabilityEnabled(tenantId, 'ai.content.translation');
  if (!capable) {
    return apiError('FEATURE_DISABLED', 'AI translation is not enabled for this community', 503);
  }

  const provider = await getAiProvider(tenantId);
  if (!provider.isAvailable()) {
    return apiError('FEATURE_DISABLED', 'No AI provider is configured for this community', 503);
  }

  const sourceName = LANGUAGE_NAMES[sourceLocale] || sourceLocale;
  const targetName = LANGUAGE_NAMES[targetLocale] || targetLocale;

  try {
    const result = await provider.complete(content, {
      systemPrompt: `You are a professional translator. Translate the following HTML content from ${sourceName} to ${targetName}. Preserve all HTML tags, attributes, and structure exactly as-is. Only translate the text content between tags. Do not modify, add, or remove any HTML elements. Return only the translated HTML, no explanations.`,
      maxTokens: 4096,
      temperature: 0.1,
    });

    if (!result.text) {
      return apiError('TRANSLATION_FAILED', 'Translation returned empty result', 502);
    }

    return apiSuccess({
      content: result.text,
      sourceLocale,
      targetLocale,
      provider: result.provider,
    });
  } catch (error) {
    logError(
      { component: 'translate-api', operation: 'POST' },
      'Translation request failed',
      error
    );
    return apiError('TRANSLATION_FAILED', 'Translation service returned an error', 502);
  }
}
```

**Key changes:**

1. Destructure `tenantId` from `withTenant()` (was called but result unused)
2. Check `isAiCapabilityEnabled('ai.content.translation')` before calling provider
3. Replace raw `fetch()` with `provider.complete()`
4. Error codes change: 402 → 503 (service unavailable is more accurate)
5. Provider is now dynamic — `result.provider` reflects actual provider used

### 8.2 LocaleAwareEditor Degraded State

**Current error handling:** Shows `translateError` as red text in footer. No proactive capability check.

**Required degraded state:**

1. Add a server-fetched capability check. Option: fetch `GET /api/admin/ai-provider/status` on mount (admin-only) OR check at translation time and cache the result.
2. When AI unavailable: show the Globe icon with muted styling + tooltip "AI translation unavailable — configure an AI provider in community settings"
3. When 503 is returned: show "AI translation is not enabled for this community" instead of generic "Translation failed"

**Implementation recommendation (ponytail approach):** Don't add a pre-flight check. Instead, enhance the error handling in `handleTranslateToLocale`:

- Check if `res.status === 503` → set a persistent `translateCapable: false` state
- Show a contextual message: "AI translation unavailable — your community hasn't configured an AI provider yet"

This avoids an extra API call and works correctly on first failure.

---

## 9. Drizzle Output Directory Discrepancy

**Advisory says:** `src/db/schema/` (Section 4, Phase 1, item 5)  
**Actual config (`drizzle.config.ts`):** `./drizzle` (line 7)

The `drizzle/` directory sits at the repo root, NOT inside `src/`. This means Drizzle-generated schema files are NOT under `src/` and therefore NOT importable via `@schema/*` or `@/db/schema/*` without special aliasing.

**Impact on this phase:** None. This phase does NOT create new database models. The TenantModule `config` field already exists. The Setting table already exists. No schema migrations are needed.

**Impact on Phase 105 (Dispute Schema):** Phase 105 WILL create new models and will need to reconcile this discrepancy. Flagged for that phase's research.

---

## 10. Environment Variables

### 10.1 New Variables

```bash
# AI Provider — Platform encryption key for tenant API key storage
# Required for AI features. Generate with: openssl rand -hex 32
# Must be exactly 32 bytes (64 hex characters or 44 base64 characters)
AI_SETTINGS_ENCRYPTION_KEY=""

# Optional: Platform-owned fallback keys (for future metered pool)
# If set, used when tenant has not configured their own key
# PLATFORM_ANTHROPIC_KEY=""
# PLATFORM_OPENAI_KEY=""
# PLATFORM_DEEPSEEK_KEY=""
```

### 10.2 Existing AI-Related Variables

**None found.** The `.env.example` file does not contain any AI-related variables. The translate route currently expects API keys to be stored in the `settings` database table, not in environment variables.

---

## 11. Files to Create

| #   | File                                                       | Purpose                                                                                     |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | `src/shared/api/ai/index.ts`                               | Public barrel: `getAiProvider`, `isAiCapabilityEnabled`, `assertAiCapabilityEnabled`, types |
| 2   | `src/shared/api/ai/provider.ts`                            | `AiProvider` interface + `getAiProvider()` factory                                          |
| 3   | `src/shared/api/ai/anthropic.ts`                           | `AnthropicProvider` implementation                                                          |
| 4   | `src/shared/api/ai/openai.ts`                              | `OpenAiProvider` implementation (also used for DeepSeek)                                    |
| 5   | `src/shared/api/ai/null-provider.ts`                       | `NullProvider` (always returns empty, never throws)                                         |
| 6   | `src/shared/api/ai/encryption.ts`                          | `encryptKey()`, `decryptKey()`, `getEncryptionKey()`                                        |
| 7   | `src/shared/api/ai/__tests__/encryption.test.ts`           | Round-trip encryption test                                                                  |
| 8   | `src/shared/api/ai/__tests__/provider.test.ts`             | NullProvider + factory tests                                                                |
| 9   | `src/entities/tenant/lib/modules/get-tenant-module.ts`     | `getTenantModule(tenantId, moduleKey)`                                                      |
| 10  | `src/entities/tenant/api/settings-service.ts`              | `getSettingValue()`, `setSettingValue()`, `deleteSettingValue()`                            |
| 11  | `src/entities/tenant/api/ai-capabilities.ts`               | Entity-layer re-export of capability check                                                  |
| 12  | `src/app/api/admin/ai-provider/status/route.ts`            | GET status (key presence, not values)                                                       |
| 13  | `src/app/api/admin/ai-provider/key/route.ts`               | POST store encrypted key                                                                    |
| 14  | `src/app/api/admin/ai-provider/delete/route.ts`            | DELETE remove key                                                                           |
| 15  | `src/app/api/admin/ai-provider/test/route.ts`              | POST test connection                                                                        |
| 16  | `src/features/ai-provider/index.ts`                        | Feature barrel                                                                              |
| 17  | `src/features/ai-provider/ui/AiProviderSettingsWidget.tsx` | Admin widget UI                                                                             |
| 18  | `scripts/rotate-ai-keys.ts`                                | Key rotation script (for future use)                                                        |

## 12. Files to Modify

| #   | File                                         | Change                                                                                              |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | `prisma/seed/modules.ts`                     | Add `ai-provider` PlatformModule seed entry                                                         |
| 2   | `src/app/api/translate/route.ts`             | Replace raw `fetch()` with `getAiProvider()` call                                                   |
| 3   | `src/features/i18n/ui/LocaleAwareEditor.tsx` | Add degraded state for AI-unavailable (503 handling)                                                |
| 4   | `src/shared/api/server/index.ts`             | Re-export `getAiProvider`, `isAiCapabilityEnabled` from `../ai`                                     |
| 5   | `src/entities/tenant/api/settings.ts`        | Add new setting keys: `AI_ANTHROPIC_KEY`, `AI_OPENAI_KEY`, `AI_DEEPSEEK_KEY`, `AI_PROVIDER_DEFAULT` |
| 6   | `src/entities/tenant/index.server.ts`        | Export `getTenantModule` from new module                                                            |
| 7   | `src/widgets/dashboard/model/widgets.ts`     | Register `admin-ai-provider` widget + add `Sparkles` import                                         |
| 8   | `.env.example`                               | Add `AI_SETTINGS_ENCRYPTION_KEY` with comment                                                       |
| 9   | `package.json`                               | Add `@anthropic-ai/sdk` and `openai` to dependencies                                                |

## 13. Risk Items & Escalation Points

| #   | Risk                                                                              | Severity | Mitigation                                                                                                                                       |
| --- | --------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `getTenantModule()` doesn't exist — advisory pseudocode uses it                   | HIGH     | Create it in this phase; document the helper                                                                                                     |
| R2  | Existing translate route queries settings without `tenantId` filter               | MEDIUM   | Advisory says not to fix — document as latent gap, do not regress existing behavior                                                              |
| R3  | Tenant API key leaked via logging                                                 | CRITICAL | `encryptKey()` result never interpolated into log strings; ESLint `no-restricted-syntax` rule suggested for `logger.*` calls containing `apiKey` |
| R4  | `AI_SETTINGS_ENCRYPTION_KEY` absent at startup                                    | HIGH     | App must validate on startup; log warning, don't crash — AI features degrade gracefully                                                          |
| R5  | `@anthropic-ai/sdk` or `openai` SDK version mismatch with TypeScript              | MEDIUM   | Pin versions after `pnpm add`; run `tsc --noEmit` after install                                                                                  |
| R6  | Drizzle output directory discrepancy (`./drizzle` vs advisory's `src/db/schema/`) | LOW      | No schema changes in this phase — no impact. Flag for Phase 105                                                                                  |

### Escalation Points (from advisory)

> **STOP AND ESCALATE:** If `src/shared/api/` already contains an `ai/` directory or any `encryption.ts` file, report before creating — do not overwrite.

**Verified:** `src/shared/api/ai/` does NOT exist. `encryption.ts` does NOT exist anywhere in `src/`. Safe to proceed.

> **STOP AND ESCALATE:** If `translate/route.ts` uses a pattern incompatible with tenant context (e.g. no `withTenant()` guard), report — do not silently add tenant context without DavDev review, as translation may be called from a public route.

**Verified:** `withTenant()` IS called on line 48. Auth via `getSessionAndRole()` IS present. Route is NOT public — requires authentication. Safe to proceed.

---

## 14. Implementation Order Recommendation

**Wave 1 — Foundation (no external dependencies):**

1. Create `src/entities/tenant/api/settings-service.ts` (getSettingValue, setSettingValue, deleteSettingValue)
2. Create `src/entities/tenant/lib/modules/get-tenant-module.ts`
3. Update `src/entities/tenant/api/settings.ts` with new AI setting keys
4. Update `src/entities/tenant/index.server.ts` barrel exports
5. Create `src/shared/api/ai/encryption.ts`
6. Create `src/shared/api/ai/encryption.test.ts` — verify round-trip
7. Seed `ai-provider` PlatformModule in `prisma/seed/modules.ts`

**Wave 2 — Provider implementations:** 8. `pnpm add @anthropic-ai/sdk openai` 9. Create `src/shared/api/ai/null-provider.ts` 10. Create `src/shared/api/ai/provider.ts` (interface + factory) 11. Create `src/shared/api/ai/anthropic.ts` 12. Create `src/shared/api/ai/openai.ts` 13. Create `src/shared/api/ai/index.ts` (public barrel) 14. Update `src/shared/api/server/index.ts` (re-export) 15. Create `src/entities/tenant/api/ai-capabilities.ts` 16. Create `src/shared/api/ai/__tests__/provider.test.ts`

**Wave 3 — Admin API + Widget:** 17. Create `src/app/api/admin/ai-provider/status/route.ts` 18. Create `src/app/api/admin/ai-provider/key/route.ts` 19. Create `src/app/api/admin/ai-provider/delete/route.ts` 20. Create `src/app/api/admin/ai-provider/test/route.ts` 21. Create `src/features/ai-provider/ui/AiProviderSettingsWidget.tsx` 22. Register widget in `src/widgets/dashboard/model/widgets.ts`

**Wave 4 — Migration:** 23. Refactor `src/app/api/translate/route.ts` to use `getAiProvider()` 24. Update `src/features/i18n/ui/LocaleAwareEditor.tsx` with degraded state 25. Add `AI_SETTINGS_ENCRYPTION_KEY` to `.env.example` 26. Create `scripts/rotate-ai-keys.ts` (future use placeholder) 27. Run `pnpm typecheck`, `pnpm lint`, `pnpm fsd:check`

---

## 15. Assumptions Log

| #   | Claim                                                                               | Section  | Risk if Wrong                                                                  |
| --- | ----------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| A1  | `@anthropic-ai/sdk` and `openai` packages are available on npm and legitimate       | §3.1, §6 | Medium — both are well-known SDKs but need human verification before install   |
| A2  | Claude Haiku 4.5 model ID is `claude-haiku-4-5-20241022`                            | §3.3     | Low — model ID format may differ; verify against Anthropic docs                |
| A3  | DeepSeek API at `https://api.deepseek.com/v1` is OpenAI-compatible                  | §3.1     | Low — well-documented compatibility layer                                      |
| A4  | `getTenantModule()` helper is appropriate in `src/entities/tenant/lib/modules/`     | §12      | Low — follows existing module helper placement                                 |
| A5  | Setting table needs no tenantId filter in translate route (may rely on RLS)         | §1.1     | Medium — may be a latent isolation gap; advisory says not to fix in this phase |
| A6  | `Sparkles` icon from lucide-react is appropriate for AI provider widget             | §1.6     | Very Low — purely cosmetic                                                     |
| A7  | The `config` field on TenantModule can store `AiProviderModuleConfig` shape as JSON | §1.4     | Low — it's a Json field, any object works                                      |

---

## 16. Open Questions

1. **DeepSeek model ID:** What is the exact model ID for DeepSeek's chat completion? `deepseek-chat` is [ASSUMED] — verify against DeepSeek API docs.
   - What we know: DeepSeek is OpenAI-API-compatible
   - What's unclear: Model ID may be `deepseek-chat` or `deepseek-chat-v3`
   - Recommendation: Use `deepseek-chat` (default); allow override in TenantModule.config

2. **Should translate route migrate off `translation_api_key` to `ai.openai.key`?**
   - What we know: Current route uses `translation_api_key`; advisory wants `ai.openai.key`
   - What's unclear: Whether to migrate existing keys or support both during transition
   - Recommendation: Support both — check `ai.openai.key` first, fall back to `translation_api_key`. This prevents breaking existing tenants.

3. **Model version for Claude Haiku 4.5:**
   - What we know: Gate G4 decided on `claude-haiku-4-5`
   - What's unclear: Exact model ID string the Anthropic SDK expects
   - Recommendation: Verify against Anthropic API docs; use the SDK's model constant if available

---

## 17. Environment Availability

| Dependency          | Required By                 | Available | Version | Fallback               |
| ------------------- | --------------------------- | --------- | ------- | ---------------------- |
| Node.js             | crypto module (AES-256-GCM) | ✓         | v22+    | — (built-in)           |
| pnpm                | Package installation        | ✓         | 10.33.0 | —                      |
| `@anthropic-ai/sdk` | AnthropicProvider           | ✗         | —       | Install via `pnpm add` |
| `openai` SDK        | OpenAiProvider, DeepSeek    | ✗         | —       | Install via `pnpm add` |
| `lucide-react`      | Sparkles icon for widget    | ✓         | 1.7.0   | —                      |

**Missing dependencies with no fallback:**

- `@anthropic-ai/sdk` — must install; Anthropic provider cannot work without it
- `openai` — must install; OpenAI and DeepSeek providers cannot work without it

**Missing dependencies with fallback:**

- None — all provider SDKs must be installed

---

## 18. Sources

### Primary (HIGH confidence)

- `src/app/api/translate/route.ts` — full source read [VERIFIED: codebase]
- `src/shared/api/server/index.ts` — full source read [VERIFIED: codebase]
- `src/widgets/dashboard/model/widgets.ts` — full source read [VERIFIED: codebase]
- `prisma/seed/modules.ts` — full source read [VERIFIED: codebase]
- `prisma/schema.prisma` — Setting + TenantModule models [VERIFIED: codebase]
- `src/entities/tenant/api/settings.ts` — SETTINGS_KEYS [VERIFIED: codebase]
- `src/entities/tenant/api/with-tenant.ts` — withTenant implementation [VERIFIED: codebase]
- `src/entities/tenant/lib/modules/assert-module-enabled.ts` — module helpers [VERIFIED: codebase]
- `src/features/i18n/ui/LocaleAwareEditor.tsx` — full source read [VERIFIED: codebase]
- `docs/advisories/ADVISORY-017-SUPPLEMENTAL.md` — full advisory read [VERIFIED: codebase]
- `docs/advisories/ADVISORY-017.md` — full advisory read [VERIFIED: codebase]
- `drizzle.config.ts` — output directory confirmed as `./drizzle` [VERIFIED: codebase]
- `package.json` — dependency inventory [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- Node.js `crypto` module documentation — AES-256-GCM API [CITED: nodejs.org/api/crypto.html]

### Tertiary (LOW confidence)

- `@anthropic-ai/sdk` exact model ID for Claude Haiku 4.5 [ASSUMED]
- DeepSeek API model ID and compatibility [ASSUMED]
- `openai` SDK latest version [ASSUMED]

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — both SDKs identified, verified not installed, installation commands known
- Architecture: HIGH — FSD placement verified, existing patterns documented, barrel conventions established
- Pitfalls: HIGH — missing `getTenantModule`, latent translate route tenant isolation gap, both documented

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (30 days — AI SDK APIs are relatively stable)

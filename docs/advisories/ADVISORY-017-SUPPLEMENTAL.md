# ADVISORY-017-SUPPLEMENTAL: AI Provider Module

## Amends: ADVISORY-017 (Dispute Resolution System)

**Status:** GATES RESOLVED — Awaiting GSD phase execution  
**Date:** 2026-06-25  
**Scope:** Platform-wide AI provider abstraction + dispute frivolity screen optionality  
**Triggered by:** (1) Dispute frivolity screen requires tenant API key; (2) TipTap locale  
translation already depends on OpenAI GPT-mini; (3) No unified AI provider layer exists.

---

## 1. Problem Statement

The platform has **two existing or planned AI callsites** with no shared infrastructure:

| Callsite                  | Location                                                                    | Provider assumed       | Status                   |
| ------------------------- | --------------------------------------------------------------------------- | ---------------------- | ------------------------ |
| TipTap locale translation | `src/app/api/translate/route.ts` + `features/i18n/ui/LocaleAwareEditor.tsx` | OpenAI GPT-4o-mini     | Implemented (unreviewed) |
| Dispute frivolity screen  | `src/app/api/disputes/intake-screen/route.ts`                               | Anthropic Claude Haiku | Designed in ADVISORY-017 |

A third callsite is likely (content moderation, search summarisation, maintenance triage). Without a shared abstraction, each callsite will:

- Hardcode a different provider SDK with no tenant control
- Store API keys inconsistently (env var? Setting table? TenantModule.config?)
- Have no usage tracking, rate limiting, or fallback behaviour
- Force the platform to absorb cost for all tenants, or awkwardly ask each tenant for keys ad-hoc

This supplemental defines a **`ai-provider` PlatformModule** that is the single choke point for all AI calls in the platform. Any feature that uses AI declares a dependency on this module. Features degrade gracefully when the module is absent or unconfigured.

---

## 2. Core Design Principles

**P1 — Provider-agnostic interface.** The platform calls `aiProvider.complete(prompt, options)`, not `openai.chat.completions.create(...)`. The underlying provider is resolved at runtime from tenant config.

**P2 — Tenant-owned keys, platform-owned defaults.** A tenant may supply their own API key for any supported provider. If they do not, the platform may offer a metered pool (future — not in scope here), or the feature simply degrades. No silent cost absorption.

**P3 — Per-feature opt-in.** AI features are gated behind both the `ai-provider` module AND a feature-specific capability flag (e.g. `ai.disputes.frivolityScreen`, `ai.content.translation`). A tenant can have `ai-provider` enabled but individual AI features disabled.

**P4 — Key security.** Tenant API keys are stored encrypted in the `Setting` table using AES-256-GCM via a platform-managed encryption key (`AI_SETTINGS_ENCRYPTION_KEY` env var). Keys are never returned to the client. The admin UI shows only whether a key is configured (`✓ Key stored`) not the key itself.

**P5 — Graceful degradation.** Every AI-dependent feature has a defined fallback behaviour when `ai-provider` is absent, unconfigured, or the API call fails. The feature continues to work — just without the AI enhancement.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI PROVIDER MODULE                        │
│  PlatformModule key: 'ai-provider'  minTier: STANDARD        │
│                                                              │
│  TenantModule.config (encrypted fields):                     │
│  {                                                           │
│    defaultProvider: 'anthropic' | 'openai' | 'none',        │
│    anthropic: { keyRef: 'setting:ai.anthropic.key' },        │
│    openai:    { keyRef: 'setting:ai.openai.key' },           │
│    capabilities: {                                           │
│      'ai.disputes.frivolityScreen': true,                    │
│      'ai.content.translation': true,                         │
│    }                                                         │
│  }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
   src/shared/api/ai/               Setting table
   provider.ts                      (encrypted key values)
   ├── getAiProvider(tenantId)      ai.anthropic.key → enc(sk-ant-...)
   ├── isCapabilityEnabled(...)     ai.openai.key    → enc(sk-...)
   └── AiProvider interface
        ├── AnthropicProvider
        └── OpenAiProvider
              │
    ┌─────────┴──────────────────────────┐
    ▼                                    ▼
disputes/intake-screen/          translate/route.ts
route.ts                         (refactored to use provider)
(uses AiProvider — not           (migrated from raw openai call)
 raw Anthropic SDK)
```

---

## 4. Schema Changes

### No new models required.

The existing `Setting` table (`tenantId` + `key` + `value`) is sufficient for encrypted key storage. The existing `TenantModule.config` Json field carries per-module AI configuration.

### New Setting keys (namespaced, per tenant):

| Key                            | Value                                   | Notes                       |
| ------------------------------ | --------------------------------------- | --------------------------- |
| `ai.anthropic.key`             | AES-GCM encrypted API key               | Never decrypted client-side |
| `ai.openai.key`                | AES-GCM encrypted API key               | Never decrypted client-side |
| `ai.provider.default`          | `'anthropic'` \| `'openai'` \| `'none'` | Plain string                |
| `ai.provider.monthlyBudgetZAR` | `'500'` (optional cap)                  | For future metered billing  |

### TenantModule.config shape for `ai-provider`:

```typescript
interface AiProviderModuleConfig {
  defaultProvider: 'anthropic' | 'openai' | 'none';
  capabilities: Partial<Record<AiCapabilityKey, boolean>>;
  // keyRef fields are internal — not stored in config, resolved via Setting
}

type AiCapabilityKey =
  | 'ai.disputes.frivolityScreen'
  | 'ai.content.translation'
  | 'ai.content.moderation' // future
  | 'ai.maintenance.triage'; // future
```

### ADVISORY-017 amendment — `DisputeCase` schema:

No schema changes to `DisputeCase` are needed. The intake screen optionality is handled entirely at the API and UI layer. `intakeCompletedAt` remains valid whether or not the AI screen ran — the wizard completes via the non-AI path when the capability is absent.

---

## 5. AI Provider Service

```
src/shared/api/ai/
├── index.ts           # public barrel: getAiProvider, isAiCapabilityEnabled, AiCapabilityKey
├── provider.ts        # AiProvider interface + factory
├── anthropic.ts       # AnthropicProvider implementation
├── openai.ts          # OpenAiProvider implementation
├── null-provider.ts   # NullProvider (graceful degradation)
├── encryption.ts      # encryptKey / decryptKey via AES-256-GCM
└── __tests__/
    └── provider.test.ts
```

### Core interface:

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
  provider: 'anthropic' | 'openai' | 'null';
  tokensUsed?: number;
}

export interface AiProvider {
  readonly name: 'anthropic' | 'openai' | 'null';
  complete(userPrompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult>;
  isAvailable(): boolean;
}
```

### Factory function:

```typescript
// src/shared/api/ai/provider.ts

export async function getAiProvider(tenantId: string): Promise<AiProvider> {
  const module = await getTenantModule(tenantId, 'ai-provider');

  if (!module?.enabled) return new NullProvider();

  const config = module.config as AiProviderModuleConfig | null;
  const defaultProvider = config?.defaultProvider ?? 'none';

  if (defaultProvider === 'anthropic') {
    const encKey = await getSettingValue(tenantId, 'ai.anthropic.key');
    if (!encKey) return new NullProvider();
    const apiKey = decryptKey(encKey);
    return new AnthropicProvider(apiKey);
  }

  if (defaultProvider === 'openai') {
    const encKey = await getSettingValue(tenantId, 'ai.openai.key');
    if (!encKey) return new NullProvider();
    const apiKey = decryptKey(encKey);
    return new OpenAiProvider(apiKey);
  }

  return new NullProvider();
}
```

### Capability check:

```typescript
// src/shared/api/ai/index.ts

export async function isAiCapabilityEnabled(
  tenantId: string,
  capability: AiCapabilityKey
): Promise<boolean> {
  const module = await getTenantModule(tenantId, 'ai-provider');
  if (!module?.enabled) return false;
  const config = module.config as AiProviderModuleConfig | null;
  return config?.capabilities?.[capability] === true;
}
```

### NullProvider (graceful degradation):

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

---

## 6. Refactoring the Translate Route

The existing `src/app/api/translate/route.ts` calls OpenAI directly. It must be migrated:

### Before (current, assumed):

```typescript
// Direct OpenAI call — hardcoded, no tenant control
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const result = await openai.chat.completions.create({...});
```

### After:

```typescript
// src/app/api/translate/route.ts
import { getAiProvider, isAiCapabilityEnabled } from '@shared/api/ai';

export async function POST(request: Request) {
  const { tenantId } = await withTenant(request);

  const capable = await isAiCapabilityEnabled(tenantId, 'ai.content.translation');
  if (!capable) {
    return apiError('AI translation is not enabled for this community', 503);
  }

  const provider = await getAiProvider(tenantId);
  if (!provider.isAvailable()) {
    return apiError('No AI provider is configured for this community', 503);
  }

  const { text, targetLocale } = await request.json();

  const result = await provider.complete(text, {
    systemPrompt: `Translate the following community content to ${targetLocale}. 
                   Preserve formatting. Return only the translated text.`,
    maxTokens: 2000,
  });

  return apiSuccess({ translated: result.text, provider: result.provider });
}
```

**Migration note:** The existing `LocaleAwareEditor.tsx` currently assumes translation always works. It needs a fallback state: show the original text with a notice "AI translation unavailable — configure an AI provider in community settings."

---

## 7. Dispute Frivolity Screen — Amended Behaviour

### ADVISORY-017 Section 7 (Stage 3) is amended as follows:

The `FrivolityScreen.tsx` component now has three render states:

**State A — AI available and capability enabled:**
Full behaviour as specified in ADVISORY-017. Calls `POST /api/disputes/intake-screen`, renders `toneScore`, `likelyFrivolous`, `deEscalationTip`.

**State B — Module enabled but AI capability disabled:**
The frivolity screen step is **skipped entirely** in the intake wizard. The step counter collapses from 4 stages to 3. No indication to the user that they are missing anything — just fewer steps.

**State C — `ai-provider` module absent:**
Same as State B — step skipped silently.

```typescript
// src/features/dispute/model/useDisputeIntake.ts

const steps = useMemo(() => {
  const base = ['emotion', 'checklist', 'form'] as const;
  return aiEnabled ? (['emotion', 'checklist', 'frivolity', 'form'] as const) : base;
}, [aiEnabled]);
```

`aiEnabled` is resolved server-side and passed as a prop to the intake wizard via the dispute page's server component — not fetched client-side — to avoid a loading flash on step 3.

### `POST /api/disputes/intake-screen` amended:

```typescript
export async function POST(request: Request) {
  const { tenantId } = await withTenant(request);

  // Double-check server-side — client must not be trusted
  const capable = await isAiCapabilityEnabled(tenantId, 'ai.disputes.frivolityScreen');
  if (!capable) {
    return apiError('Frivolity screening not available', 503);
  }

  const provider = await getAiProvider(tenantId);
  if (!provider.isAvailable()) {
    return apiError('No AI provider configured', 503);
  }

  // ... sanitise, call, respond as per ADVISORY-017
}
```

---

## 8. Admin UI — AI Provider Settings

A new `AiProviderSettingsWidget` (admin-only) surfaces in the admin space:

```
┌──────────────────────────────────────────────────────┐
│ AI Provider Settings                                  │
│                                                       │
│ Default Provider:  [Anthropic ▾]                      │
│                                                       │
│ Anthropic API Key: [● ● ● ● ● ● ● ● ●] [Update] [✓] │
│ OpenAI API Key:    [Not configured]      [Add Key]    │
│                                                       │
│ Enabled AI Features:                                  │
│ ☑ Dispute frivolity screen                           │
│ ☑ Content locale translation                          │
│ ☐ Maintenance request triage (coming soon)           │
│                                                       │
│ [Test Connection]  Last tested: 2026-06-25 09:14     │
└──────────────────────────────────────────────────────┘
```

**Key security behaviour:**

- `GET /api/admin/ai-provider/status` returns `{ anthropicConfigured: true, openaiConfigured: false, defaultProvider: 'anthropic' }` — never the key value
- `POST /api/admin/ai-provider/key` accepts `{ provider: 'anthropic', key: 'sk-ant-...' }`, encrypts, stores in Setting, returns `{ stored: true }`
- `DELETE /api/admin/ai-provider/key` clears the Setting record
- `POST /api/admin/ai-provider/test` attempts a minimal `complete('ping', { maxTokens: 5 })` call and returns `{ ok: true, provider, latencyMs }` or an error

**Widget registration:**

```typescript
registry.register({
  id: 'admin-ai-provider',
  version: '1.0.0',
  name: 'AI Provider',
  description: 'Configure AI provider keys and features',
  author: 'internal',
  category: 'core',
  icon: Sparkles, // lucide-react
  featureFlag: 'ai-provider',
  permissions: ['admin'],
  component: lazy(() =>
    import('../../admin/ui/AiProviderSettingsWidget').then(m => ({
      default: m.AiProviderSettingsWidget,
    }))
  ),
  loader: () => import('../../admin/ui/AiProviderSettingsWidget'),
  defaultSize: { width: 3, height: 3 },
  minSize: { width: 3, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});
```

---

## 9. FSD Placement

```
src/shared/api/
└── ai/
    ├── index.ts            # getAiProvider, isAiCapabilityEnabled, AiCapabilityKey
    ├── provider.ts         # AiProvider interface, factory
    ├── anthropic.ts        # AnthropicProvider
    ├── openai.ts           # OpenAiProvider
    ├── null-provider.ts    # NullProvider
    ├── encryption.ts       # encryptKey, decryptKey
    └── __tests__/
        └── provider.test.ts

src/entities/tenant/api/
└── ai-capabilities.ts      # isAiCapabilityEnabled re-exported from entity barrel
                             # (wraps shared/api/ai for FSD compliance)

src/features/
└── ai-provider/
    ├── index.ts
    └── ui/
        └── AiProviderSettingsWidget.tsx   # (admin only — registered as widget)

src/app/api/
└── admin/
    └── ai-provider/
        ├── status/route.ts
        ├── key/route.ts
        └── test/route.ts
```

**FSD layer rule:** `src/shared/api/ai/` is a `shared` layer module — all entity and feature layers may import from it. The reverse is forbidden. The `encryption.ts` module in shared is server-only and must be re-exported via `shared/api/server/index.ts` (per the `server.ts` sub-barrel convention established in ADR-024).

---

## 10. PlatformModule Seed Entries

```typescript
// prisma/seed/modules.ts — add:
{
  key: 'ai-provider',
  label: 'AI Provider',
  description: 'Connect an AI provider (Anthropic or OpenAI) to enable AI-powered features across the platform',
  minTier: 'STANDARD',
  defaultEnabled: false,
},
```

**Module dependency pattern** (enforced in `assertModuleEnabled`):

```typescript
// src/shared/api/ai/index.ts

export async function assertAiCapabilityEnabled(
  tenantId: string,
  capability: AiCapabilityKey
): Promise<void> {
  await assertModuleEnabled(tenantId, 'ai-provider');
  const enabled = await isAiCapabilityEnabled(tenantId, capability);
  if (!enabled) {
    throw new ModuleNotEnabledError(
      `AI capability '${capability}' is not enabled for this community`
    );
  }
}
```

The `disputes` module does NOT declare a hard dependency on `ai-provider`. It checks `isAiCapabilityEnabled` and degrades. This is the correct pattern — a soft dependency, not a hard one.

The `translate` route DOES fail hard if `ai.content.translation` is not enabled — it has no non-AI fallback. This is also correct — translation is inherently an AI feature, not an enhanced one.

---

## 11. Environment Variables

```env
# Platform-level encryption key for tenant AI key storage
# Required — app will refuse to start if absent when ai-provider module is seeded
AI_SETTINGS_ENCRYPTION_KEY="32-byte-hex-or-base64-key"

# Optional: Platform-owned fallback keys (for future metered pool)
# If set, used when tenant has not configured their own key
# PLATFORM_ANTHROPIC_KEY=""
# PLATFORM_OPENAI_KEY=""
# These are deliberately left commented — do not enable without metered billing in place
```

**Key rotation:** When `AI_SETTINGS_ENCRYPTION_KEY` is rotated, all stored tenant keys must be re-encrypted. A migration script (`scripts/rotate-ai-keys.ts`) should be created as part of the Phase 1 execution — it reads all `ai.*.key` Settings, decrypts with old key, re-encrypts with new key, in a single transaction per tenant.

---

## 12. Risk Register Amendments

The following risks amend or supplement ADVISORY-017 Section 15:

| ID  | Risk                                                                | Severity | Mitigation                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R9  | Tenant API key leaked via server log                                | CRITICAL | Encrypted at rest; never logged; `decryptKey()` result never interpolated into log strings — enforced via ESLint `no-restricted-syntax` rule on `logger.*` calls containing `apiKey` variable |
| R10 | Platform absorbs AI cost if platform-level key is accidentally set  | HIGH     | Platform keys commented out in env template; require two-person approval to activate; usage dashboard required before activation                                                              |
| R11 | Key rotation breaks all tenant AI features simultaneously           | HIGH     | Rotation script runs per-tenant in transaction; dry-run mode first; rollback via re-encryption with old key                                                                                   |
| R12 | `getAiProvider` called in hot path adds DB round-trip per request   | MEDIUM   | Cache `TenantModule` config in memory (TTL 5min) using existing TanStack Query server-side pattern or Redis if available                                                                      |
| R13 | OpenAI and Anthropic APIs have different JSON mode behaviours       | LOW      | `AiProvider.complete()` normalises JSON mode — both providers receive appropriate system prompt instruction; parsing is provider-agnostic                                                     |
| R14 | Tenant enters wrong key format (OpenAI key used for Anthropic slot) | LOW      | `POST /api/admin/ai-provider/test` must be called to validate — make it mandatory in the setup flow UX                                                                                        |

---

## 13. Decision Gates

### GATE G5 — Platform Metered Pool ✅ RESOLVED 2026-06-25

**Decision:** **B — Platform pool with metered billing via dWallet integration.**  
v1 ships with BYO keys only. Platform pool and dWallet billing are deferred until the dWallet module is live. The `// PLATFORM_ANTHROPIC_KEY` / `// PLATFORM_OPENAI_KEY` / `// PLATFORM_DEEPSEEK_KEY` env var placeholders remain commented out as hooks for future activation. No billing infrastructure required in this phase.

### GATE G6 — Provider Scope for v1 ✅ RESOLVED 2026-06-25

**Decision:** **Anthropic + OpenAI + DeepSeek.**  
Three providers at launch:

- **Anthropic** via `@anthropic-ai/sdk` (dispute frivolity screen)
- **OpenAI** via `openai` SDK (TipTap translation — existing callsite)
- **DeepSeek** via OpenAI-compatible API (same SDK, different `baseURL` + `apiKey`)

DeepSeek uses `https://api.deepseek.com/v1` as the base URL with the OpenAI SDK — no separate SDK dependency required. The `AiProvider` interface normalises all three.

### GATE G7 — Translate Route Migration Timing ✅ RESOLVED 2026-06-25

**Decision:** **A — Migrate in same phase.**  
`translate/route.ts` will be refactored to use `getAiProvider(tenantId)` in the same GSD phase as the `ai-provider` module. Existing translation behaviour must not regress. `LocaleAwareEditor.tsx` must implement a degraded state for when `ai.content.translation` capability is disabled.

---

## 14. Amended Phase Plan

The following phases **prepend** the ADVISORY-017 phase plan. ADVISORY-017 Phase 1 (Dispute Schema) does not change, but **Phase 3 (API Routes) is blocked** until this supplemental's Phase A is complete.

**GSD Phase Mapping (2026-06-25):**

| GSD Phase                                                                         | Scope                             | Supplemental Phase |
| --------------------------------------------------------------------------------- | --------------------------------- | ------------------ |
| [Phase 104](.planning/phases/104-ai-provider-infrastructure-translate-migration/) | AI Provider + Translate Migration | Phases A + B       |
| [Phase 106](.planning/phases/106-dispute-api-routes-intake-screen/)               | Dispute Intake Screen Integration | Phase C            |

Phase 106 is also the primary API routes phase for ADVISORY-017. See [Phase 106](.planning/phases/106-dispute-api-routes-intake-screen/) and ADVISORY-017 for full scope.

### Phase A — AI Provider Infrastructure (NEW — before ADVISORY-017 Phase 3)

1. Add `AI_SETTINGS_ENCRYPTION_KEY` to env and `.env.example`
2. Create `src/shared/api/ai/` layer per Section 9
3. Write `encryption.ts` using Node.js `crypto` AES-256-GCM
4. Write `NullProvider`, `AnthropicProvider`, `OpenAiProvider`
5. Write `getAiProvider(tenantId)` factory
6. Write `isAiCapabilityEnabled(tenantId, capability)`
7. Seed `ai-provider` PlatformModule
8. Write `POST /api/admin/ai-provider/key`, `status`, `test` routes
9. Write `AiProviderSettingsWidget.tsx`
10. Register widget

**STOP AND ESCALATE:** If `src/shared/api/` already contains an `ai/` directory or any `encryption.ts` file, report before creating — do not overwrite.

```bash
# Pre-execution discovery
ls src/shared/api/ai/ 2>/dev/null || echo "Directory absent — expected"
grep -rn "AI_SETTINGS_ENCRYPTION_KEY" src/ 2>/dev/null | head -5
grep -rn "encryptKey\|decryptKey" src/ 2>/dev/null | head -5
grep -n "translate" src/app/api/translate/route.ts 2>/dev/null | head -20
```

### Phase B — Translate Route Migration (NEW — concurrent with Phase A or immediately after)

1. Refactor `src/app/api/translate/route.ts` per Section 6
2. Update `LocaleAwareEditor.tsx` with degraded state (graceful no-AI message)
3. Update any other direct OpenAI SDK calls to use `getAiProvider`

**STOP AND ESCALATE:** If `translate/route.ts` uses a pattern incompatible with tenant context (e.g. no `withTenant()` guard), report — do not silently add tenant context without DavDev review, as translation may be called from a public route.

### Phase C — Dispute Intake Screen Integration (amends ADVISORY-017 Phase 3)

1. `intake-screen/route.ts` uses `getAiProvider` + `assertAiCapabilityEnabled`
2. Dispute page server component resolves `aiEnabled` and passes to intake wizard
3. `useDisputeIntake.ts` state machine conditionally includes `frivolity` step
4. `FrivolityScreen.tsx` renders only when `aiEnabled === true`

---

## 15. Done Criteria (Supplemental)

- [ ] ⏳ `AI_SETTINGS_ENCRYPTION_KEY` in `.env.example` with instruction comment
- [ ] ⏳ `encryptKey` / `decryptKey` round-trips cleanly in unit test
- [ ] ⏳ `getAiProvider(tenantId)` returns `NullProvider` when module absent or key missing
- [ ] ⏳ `getAiProvider(tenantId)` returns `AnthropicProvider` when Anthropic configured
- [ ] `NullProvider.complete()` returns `{ text: '', provider: 'null' }` — never throws
- [ ] ⏳ `POST /api/admin/ai-provider/key` stores encrypted value; raw key not recoverable from DB alone
- [ ] ⏳ `GET /api/admin/ai-provider/status` returns `{ anthropicConfigured: true }` not the key
- [ ] ⏳ `POST /api/admin/ai-provider/test` returns latency and provider name on success
- [ ] `translate/route.ts` uses `getAiProvider` — no direct OpenAI SDK import remaining
- [ ] ⏳ `LocaleAwareEditor.tsx` renders degraded state when translation returns 503
- [ ] ⏳ Dispute intake wizard renders 3 steps (not 4) when `ai.disputes.frivolityScreen` is false
- [ ] `intake-screen/route.ts` returns 503 when capability disabled — does not call AI
- [ ] ⏳ `steiger` passes with no new violations
- [ ] ⏳ `npm run typecheck` passes
- [ ] `npm run lint` passes — no `logger` calls containing raw `apiKey` variable

---

## 16. Ubiquitous Language Additions

The following terms should be added to `UBIQUITOUS_LANGUAGE.md`:

**AI Provider** — A platform module (`ai-provider`) that acts as the single gateway for all AI API calls. Tenants configure their own API key for either Anthropic or OpenAI. AI-dependent features degrade gracefully when the module is absent or unconfigured. Not a standalone page — surfaced via the `admin-ai-provider` widget.

**AI Capability** — A named, feature-specific AI function (e.g. `ai.disputes.frivolityScreen`, `ai.content.translation`). Capabilities are enabled per-tenant within the AI Provider module config. A tenant may have the AI Provider module enabled but specific capabilities disabled.

**NullProvider** — The internal no-op AI provider returned when no API key is configured. Allows all AI-dependent code paths to call `provider.complete()` without null-checking — the provider always responds, but with empty text and `provider: 'null'`.

---

_This supplemental amends ADVISORY-017. Gates G5–G7 must be resolved before Phase A execution. ADVISORY-017 Gates G1–G4 remain open and unchanged. Agent must not begin Phase A until DavDev confirms execution approval on both advisories._

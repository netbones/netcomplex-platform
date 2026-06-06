# ADVISORY_TRPC_LOADING.md

## Purpose

This advisory applies when:

- React duplication has already been investigated.
- Invalid Hook Call errors have been resolved.
- API endpoints return valid data.
- UI remains stuck in loading/error states.
- tRPC queries never appear to complete.

The goal is to prevent agents from repeatedly investigating React, Turbopack, Radix UI, or webpack aliasing when the active failure has moved into the data layer.

---

# Incident Summary

## Confirmed Findings

The following have already been verified:

### React Duplication

Previously observed:

```text
react-builtin
next/dist/compiled/react
```

and

```text
react@19.2.4
```

were loading as separate module instances.

Evidence:

```text
r1.createContext !== r2.createContext
```

Result:

```text
Invalid hook call
```

This issue has been mitigated.

---

### Current State

After webpack alias remediation:

```text
Browser console errors: 0
Invalid hook call: eliminated
```

However:

```text
Competition page still fails.
```

Current behavior:

```text
API returns data.
Client never receives usable query result.
Loading state persists.
Error UI eventually renders.
```

---

# Critical Rule

Agents MUST NOT reopen React investigations unless new evidence appears.

The following are considered resolved:

- React version mismatch
- Radix hook call failures
- createContext mismatch
- react-builtin diagnostics
- Turbopack alias experiments

Do not restart these investigations without new evidence.

---

# Current Diagnostic Priority

## Priority 1

Provider lifecycle instability.

Evidence:

```text
[PROVIDERS] creating trpc client on every request
```

This should be treated as a critical finding.

---

# Provider Investigation Checklist

Inspect:

```text
Providers.tsx
```

Determine:

### QueryClient Creation

Bad:

```tsx
const queryClient = new QueryClient();
```

inside render.

Bad:

```tsx
export function Providers() {
  const queryClient = new QueryClient();
}
```

---

Expected:

```tsx
const [queryClient] = useState(() => new QueryClient());
```

or module-level singleton.

---

### tRPC Client Creation

Bad:

```tsx
export function Providers() {
  const trpcClient =
    trpc.createClient(...);
}
```

---

Expected:

```tsx
const [trpcClient] =
  useState(() =>
    trpc.createClient(...)
  );
```

or module-level singleton.

---

# Required Logging

Add temporary diagnostics:

```tsx
console.log('[TRPC] client created');
```

and

```tsx
console.log('[QUERY] query client created');
```

Expected:

```text
1 occurrence
```

Unexpected:

```text
multiple occurrences
```

during normal navigation.

---

# Priority 2

Verify Provider Mount Location.

Inspect:

```text
app/layout.tsx
app/**/layout.tsx
```

Determine whether:

```tsx
<Providers>
```

is mounted in a component that re-renders frequently.

---

Preferred:

```tsx
app / layout.tsx;
```

single root mount.

---

Avoid:

```tsx
page.tsx
nested route layouts
request-scoped wrappers
```

that recreate providers repeatedly.

---

# Priority 3

Query Key Stability

Inspect:

```tsx
trpc.competitions
  .listPublicCompetitions
  .useQuery(...)
```

Check for:

```tsx
useQuery({
  timestamp: Date.now(),
});
```

or

```tsx
useQuery({
  filters: {},
});
```

or

```tsx
useQuery({
  random: Math.random(),
});
```

or any newly-created object on every render.

---

Expected:

Stable primitives or memoized objects.

---

# Priority 4

Network Verification

Use browser DevTools.

Inspect:

```text
/api/trpc/competitions.listPublicCompetitions
```

Determine:

### Does request fire?

Expected:

```text
Yes
```

---

### Status Code?

Expected:

```text
200
```

---

### Does payload contain data?

Expected:

```json
{
  "result": ...
}
```

---

### Does request repeat endlessly?

If yes:

Investigate:

```text
Provider remounts
Query cache resets
Query key instability
```

---

# Priority 5

React Query State Inspection

Temporarily log:

```tsx
console.log({
  status,
  fetchStatus,
  isLoading,
  isFetching,
  isPending,
  isError,
  data,
});
```

for the affected query.

Capture transitions.

Expected:

```text
pending
→ success
```

Investigate if observed:

```text
pending
→ pending
→ pending
```

or

```text
pending
→ idle
→ pending
```

loops.

---

# Current Hypothesis Ranking

Based on confirmed evidence:

| Cause                  | Likelihood |
| ---------------------- | ---------: |
| Provider recreation    |  Very High |
| QueryClient recreation |  Very High |
| tRPC client recreation |  Very High |
| Query key instability  |     Medium |
| Layout remounts        |     Medium |
| React duplication      |        Low |
| Radix UI               |        Low |
| Turbopack resolver     |   Very Low |

---

# Agent Directive

Do not spend additional effort on:

```text
react-builtin
next/dist/compiled/react
Radix UI
React version mismatches
Turbopack aliases
webpack aliases
```

unless new evidence directly implicates them.

Focus all debugging effort on:

```text
Provider lifecycle
QueryClient lifecycle
tRPC client lifecycle
React Query cache lifecycle
Network request lifecycle
```

until disproven.

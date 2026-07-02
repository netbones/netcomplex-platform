/**
 * Workspace Registry — Predicate Tests (RED phase)
 *
 * Plan 122-01 Task 2: failing tests that drive the WORKSPACE_REGISTRY
 * implementation in Task 3 (GREEN). These tests validate:
 *   - C-05: exactly 5 WorkspaceType keys registered
 *   - D-11: AUTOMATION disabled, excluded from getEnabledDefinitions()
 *   - D-04: PROVIDER declares PROPERTY as child
 *   - P-05: no domain data leaks into serialized definitions
 *
 * All tests expect imports from ../registry to fail (RED) because
 * registry.ts does not exist yet.
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Imports that MUST fail until Task 3 (GREEN) creates registry.ts
// ═══════════════════════════════════════════════════════════════

import { WORKSPACE_REGISTRY, getEnabledDefinitions, getDefinition } from '../registry';
import type { WorkspaceType } from '../types';

// ═══════════════════════════════════════════════════════════════
// Test 1: Registry keys (C-05 — exactly 5 workspace types)
// ═══════════════════════════════════════════════════════════════

describe('WORKSPACE_REGISTRY keys (C-05)', () => {
  it('registers exactly five workspace types: PERSONAL, PROVIDER, PROPERTY, OWNER, AUTOMATION', () => {
    const keys = Object.keys(WORKSPACE_REGISTRY).sort();
    expect(keys).toEqual(['AUTOMATION', 'OWNER', 'PERSONAL', 'PROPERTY', 'PROVIDER']);
    expect(keys).toHaveLength(5);
  });
});

// ═══════════════════════════════════════════════════════════════
// Test 2: getEnabledDefinitions excludes AUTOMATION (D-11)
// ═══════════════════════════════════════════════════════════════

describe('getEnabledDefinitions (D-11)', () => {
  it('returns 4 types (NOT 5) — AUTOMATION excluded because disabled:true', () => {
    const enabled = getEnabledDefinitions();
    expect(enabled).toHaveLength(4);
    const types = enabled.map(d => d.type);
    expect(types).not.toContain('AUTOMATION');
    expect(types).toEqual(expect.arrayContaining(['PERSONAL', 'PROVIDER', 'PROPERTY', 'OWNER']));
  });
});

// ═══════════════════════════════════════════════════════════════
// Test 3: AUTOMATION.disabled (D-11 — explicit flag)
// ═══════════════════════════════════════════════════════════════

describe('AUTOMATION workspace (D-11)', () => {
  it('has disabled:true — hidden until Phase 113+', () => {
    expect(WORKSPACE_REGISTRY.AUTOMATION.disabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// Test 4: PROVIDER hierarchy (D-04 — Delegated Properties nest
//         under the Provider workspace)
// ═══════════════════════════════════════════════════════════════

describe('PROVIDER workspace hierarchy (D-04)', () => {
  it('declares PROPERTY as its child workspace type', () => {
    expect(WORKSPACE_REGISTRY.PROVIDER.children).toEqual(['PROPERTY']);
  });
});

// ═══════════════════════════════════════════════════════════════
// Test 5: getDefinition lookup (typed fallback)
// ═══════════════════════════════════════════════════════════════

describe('getDefinition lookup', () => {
  it('returns the WorkspaceDefinition for a known type', () => {
    const def = getDefinition('PERSONAL');
    expect(def).toBeDefined();
    expect(def!.type).toBe('PERSONAL');
  });

  it('returns undefined for an unknown type', () => {
    // Cast only inside the test to simulate an unregistered type
    const def = getDefinition('UNKNOWN' as WorkspaceType);
    expect(def).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// Test 6: Enabled definitions have non-empty navigation, actions,
//         and a declared widgetIds array (presence check)
// ═══════════════════════════════════════════════════════════════

describe('enabled definition integrity', () => {
  it('every enabled definition has non-empty navigation and actions arrays', () => {
    for (const def of getEnabledDefinitions()) {
      expect(def.navigation.length, `${def.type}.navigation`).toBeGreaterThan(0);
      expect(def.actions.length, `${def.type}.actions`).toBeGreaterThan(0);
    }
  });

  it('every enabled definition declares a widgetIds array (presence)', () => {
    for (const def of getEnabledDefinitions()) {
      expect(Array.isArray(def.widgetIds), `${def.type}.widgetIds is not an array`).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Test 7: P-05 lightweight guard — no domain data in serialized
//         definitions (C-03 echo at the registry layer)
// ═══════════════════════════════════════════════════════════════

describe('P-05 lightweight guard (C-03)', () => {
  it('serialized definitions contain no forbidden domain keys', () => {
    const forbiddenKeys = ['tasks', 'messages', 'maintenance', 'billing'];
    for (const def of getEnabledDefinitions()) {
      const serialized = JSON.stringify(def);
      for (const key of forbiddenKeys) {
        expect(serialized, `${def.type} contains forbidden key "${key}"`).not.toContain(key);
      }
    }
  });
});

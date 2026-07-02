/**
 * workspace-context (Provider + useWorkspaceContext) — Unit Tests (RED phase)
 *
 * Validates:
 *   - null-while-unresolved (mirrors useGateContext convention)
 *   - Provider with `initial` prop returns initial value
 *   - P-04: unmount + remount → initial value restored (D-08 uncached)
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

import { useWorkspaceContext, WorkspaceContextProvider } from '../workspace-context';
import type { WorkspaceContext } from '@entities/workspace';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function makePersonalContext(userId = 'u1'): WorkspaceContext {
  return {
    workspaceId: `personal:${userId}`,
    workspaceType: 'PERSONAL',
    permissions: ['profile:read', 'settings:manage'],
  };
}

function makePropertyContext(): WorkspaceContext {
  return {
    workspaceId: 'property:p1',
    workspaceType: 'PROPERTY',
    scope: { propertyId: 'p1' },
    permissions: ['maintenance:read', 'maintenance:create'],
  };
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('useWorkspaceContext', () => {
  it('returns null when no provider wraps it (null-while-unresolved)', () => {
    const { result } = renderHook(() => useWorkspaceContext());
    expect(result.current).toBeNull();
  });

  it('returns the initial value when provider is given `initial`', () => {
    const initial = makePersonalContext('u1');

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceContextProvider initial={initial}>{children}</WorkspaceContextProvider>
    );

    const { result } = renderHook(() => useWorkspaceContext(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual(initial);
    expect(result.current?.workspaceId).toBe('personal:u1');
    expect(result.current?.workspaceType).toBe('PERSONAL');
  });
});

describe('WorkspaceContextProvider', () => {
  it('renders children without crashing', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceContextProvider>{children}</WorkspaceContextProvider>
    );

    const { result } = renderHook(() => useWorkspaceContext(), {
      wrapper: Wrapper,
    });
    expect(result.current).toBeNull(); // no initial → null
  });

  it('defaults to null when no `initial` prop', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceContextProvider>{children}</WorkspaceContextProvider>
    );

    const { result } = renderHook(() => useWorkspaceContext(), {
      wrapper: Wrapper,
    });
    expect(result.current).toBeNull();
  });
});

describe('P-04 — unmount + remount (D-08 uncached)', () => {
  // P-04: Unmounting and remounting the provider with the same `initial`
  // yields the SAME initial value — no stale switched value persists.
  // Property test: hand-roll a loop over 3 random initials.

  it('each of 3 distinct initials restores on remount (no stale cache)', () => {
    const initials: WorkspaceContext[] = [
      makePersonalContext('alice'),
      makePropertyContext(),
      {
        workspaceId: 'property:p99',
        workspaceType: 'PROPERTY',
        scope: { propertyId: 'p99' },
        permissions: ['documents:read'],
      },
    ];

    for (const initial of initials) {
      // Mount with this initial
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <WorkspaceContextProvider initial={initial}>{children}</WorkspaceContextProvider>
      );

      const { result, unmount } = renderHook(() => useWorkspaceContext(), {
        wrapper: Wrapper,
      });

      expect(result.current).toEqual(initial);

      // Unmount
      unmount();

      // Re-mount with the same initial — must return SAME value
      const { result: result2 } = renderHook(() => useWorkspaceContext(), {
        wrapper: Wrapper,
      });

      expect(result2.current).toEqual(initial);
    }
  });

  it('P-04: after unmount, a fresh mount with different initial returns the new value', () => {
    // Mount with personal
    const Wrapper1 = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceContextProvider initial={makePersonalContext('u1')}>
        {children}
      </WorkspaceContextProvider>
    );

    const { unmount } = renderHook(() => useWorkspaceContext(), {
      wrapper: Wrapper1,
    });

    unmount();

    // Mount fresh with property — should get the property value, not stale personal
    const Wrapper2 = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceContextProvider initial={makePropertyContext()}>
        {children}
      </WorkspaceContextProvider>
    );

    const { result: result2 } = renderHook(() => useWorkspaceContext(), {
      wrapper: Wrapper2,
    });

    expect(result2.current?.workspaceType).toBe('PROPERTY');
    expect(result2.current?.workspaceId).toBe('property:p1');
  });
});

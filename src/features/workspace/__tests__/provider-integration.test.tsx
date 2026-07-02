/**
 * Provider Integration Test (GREEN phase)
 *
 * Validates the full provider → consumer → setter round-trip:
 *   1. Provider mounts → child reads context via useWorkspaceContext()
 *   2. Internal setter invoked (simulates switchWorkspace minimum)
 *   3. Consumer re-renders with new context (atomic replace, new object reference)
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

import {
  WorkspaceContextProvider,
  useWorkspaceContext,
  useWorkspaceSetContext,
} from '../model/workspace-context';
import type { WorkspaceContext } from '@entities/workspace';

// ═══════════════════════════════════════════════════════════════
// Consumer component that simulates a workspace switch
// ═══════════════════════════════════════════════════════════════

function Consumer() {
  const ctx = useWorkspaceContext();
  const setCtx = useWorkspaceSetContext();

  return (
    <div>
      <span data-testid="workspace-id">{ctx?.workspaceId ?? 'null'}</span>
      <span data-testid="workspace-type">{ctx?.workspaceType ?? 'null'}</span>
      <button
        data-testid="switch-btn"
        onClick={() => {
          setCtx?.({
            workspaceId: 'property:p1',
            workspaceType: 'PROPERTY',
            scope: { propertyId: 'p1' },
            permissions: ['maintenance:read', 'maintenance:create'],
          });
        }}
      >
        Switch
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('Provider Integration', () => {
  it('renders null context when no initial provided', () => {
    render(
      <WorkspaceContextProvider>
        <Consumer />
      </WorkspaceContextProvider>
    );

    expect(screen.getByTestId('workspace-id').textContent).toBe('null');
    expect(screen.getByTestId('workspace-type').textContent).toBe('null');
  });

  it('renders initial context when provided', () => {
    const initial: WorkspaceContext = {
      workspaceId: 'personal:u1',
      workspaceType: 'PERSONAL',
      permissions: ['profile:read', 'settings:manage'],
    };

    render(
      <WorkspaceContextProvider initial={initial}>
        <Consumer />
      </WorkspaceContextProvider>
    );

    expect(screen.getByTestId('workspace-id').textContent).toBe('personal:u1');
    expect(screen.getByTestId('workspace-type').textContent).toBe('PERSONAL');
  });

  it('atomically replaces context on setter invocation (C-01)', () => {
    const initial: WorkspaceContext = {
      workspaceId: 'personal:u1',
      workspaceType: 'PERSONAL',
      permissions: ['profile:read', 'settings:manage'],
    };

    render(
      <WorkspaceContextProvider initial={initial}>
        <Consumer />
      </WorkspaceContextProvider>
    );

    // Before switch
    expect(screen.getByTestId('workspace-id').textContent).toBe('personal:u1');

    // Trigger switch
    act(() => {
      screen.getByTestId('switch-btn').click();
    });

    // After switch — atomic replace, new object reference
    expect(screen.getByTestId('workspace-id').textContent).toBe('property:p1');
    expect(screen.getByTestId('workspace-type').textContent).toBe('PROPERTY');
  });
});

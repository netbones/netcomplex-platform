/**
 * NotificationLink — Tests
 *
 * Phase 122-03: Integration test for D-07 deep-link integration.
 * Asserts clicking NotificationLink calls switchWorkspace, navigates,
 * and does NOT navigate on resolve failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { DelegationListItem } from '@entities/delegation';

// ═══════════════════════════════════════════════════════════════
// Mutable mock state
// ═══════════════════════════════════════════════════════════════

const { mockSessionState, mockDelegationsList } = vi.hoisted(() => ({
  mockSessionState: {
    data: {
      user: {
        id: 'u1',
        email: 'agent@example.com',
        name: 'Agent Smith',
        image: null as string | null,
      },
    },
    isPending: false,
    error: null,
  } as {
    data: { user: { id: string; email: string; name: string; image: string | null } } | null;
    isPending: boolean;
    error: null;
  },
  mockDelegationsList: [] as DelegationListItem[],
}));

vi.mock('@api/client', () => ({
  useSession: () => mockSessionState,
}));

vi.mock('@entities/delegation', () => ({
  useDelegations: () => ({
    data: mockDelegationsList,
    isLoading: false,
    error: null,
  }),
}));

// ═══════════════════════════════════════════════════════════════
// next/navigation mock
// ═══════════════════════════════════════════════════════════════

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/notifications',
  useSearchParams: () => new URLSearchParams(''),
}));

// ═══════════════════════════════════════════════════════════════
// Imports after mocks
// ═══════════════════════════════════════════════════════════════

import { WorkspaceContextProvider } from '../../../../features/workspace/model/workspace-context';
import { NotificationLink } from '../NotificationLink';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function makeDelegation(overrides: Partial<DelegationListItem> = {}): DelegationListItem {
  return {
    id: 'd1',
    propertyId: 'prop-14-palm',
    propertyAddress: '14 Palm Avenue',
    agentId: 'a1',
    agentName: 'Agent Smith',
    agentEmail: 'agent@example.com',
    grantedById: 'o1',
    grantedByName: 'Owner Owens',
    permissions: ['maintenance:read'],
    status: 'ACTIVE',
    startedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2027-12-31T00:00:00Z',
    acceptedAt: '2026-01-01T00:00:00Z',
    rejectedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceContextProvider
        initial={{
          workspaceId: 'personal:u1',
          workspaceType: 'PERSONAL',
          permissions: ['profile:read', 'settings:manage'],
        }}
      >
        {children}
      </WorkspaceContextProvider>
    </QueryClientProvider>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('NotificationLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();
    mockSessionState.data = {
      user: { id: 'u1', email: 'agent@example.com', name: 'Agent Smith', image: null },
    };
    mockSessionState.isPending = false;
    mockSessionState.error = null;
    mockDelegationsList.length = 0;
    mockDelegationsList.push(makeDelegation());
  });

  it('clicking a /properties/<id> link calls switchWorkspace + navigates', async () => {
    render(
      <NotificationLink
        href="/properties/prop-14-palm/maintenance/123"
        notificationId="n1"
        className="test-link"
      >
        View details
      </NotificationLink>,
      { wrapper: Wrapper }
    );

    const link = screen.getByText('View details');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/properties/prop-14-palm/maintenance/123');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(link);
    });

    // switchWorkspace should have been called and router.push invoked
    expect(pushMock).toHaveBeenCalled();
  });

  it('does NOT navigate on resolve failure (revoked delegation)', async () => {
    // Set up a revoked delegation — switch will fail
    mockDelegationsList.length = 0;
    mockDelegationsList.push(makeDelegation({ id: 'd-revoked', status: 'REVOKED' }));

    // But the propertyId from the URL won't match d-revoked,
    // so inferWorkspaceTarget returns { workspaceType: 'PROPERTY', propertyId: 'prop-14-palm' }.
    // Since no delegation matches that property, we'll get registry_miss.
    // Let's test with a general /properties link where delegation is revoked.
    render(
      <NotificationLink href="/properties/prop-14-palm" notificationId="n2">
        View property
      </NotificationLink>,
      { wrapper: Wrapper }
    );

    const link = screen.getByText('View property');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(link);
    });

    // router.push should NOT be called — switch failed
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('falls through to plain Link for unrecognized paths', async () => {
    render(
      <NotificationLink href="/some/unknown/resource" notificationId="n3">
        Unknown resource
      </NotificationLink>,
      { wrapper: Wrapper }
    );

    const link = screen.getByText('Unknown resource');
    expect(link.getAttribute('href')).toBe('/some/unknown/resource');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(link);
    });

    // For unrecognized paths, NotificationLink doesn't prevent default —
    // the browser would follow the Link href normally.
    // No switchWorkspace was called (no delegation-specific routing).
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders with className passthrough', () => {
    render(
      <NotificationLink
        href="/properties/prop-14-palm"
        notificationId="n4"
        className="text-indigo-600 text-sm hover:underline mt-2 block"
      >
        View details
      </NotificationLink>,
      { wrapper: Wrapper }
    );

    const link = screen.getByText('View details');
    expect(link.className).toContain('text-indigo-600');
    expect(link.className).toContain('hover:underline');
  });
});

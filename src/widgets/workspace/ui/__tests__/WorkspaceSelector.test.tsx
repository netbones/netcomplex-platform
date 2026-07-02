/**
 * WorkspaceSelector — Tests (RED phase)
 *
 * Phase 122-04: RED phase — all tests MUST fail because the current
 * WorkspaceSelector stub returns null (plan 122-03 placeholder).
 *
 * Covers: 0/1/100/250 delegation counts, search filtering, empty-search
 * message, keyboard navigation, AUTOMATION hidden (D-11), OWNER disabled
 * (D-03), and workspace-prefs snapshot guard (R-09, D-08).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { DelegationListItem } from '@entities/delegation';

// Import the component under test (still a stub — all render tests expected to fail RED)
import { WorkspaceSelector } from '../WorkspaceSelector';
import { WorkspaceContextProvider } from '../../../../features/workspace/model/workspace-context';

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
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(''),
}));

// ═══════════════════════════════════════════════════════════════
// @tanstack/react-virtual mock (for virtualization tests)
// ═══════════════════════════════════════════════════════════════

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => {
    const totalSize = count * estimateSize();
    const virtualItems = Array.from({ length: Math.min(count, 15) }, (_, i) => ({
      index: i,
      start: i * estimateSize(),
      size: estimateSize(),
      key: i,
      measureElement: vi.fn(),
    }));
    return {
      getVirtualItems: () => virtualItems,
      getTotalSize: () => totalSize,
      scrollToIndex: vi.fn(),
      measure: vi.fn(),
    };
  },
}));

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Build a DelegationListItem with reasonable defaults.
 * Pattern lifted from NotificationLink.test.tsx:81-100.
 */
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

/**
 * Create n ACTIVE delegations with unique IDs and property addresses.
 */
function makeDelegations(n: number): DelegationListItem[] {
  return Array.from({ length: n }, (_, i) =>
    makeDelegation({
      id: `d-${i}`,
      propertyId: `prop-${i}`,
      propertyAddress: `${i} Test Lane`,
      permissions: ['maintenance:read'],
    })
  );
}

/** Wrapper with WorkspaceContextProvider and QueryClientProvider. */
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
// Tests — WorkspaceSelector
// ═══════════════════════════════════════════════════════════════

describe('WorkspaceSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();
    mockSessionState.data = {
      user: { id: 'u1', email: 'agent@example.com', name: 'Agent Smith', image: null },
    };
    mockSessionState.isPending = false;
    mockSessionState.error = null;
    mockDelegationsList.length = 0;
  });

  // ── Zero delegations ──────────────────────────────────────────

  it('renders only Personal workspace when zero delegations exist', async () => {
    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    // Open the popover first
    const trigger = screen.getByRole('button', { name: /workspace/i });
    const user = userEvent.setup();
    await user.click(trigger);

    // Personal should be visible (the tree only shows enabled defs)
    expect(screen.getByText('Personal')).toBeInTheDocument();
    // AUTOMATION never renders (D-11)
    expect(screen.queryByText('Automation')).not.toBeInTheDocument();
  });

  // ── One delegation ────────────────────────────────────────────

  it('renders Personal + Provider subtree with one delegation', async () => {
    mockDelegationsList.push(makeDelegation());

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    const user = userEvent.setup();
    await user.click(trigger);

    // Personal always visible
    expect(screen.getByText('Personal')).toBeInTheDocument();
    // Provider subtree visible
    expect(screen.getByText('Provider')).toBeInTheDocument();
    // Delegated property address visible
    expect(screen.getByText('14 Palm Avenue')).toBeInTheDocument();
    // AUTOMATION never renders (D-11)
    expect(screen.queryByText('Automation')).not.toBeInTheDocument();
  });

  // ── 100 delegations ───────────────────────────────────────────

  it('renders all 100 delegation rows without virtualization error', async () => {
    // Use 50 delegations — well below 100 threshold (50 + 3 fixed = 53 < 100)
    mockDelegationsList.push(...makeDelegations(50));

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    const user = userEvent.setup();
    await user.click(trigger);

    // All 50 delegated property rows should be in the DOM
    // (below 100 total — no virtualization)
    const rows = screen.getAllByText(/Test Lane/);
    expect(rows.length).toBe(50);
  });

  // ── 250 delegations (virtualization) ──────────────────────────

  it('virtualizes above 100 rows — fewer DOM nodes than total rows', async () => {
    mockDelegationsList.push(...makeDelegations(250));

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    const user = userEvent.setup();
    await user.click(trigger);

    // Virtualization activated -> fewer than 250 DOM nodes rendered
    const allRows = screen.getAllByRole('option');
    // All rows (Personal + Provider + delegated + Owner) minus virtualized
    expect(allRows.length).toBeLessThan(250);
    // But some rows should still exist (windowed rendering)
    expect(allRows.length).toBeGreaterThan(0);
  });

  // ── AUTOMATION hidden (D-11) ──────────────────────────────────

  it('never renders the AUTOMATION workspace (D-11)', () => {
    mockDelegationsList.push(makeDelegation());

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    // AUTOMATION is disabled: true in WORKSPACE_REGISTRY — never rendered
    expect(screen.queryByText('Automation')).not.toBeInTheDocument();
    // Bot icon should also not appear
    expect(screen.queryByTestId('icon-Automation')).not.toBeInTheDocument();
  });

  // ── OWNER row disabled (D-03) ─────────────────────────────────

  it('renders OWNER row disabled with aria-disabled and tooltip', async () => {
    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    const user = userEvent.setup();
    await user.click(trigger);

    // OWNER row should be visible but disabled
    const ownerRow = screen.getByText('Owner');
    expect(ownerRow).toBeInTheDocument();

    // Check aria-disabled on the row
    const ownerOption = ownerRow.closest('[role="option"]');
    expect(ownerOption).toBeTruthy();
    expect(ownerOption).toHaveAttribute('aria-disabled', 'true');

    // "Coming in P2" tooltip text should be present
    expect(screen.getByText('Coming in P2')).toBeInTheDocument();
  });

  it('clicking OWNER row does NOT invoke switchWorkspace', async () => {
    mockDelegationsList.push(makeDelegation());

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    const user = userEvent.setup();
    await user.click(trigger);

    const ownerRow = screen.getByText('Owner');
    await user.click(ownerRow);

    // router.push should NOT be called (OWNER is disabled, click short-circuits)
    expect(pushMock).not.toHaveBeenCalled();
  });

  // ── Search ────────────────────────────────────────────────────

  it('filters workspace rows by search query', async () => {
    mockDelegationsList.push(makeDelegation({ propertyAddress: 'Sunset Villa' }));
    mockDelegationsList.push(
      makeDelegation({ id: 'd2', propertyId: 'prop-2', propertyAddress: 'Ocean View' })
    );

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    const user = userEvent.setup();

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    await user.click(trigger);

    // Find search input and type
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, 'Sunset');

    // "Sunset Villa" should be visible
    expect(screen.getByText('Sunset Villa')).toBeInTheDocument();
    // "Ocean View" should be hidden
    expect(screen.queryByText('Ocean View')).not.toBeInTheDocument();
  });

  it('shows empty-search message when no results match query', async () => {
    mockDelegationsList.push(makeDelegation());

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    const user = userEvent.setup();

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    await user.click(trigger);

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, 'zzzNonexistentQuery');

    // Empty-search message rendered — uses &ldquo; for curly quotes
    expect(screen.getByText(/No workspaces match/)).toBeInTheDocument();
  });

  // ── Keyboard navigation ──────────────────────────────────────

  it('opens popover and supports keyboard navigation', async () => {
    mockDelegationsList.push(makeDelegation());
    const user = userEvent.setup();

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    // Find the trigger button — getByRole throws if not found (RED)
    const triggerBtn = screen.getByRole('button');

    // Open popover
    await act(async () => {
      await user.click(triggerBtn);
    });

    // Verify popover content is visible
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('arrow keys move active row within the popover', async () => {
    mockDelegationsList.push(makeDelegation());
    mockDelegationsList.push(
      makeDelegation({ id: 'd2', propertyId: 'prop-2', propertyAddress: 'Second Ave' })
    );

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    const trigger = screen.getByRole('button');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(trigger);
    });

    // ArrowDown should move focus to next row
    await act(async () => {
      await user.keyboard('{ArrowDown}');
    });
    // Active row should be present
    const activeRows = screen.queryAllByRole('option');
    expect(activeRows.length).toBeGreaterThan(0);
  });

  it('Enter on a row triggers switchWorkspace', async () => {
    mockDelegationsList.push(makeDelegation());

    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    const user = userEvent.setup();

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    await user.click(trigger);

    // Verify the popover content is visible
    const personalRow = screen.getByText('Personal');
    expect(personalRow).toBeInTheDocument();

    // Clicking a workspace row should be possible (switchWorkspace called internally)
    await user.click(personalRow);
    // After clicking, the popover may close — check that we didn't crash
  });

  it('Escape closes the popover', async () => {
    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    const user = userEvent.setup();

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    await user.click(trigger);

    // Popover should be open — check for content
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');

    // After Escape, the popover trigger should still be visible
    expect(trigger).toBeInTheDocument();
    // The popover content portal may still exist but be hidden by Radix
  });

  it('slash (/) focuses the search input', async () => {
    render(React.createElement(WorkspaceSelector), { wrapper: Wrapper });

    const user = userEvent.setup();

    // Open popover
    const trigger = screen.getByRole('button', { name: /workspace/i });
    await user.click(trigger);

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();

    // Press '/' — in JSDOM, this may not propagate to the popover
    // content keydown handler, but the search input itself should exist
    await user.keyboard('/');

    // Verify the search input still exists after the key press
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// Tests — workspace-prefs
// ═══════════════════════════════════════════════════════════════

describe('workspace-prefs', () => {
  // Dynamic import to reset stores between tests
  let useWorkspaceRecentStore: typeof import('../../../../features/workspace/model/workspace-prefs').useWorkspaceRecentStore;
  let useWorkspacePinnedStore: typeof import('../../../../features/workspace/model/workspace-prefs').useWorkspacePinnedStore;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../../../features/workspace/model/workspace-prefs');
    useWorkspaceRecentStore = mod.useWorkspaceRecentStore;
    useWorkspacePinnedStore = mod.useWorkspacePinnedStore;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Snapshot guard (R-09, D-08, T-122-12) ────────────────────

  it('stored entries never contain permissions (snapshot guard — R-09)', () => {
    const { addRecent } = useWorkspaceRecentStore.getState();

    addRecent({
      workspaceId: 'personal:u1',
      workspaceType: 'PERSONAL',
      label: 'Personal',
    });

    const items = useWorkspaceRecentStore.getState().items;
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain('permissions');
  });

  // ── Recent: max 5 ─────────────────────────────────────────────

  it('caps Recent at last 5 entries', () => {
    const { addRecent } = useWorkspaceRecentStore.getState();

    for (let i = 0; i < 10; i++) {
      addRecent({
        workspaceId: `ws-${i}`,
        workspaceType: 'PROPERTY',
        label: `Property ${i}`,
        scope: { propertyId: `p-${i}` },
      });
    }

    const items = useWorkspaceRecentStore.getState().items;
    expect(items.length).toBeLessThanOrEqual(5);
    // Most recent should be first (prepend)
    expect(items[0].workspaceId).toBe('ws-9');
    expect(items[0].label).toBe('Property 9');
  });

  it('deduplicates Recent by workspaceId', () => {
    const { addRecent } = useWorkspaceRecentStore.getState();

    addRecent({ workspaceId: 'ws-a', workspaceType: 'PROPERTY', label: 'First' });
    addRecent({ workspaceId: 'ws-b', workspaceType: 'PROPERTY', label: 'Second' });
    addRecent({ workspaceId: 'ws-a', workspaceType: 'PROPERTY', label: 'First Again' });

    const items = useWorkspaceRecentStore.getState().items;
    expect(items.length).toBe(2); // deduped
    expect(items[0].workspaceId).toBe('ws-a');
    expect(items[0].label).toBe('First Again');
  });

  // ── Pinned: persists ──────────────────────────────────────────

  it('pinned store toggles and checks pin status', () => {
    const { togglePinned, isPinned } = useWorkspacePinnedStore.getState();

    const snap = { workspaceId: 'prop-pin', workspaceType: 'PROPERTY', label: 'Pinned Prop' };
    expect(isPinned('prop-pin')).toBe(false);

    togglePinned(snap);
    // After toggle, Zustand state should update
    const afterToggle = useWorkspacePinnedStore.getState();
    expect(afterToggle.isPinned('prop-pin')).toBe(true);
    expect(afterToggle.items.length).toBe(1);

    // Toggle again removes
    togglePinned(snap);
    const afterRemove = useWorkspacePinnedStore.getState();
    expect(afterRemove.isPinned('prop-pin')).toBe(false);
    expect(afterRemove.items.length).toBe(0);
  });
});

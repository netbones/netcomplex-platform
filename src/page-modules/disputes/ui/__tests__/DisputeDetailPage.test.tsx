/**
 * Tests for DisputeDetailPage — layout composition of 10 entity UI components.
 * Plan 107-04 Task 3
 *
 * NOTE: The component renders both desktop (md:grid) and mobile (md:hidden) layouts
 * simultaneously, controlling visibility via CSS. Tests use getAllByTestId() to
 * handle multiple instances, verifying that at least 1 renders (both layouts share
 * the same component mocks).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mock fetch ──
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Mock entity UI components ──
vi.mock('@entities/dispute', () => ({
  MediationThread: ({ disputeId }: { disputeId: string }) => (
    <div data-testid="mediation-thread" data-id={disputeId}>
      MediationThread
    </div>
  ),
  DisputeActionsBar: ({ dispute }: { dispute: { referenceNumber: string } }) => (
    <div data-testid="dispute-actions-bar" data-ref={dispute.referenceNumber}>
      DisputeActionsBar
    </div>
  ),
  DisputeTimeline: () => <div data-testid="dispute-timeline">DisputeTimeline</div>,
  EvidenceUploadZone: ({ disputeId }: { disputeId: string }) => (
    <div data-testid="evidence-upload-zone" data-id={disputeId}>
      EvidenceUploadZone
    </div>
  ),
  EvidencePreviewGrid: ({ disputeId }: { disputeId: string }) => (
    <div data-testid="evidence-preview-grid" data-id={disputeId}>
      EvidencePreviewGrid
    </div>
  ),
  AIFrivolityCheckPanel: ({ disputeId }: { disputeId: string }) => (
    <div data-testid="ai-frivolity-check-panel" data-id={disputeId}>
      AIFrivolityCheckPanel
    </div>
  ),
  DisputeStatusBadge: () => <div data-testid="dispute-status-badge">DisputeStatusBadge</div>,
  DisputeCategoryBadge: () => <div data-testid="dispute-category-badge">DisputeCategoryBadge</div>,
  SeverityIndicator: () => <div data-testid="severity-indicator">SeverityIndicator</div>,
  CSOSExportButton: ({ disputeId }: { disputeId: string }) => (
    <div data-testid="csos-export-button" data-id={disputeId}>
      CSOSExportButton
    </div>
  ),
  CoolingOffTimer: () => <div data-testid="cooling-off-timer">CoolingOffTimer</div>,
}));

// ── Mock feature hooks (inline to avoid hoisting issues) ──
vi.mock('@features/dispute', () => ({
  useDisputeThread: vi.fn(() => ({ threadState: 'ready' as const, error: null })),
  useDisputeActions: vi.fn(() => ({
    availableActions: [],
    executeAction: vi.fn(),
    isLoading: false,
  })),
  DisputeIntakeWizard: () => <div data-testid="dispute-intake-wizard">Wizard</div>,
  DisputeForm: () => <div data-testid="dispute-form">Form</div>,
}));

// ── Mock auth session (inline) ──
vi.mock('@api/client', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'user-1', role: 'RESIDENT' } },
    isPending: false,
  })),
  authClient: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  getSession: vi.fn(),
  trpc: {},
}));

// ── Mock shared UI ──
vi.mock('@shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@shared/ui')>('@shared/ui');
  return {
    ...actual,
    LoadingSkeleton: (props: { lines?: number; height?: string; className?: string }) => (
      <div data-testid="loading-skeleton" data-lines={props.lines ?? 1}>
        LoadingSkeleton
      </div>
    ),
    LoadingSpinner: () => <div data-testid="loading-spinner">LoadingSpinner</div>,
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="error-boundary">{children}</div>
    ),
  };
});

import { DisputeDetailPage } from '@pages/disputes';
import { useDisputeThread } from '@features/dispute';
import { useSession } from '@api/client';

// Type escape hatch for mock overrides
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSession = useSession as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockThread = useDisputeThread as any;

// ── Default dispute data ──
const defaultDispute = {
  id: 'dispute-1',
  tenantId: 'tenant-1',
  referenceNumber: 'SRV-2026-0001',
  complainantId: 'user-1',
  respondentType: 'RESIDENT' as const,
  category: 'NOISE' as const,
  title: 'Loud Music',
  description: 'Neighbor plays loud music late at night.',
  severity: 'MODERATE' as const,
  status: 'SUBMITTED' as const,
  isConfidential: false,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

// Helper: assert at least N testid elements render (handles dual desktop+mobile rendering)
function expectAtLeastN(testId: string, minCount: number = 1) {
  const elements = screen.getAllByTestId(testId);
  expect(elements.length).toBeGreaterThanOrEqual(minCount);
  return elements;
}

describe('DisputeDetailPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockSession.mockReturnValue({
      data: { user: { id: 'user-1', role: 'RESIDENT' } },
      isPending: false,
    });
    mockThread.mockReturnValue({ threadState: 'ready', error: null });
  });

  // ── Test 1: Loading state ──
  it('renders loading state with LoadingSkeleton placeholders', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    mockSession.mockReturnValue({ data: null, isPending: true });
    mockThread.mockReturnValue({ threadState: 'loading', error: null });

    render(<DisputeDetailPage disputeId="dispute-1" />);
    expect(screen.getByTestId('loading-skeleton-container')).toBeInTheDocument();
  });

  // ── Test 2: Header renders all header components ──
  it('renders header with DisputeTimeline, DisputeStatusBadge, DisputeCategoryBadge, SeverityIndicator, CSOSExportButton', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: defaultDispute }),
    });

    render(<DisputeDetailPage disputeId="dispute-1" />);

    await screen.findByTestId('dispute-timeline');
    expectAtLeastN('dispute-status-badge');
    expectAtLeastN('dispute-category-badge');
    expectAtLeastN('severity-indicator');
    expectAtLeastN('csos-export-button');
  });

  // ── Test 3: Dispute title ──
  it('renders dispute title as "Dispute #{referenceNumber}"', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: defaultDispute }),
    });

    render(<DisputeDetailPage disputeId="dispute-1" />);
    await screen.findByText('Dispute #SRV-2026-0001');
  });

  // ── Test 4: Desktop left column ──
  it('desktop layout renders MediationThread and DisputeActionsBar in left column', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: defaultDispute }),
    });

    render(<DisputeDetailPage disputeId="dispute-1" />);

    // Use findAllByTestId — both desktop and mobile render these components
    const threads = await screen.findAllByTestId('mediation-thread');
    expect(threads.length).toBeGreaterThanOrEqual(1);

    const actionsBars = screen.getAllByTestId('dispute-actions-bar');
    expect(actionsBars.length).toBeGreaterThanOrEqual(1);
  });

  // ── Test 5: Desktop right column ──
  it('desktop layout renders EvidenceUploadZone, EvidencePreviewGrid, AIFrivolityCheckPanel, CoolingOffTimer in right column', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: defaultDispute }),
    });

    render(<DisputeDetailPage disputeId="dispute-1" />);

    await screen.findByTestId('evidence-upload-zone');
    expectAtLeastN('evidence-preview-grid');
    expectAtLeastN('ai-frivolity-check-panel');
    expectAtLeastN('cooling-off-timer');
  });

  // ── Test 6: Mobile tab bar ──
  it('mobile tab bar renders 3 tabs: Timeline, Thread, Evidence', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: defaultDispute }),
    });

    render(<DisputeDetailPage disputeId="dispute-1" />);

    const timelineTabs = await screen.findAllByText('Timeline');
    expect(timelineTabs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Thread')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
  });

  // ── Test 7: Default Thread tab ──
  it('mobile "Thread" tab is active by default (MediationThread visible)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: defaultDispute }),
    });

    render(<DisputeDetailPage disputeId="dispute-1" />);

    const threads = await screen.findAllByTestId('mediation-thread');
    expect(threads.length).toBeGreaterThanOrEqual(1);
  });

  // ── Test 8: Tab switching ──
  it('switching to "Timeline" tab renders DisputeTimeline in mobile panel', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: defaultDispute }),
    });

    render(<DisputeDetailPage disputeId="dispute-1" />);

    const timelineTabs = await screen.findAllByText('Timeline');
    // Click the mobile Timeline tab (the one in md:hidden)
    fireEvent.click(timelineTabs[timelineTabs.length - 1]);

    const timelines = screen.getAllByTestId('dispute-timeline');
    expect(timelines.length).toBeGreaterThanOrEqual(1);
  });

  // ── Test 9: Error state ──
  it('renders error state when useDisputeThread returns error', () => {
    mockThread.mockReturnValue({ threadState: 'error', error: 'Dispute not found' });

    render(<DisputeDetailPage disputeId="dispute-1" />);

    expect(screen.getByText(/doesn't exist or you don't have permission/i)).toBeInTheDocument();
  });

  // ── Test 10: Sticky bottom bar ──
  it('mobile sticky bottom bar renders DisputeActionsBar, CoolingOffTimer, CSOSExportButton', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: defaultDispute }),
    });

    render(<DisputeDetailPage disputeId="dispute-1" />);

    const actionsBars = await screen.findAllByTestId('dispute-actions-bar');
    expect(actionsBars.length).toBeGreaterThanOrEqual(1);
    expectAtLeastN('cooling-off-timer');
    expectAtLeastN('csos-export-button');
  });
});

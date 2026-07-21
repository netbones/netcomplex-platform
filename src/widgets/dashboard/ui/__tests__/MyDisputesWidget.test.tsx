/**
 * Tests for MyDisputesWidget resident-facing dispute widget.
 * Plan 107-03 Task 3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockListDisputes = vi.hoisted(() => vi.fn());

vi.mock('@api/client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: 'user-1', role: 'RESIDENT' } } }),
  },
  trpc: {
    disputes: {
      listDisputes: {
        useQuery: mockListDisputes,
      },
    },
  },
}));

// Mock the entity/feature imports
vi.mock('@entities/dispute', () => ({
  DisputeListTable: () => <div data-testid="dispute-list-table">DisputeListTable</div>,
}));

vi.mock('@features/dispute', () => ({
  DisputeIntakeWizard: (props: {
    aiEnabled: boolean;
    onComplete: (id: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="dispute-intake-wizard">
      <span data-testid="wizard-ai-enabled">{String(props.aiEnabled)}</span>
      <button data-testid="wizard-onComplete" onClick={() => props.onComplete('test-id')}>
        Complete
      </button>
      <button data-testid="wizard-onCancel" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock('@shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@shared/ui')>('@shared/ui');
  return {
    ...actual,
    LoadingSkeleton: (props: { lines?: number; height?: string; className?: string }) => (
      <div data-testid="loading-skeleton" data-lines={props.lines ?? 1}>
        LoadingSkeleton
      </div>
    ),
  };
});

vi.mock('@shared/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

import { MyDisputesWidget } from '../MyDisputesWidget';

describe('MyDisputesWidget', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    mockListDisputes.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
      isError: false,
    });
  });

  // Test 1
  it('renders "My Disputes" heading and "File a Dispute" CTA button', () => {
    render(<MyDisputesWidget />);

    expect(screen.getByText('My Disputes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /file a new dispute/i })).toBeInTheDocument();
    expect(screen.getByText('File a Dispute')).toBeInTheDocument();
  });

  // Test 2
  it('clicking "File a Dispute" switches view to wizard (breadcrumb visible)', () => {
    render(<MyDisputesWidget />);

    const cta = screen.getByRole('button', { name: /file a new dispute/i });
    fireEvent.click(cta);

    // Breadcrumb should be visible in wizard view
    expect(screen.getByText(/Back to My Disputes/)).toBeInTheDocument();
    // Wizard should be rendered
    expect(screen.getByTestId('dispute-intake-wizard')).toBeInTheDocument();
  });

  // Test 3
  it('wizard renders DisputeIntakeWizard with aiEnabled prop', () => {
    render(<MyDisputesWidget />);

    // Click to enter wizard
    fireEvent.click(screen.getByRole('button', { name: /file a new dispute/i }));

    // aiEnabled should be "true"
    expect(screen.getByTestId('wizard-ai-enabled').textContent).toBe('true');
  });

  // Test 4
  it('clicking "Back to My Disputes" breadcrumb returns to list view', () => {
    render(<MyDisputesWidget />);

    // Enter wizard
    fireEvent.click(screen.getByRole('button', { name: /file a new dispute/i }));
    expect(screen.getByTestId('dispute-intake-wizard')).toBeInTheDocument();

    // Click back breadcrumb
    fireEvent.click(screen.getByText(/Back to My Disputes/));

    // Should be back in list view — CTA visible again
    expect(screen.getByRole('button', { name: /file a new dispute/i })).toBeInTheDocument();
  });

  // Test 5
  it('renders DisputeListTable wrapped in ErrorBoundary in list view', () => {
    render(<MyDisputesWidget />);

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('dispute-list-table')).toBeInTheDocument();
  });
});

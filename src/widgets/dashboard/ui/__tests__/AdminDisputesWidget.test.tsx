/**
 * Tests for AdminDisputesWidget moderation queue.
 * Plan 107-03 Task 3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock entity components
vi.mock('@entities/dispute', () => ({
  DisputeStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
  DisputeCategoryBadge: ({ category }: { category: string }) => (
    <span data-testid="category-badge">{category}</span>
  ),
  SeverityIndicator: ({ severity }: { severity: string }) => (
    <span data-testid="severity-indicator">{severity}</span>
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

import { AdminDisputesWidget } from '../AdminDisputesWidget';

const mockDisputes = [
  {
    id: 'd1',
    referenceNumber: 'DIS-001',
    category: 'NOISE',
    title: 'Loud music',
    severity: 'MODERATE',
    status: 'SUBMITTED',
    complainantId: 'u1',
    respondentType: 'RESIDENT',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd2',
    referenceNumber: 'DIS-002',
    category: 'PARKING',
    title: 'Blocked driveway',
    severity: 'MINOR',
    status: 'MEDIATION_ACTIVE',
    complainantId: 'u2',
    respondentType: 'RESIDENT',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updatedAt: new Date().toISOString(),
  },
];

describe('AdminDisputesWidget', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // Test 1
  it('renders "Dispute Moderation" heading', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminDisputesWidget />);

    expect(screen.getByText('Dispute Moderation')).toBeInTheDocument();
  });

  // Test 2
  it('renders 3 filter tabs with expected labels', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminDisputesWidget />);

    expect(screen.getByText(/Pending Assignment/)).toBeInTheDocument();
    expect(screen.getByText(/In Mediation/)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting Ruling/)).toBeInTheDocument();
  });

  // Test 3
  it('clicking a tab fetches disputes with correct status filter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminDisputesWidget />);

    // Initial fetch on mount (pending tab)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Click Mediation tab
    fireEvent.click(screen.getByText(/In Mediation/));
    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const mediationCall = calls[calls.length - 1];
      const url = mediationCall[0] as string;
      expect(url).toContain('status=MEDIATION_OFFERED');
      expect(url).toContain('status=MEDIATION_ACTIVE');
    });
  });

  // Test 4
  it('renders status/category/severity badges per dispute row', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDisputes),
    });

    render(<AdminDisputesWidget />);

    await waitFor(() => {
      expect(screen.getAllByTestId('status-badge').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
  });

  // Test 5
  it('shows SLA urgent indicator when dispute is >5 days pending', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDisputes), // d1 is 7 days old, SUBMITTED
    });

    render(<AdminDisputesWidget />);

    await waitFor(() => {
      expect(screen.getByText(/URGENT/)).toBeInTheDocument();
    });
  });

  // Test 6
  it('empty state renders "No disputes in this queue"', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminDisputesWidget />);

    await waitFor(() => {
      expect(screen.getByText('No disputes in this queue')).toBeInTheDocument();
    });
  });
});

/**
 * Tests for FrivolityScreen wizard stage component.
 * Plan 107-02 Task 3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock fetch at top level
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { FrivolityScreen } from '../FrivolityScreen';

const mockProceed = vi.fn();
const mockOnResult = vi.fn();

const mockSuccessResponse = (data: unknown, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
};

const mockErrorResponse = (status = 500) => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
};

describe('FrivolityScreen', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockProceed.mockReset();
    mockOnResult.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('on mount, calls fetch to /api/disputes/intake-screen with correct JSON body', async () => {
    mockFetch.mockReturnValueOnce(
      mockSuccessResponse({
        toneScore: 3,
        issueClarity: 7,
        likelyFrivolous: false,
        suggestedCategory: 'NOISE',
        deEscalationTip: null,
      })
    );

    render(
      <FrivolityScreen
        description="Test description text for AI analysis"
        onResult={mockOnResult}
        onProceed={mockProceed}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/disputes/intake-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Test description text for AI analysis',
        }),
      });
    });
  });

  it('on successful response with likelyFrivolous=true, renders flagged message', async () => {
    mockFetch.mockReturnValueOnce(
      mockSuccessResponse({
        toneScore: 8,
        issueClarity: 3,
        likelyFrivolous: true,
        suggestedCategory: 'NOISE',
        deEscalationTip: 'Consider documenting specific incidents.',
      })
    );

    render(
      <FrivolityScreen
        description="angry noise complaint"
        onResult={mockOnResult}
        onProceed={mockProceed}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Our system flagged some concerns/i)).toBeInTheDocument();
    });

    // Verify toneScore is rendered
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('on successful response with likelyFrivolous=false, renders not frivolous message', async () => {
    mockFetch.mockReturnValueOnce(
      mockSuccessResponse({
        toneScore: 2,
        issueClarity: 8,
        likelyFrivolous: false,
        suggestedCategory: 'BOUNDARIES',
        deEscalationTip: null,
      })
    );

    render(
      <FrivolityScreen
        description="fence line dispute"
        onResult={mockOnResult}
        onProceed={mockProceed}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Your dispute does not appear frivolous/i)).toBeInTheDocument();
    });
  });

  it('"Proceed" button is always rendered', async () => {
    mockFetch.mockReturnValueOnce(
      mockSuccessResponse({
        toneScore: 2,
        issueClarity: 8,
        likelyFrivolous: false,
        suggestedCategory: 'BOUNDARIES',
        deEscalationTip: null,
      })
    );

    render(
      <FrivolityScreen
        description="fence line dispute"
        onResult={mockOnResult}
        onProceed={mockProceed}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Proceed/i })).toBeInTheDocument();
    });
  });

  it('on fetch error, renders Assessment unavailable degraded state and still shows Proceed button', async () => {
    mockFetch.mockReturnValueOnce(mockErrorResponse(500));

    render(<FrivolityScreen description="test" onResult={mockOnResult} onProceed={mockProceed} />);

    await waitFor(() => {
      expect(screen.getByText(/Assessment unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Proceed/i })).toBeInTheDocument();
  });

  it('calls onProceed when "Proceed" button is clicked', async () => {
    mockFetch.mockReturnValueOnce(
      mockSuccessResponse({
        toneScore: 2,
        issueClarity: 8,
        likelyFrivolous: false,
        suggestedCategory: 'BOUNDARIES',
        deEscalationTip: null,
      })
    );

    render(<FrivolityScreen description="test" onResult={mockOnResult} onProceed={mockProceed} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Proceed/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Proceed/i }));
    expect(mockProceed).toHaveBeenCalled();
  });
});

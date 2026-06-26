/**
 * Tests for DisputeForm component.
 * Plan 107-02 Task 3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock fetch at top level
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { DisputeForm } from '../../DisputeForm';
import { toast } from 'sonner';

const mockOnComplete = vi.fn();
const mockOnCancel = vi.fn();

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

/** Helper: fill all required fields in the dispute form */
async function fillRequiredFields() {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText(/Category/i), 'NOISE');
  await user.type(screen.getByLabelText(/^Title/), 'Loud music at night');
  await user.type(
    screen.getByLabelText(/^Description/),
    'Neighbor plays loud music after 10pm every night'
  );
  return user;
}

describe('DisputeForm', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockOnComplete.mockReset();
    mockOnCancel.mockReset();
    vi.mocked(toast.error).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 7 form fields', () => {
    render(<DisputeForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Desired Outcome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Respondent$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Respondent ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Severity/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitted with empty required fields', async () => {
    const user = userEvent.setup();
    render(<DisputeForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await user.click(screen.getByRole('button', { name: /Submit Dispute/i }));

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/min|Required|String must contain/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('on successful submit, calls fetch to /api/disputes with correct body', async () => {
    mockFetch.mockReturnValueOnce(mockSuccessResponse({ id: 'test-dispute-uuid' }, 201));

    render(<DisputeForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    const user = await fillRequiredFields();

    await user.click(screen.getByRole('button', { name: /Submit Dispute/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.category).toBe('NOISE');
    expect(body.title).toBe('Loud music at night');
    expect(body.description).toBe('Neighbor plays loud music after 10pm every night');
  });

  it('on fetch success (201 + { id: uuid }), calls onComplete with the dispute id', async () => {
    mockFetch.mockReturnValueOnce(mockSuccessResponse({ id: 'dispute-123-abc' }, 201));

    render(<DisputeForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    const user = await fillRequiredFields();

    await user.click(screen.getByRole('button', { name: /Submit Dispute/i }));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('dispute-123-abc');
    });
  });

  it('on fetch error (500), shows sonner toast', async () => {
    mockFetch.mockReturnValueOnce(mockErrorResponse(500));

    render(<DisputeForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    const user = await fillRequiredFields();

    await user.click(screen.getByRole('button', { name: /Submit Dispute/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('"Back to list" cancel button calls onCancel', async () => {
    const user = userEvent.setup();
    render(<DisputeForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Back to list'));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});

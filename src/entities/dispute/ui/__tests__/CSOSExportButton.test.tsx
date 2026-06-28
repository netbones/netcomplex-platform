/**
 * Tests for CSOSExportButton component — binary PDF download behavior.
 * Plan 108-02 Task 1 — TDD RED phase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-mock-id'),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { CSOSExportButton } from '../CSOSExportButton';

describe('CSOSExportButton', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let capturedFilename: string | null;

  beforeEach(() => {
    capturedFilename = null;

    // Mock global fetch
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Mock URL.createObjectURL / revokeObjectURL
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url-test');
    mockRevokeObjectURL = vi.fn(() => {});
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      mockCreateObjectURL as unknown as (obj: Blob | MediaSource) => string
    );
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(
      mockRevokeObjectURL as unknown as (url: string) => void
    );

    // Spy on HTMLAnchorElement.prototype.click to capture download filename
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      capturedFilename = this.download;
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper: create a mock PDF success response
  function pdfResponse(filename?: string) {
    const blob = new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' });
    return {
      status: 200,
      ok: true,
      blob: async () => blob,
      headers: new Headers(
        filename ? { 'Content-Disposition': `attachment; filename="${filename}"` } : {}
      ),
    };
  }

  // ============================================
  // Test 1: Successful download (PDF)
  // ============================================
  it('downloads a PDF file when export succeeds and shows success toast', async () => {
    mockFetch.mockResolvedValueOnce(pdfResponse('csos-export-DSP-2026-0001.pdf'));

    render(<CSOSExportButton disputeId="test-dispute-123" userId="user-456" />);

    const button = screen.getByRole('button', { name: /export/i });
    expect(button).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('CSOS export downloaded');
    });

    // Verify fetch URL
    expect(mockFetch).toHaveBeenCalledWith('/api/disputes/test-dispute-123/csos-export');

    // Verify blob was created from response
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

    // Verify download triggered with correct filename from Content-Disposition
    expect(capturedFilename).toBe('csos-export-DSP-2026-0001.pdf');

    // Verify object URL revoked after download
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url-test');
  });

  // ============================================
  // Test 2: Rate limited (429)
  // ============================================
  it('shows error toast on 429 and sets export count to max (disabling button)', async () => {
    mockFetch.mockResolvedValueOnce({ status: 429, ok: false });

    render(<CSOSExportButton disputeId="test-dispute-123" userId="user-456" />);

    const button = screen.getByRole('button', { name: /export/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Export limit reached (3 per day). Try again tomorrow.'
      );
    });

    // Button should be disabled after rate limit hit
    expect(button).toBeDisabled();

    // No blob/download should have been attempted
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
    expect(capturedFilename).toBeNull();
  });

  // ============================================
  // Test 3: Auth error (403)
  // ============================================
  it('shows error toast on 403 with server error message, no download', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 403,
      ok: false,
      json: async () => ({ error: { message: 'Forbidden' } }),
    });

    render(<CSOSExportButton disputeId="test-dispute-123" userId="user-456" />);

    const button = screen.getByRole('button', { name: /export/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Forbidden');
    });

    // No download
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
    expect(capturedFilename).toBeNull();
  });

  // ============================================
  // Test 4: Disabled state at limit
  // ============================================
  it('is disabled when export count reaches 3 and shows limit tooltip', async () => {
    // Simulate 3 successful exports to hit the limit
    mockFetch
      .mockResolvedValueOnce(pdfResponse('csos-export-1.pdf'))
      .mockResolvedValueOnce(pdfResponse('csos-export-2.pdf'))
      .mockResolvedValueOnce(pdfResponse('csos-export-3.pdf'));

    render(<CSOSExportButton disputeId="test-dispute-123" userId="user-456" />);

    const button = screen.getByRole('button', { name: /export/i });

    // Click 3 times
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(i + 1);
      });
    }

    // After 3 exports, button should be disabled
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Daily export limit reached (3 per day)');
  });

  // ============================================
  // Test 5: Loading state
  // ============================================
  it('shows loading spinner with "Exporting..." text during fetch', async () => {
    // Create a deferred promise so we can inspect the loading state
    let resolvePromise!: (value: unknown) => void;
    const deferred = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(deferred);

    render(<CSOSExportButton disputeId="test-dispute-123" userId="user-456" />);

    const button = screen.getByRole('button', { name: /export/i });

    await act(async () => {
      fireEvent.click(button);
    });

    // During fetch, button should show "Exporting..." text
    await waitFor(() => {
      expect(screen.getByText('Exporting...')).toBeInTheDocument();
    });

    // Loading toast should have been created
    expect(toast.loading).toHaveBeenCalledWith('Generating CSOS export...');

    // Button should be disabled during export
    expect(button).toBeDisabled();

    // Resolve the promise to clean up
    await act(async () => {
      resolvePromise(pdfResponse('csos-export-done.pdf'));
    });
  });

  // ============================================
  // Test 6: Download cleanup (revokeObjectURL)
  // ============================================
  it('revokes object URL after successful download', async () => {
    mockFetch.mockResolvedValueOnce(pdfResponse('csos-export-cleanup.pdf'));

    render(<CSOSExportButton disputeId="test-dispute-123" userId="user-456" />);

    const button = screen.getByRole('button', { name: /export/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });

    // URL.revokeObjectURL must be called after download
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
    // createObjectURL must be called before revoke
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // Test 7: Fallback filename when Content-Disposition missing
  // ============================================
  it('falls back to "csos-export-{disputeId}.pdf" when Content-Disposition header is missing', async () => {
    mockFetch.mockResolvedValueOnce(pdfResponse(/* no filename */));

    render(<CSOSExportButton disputeId="test-dispute-123" userId="user-456" />);

    const button = screen.getByRole('button', { name: /export/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });

    // When Content-Disposition is missing, fallback to disputeId-based filename
    expect(capturedFilename).toBe('csos-export-test-dispute-123.pdf');
  });
});

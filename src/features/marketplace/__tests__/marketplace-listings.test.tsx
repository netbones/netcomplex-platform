import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketplaceListingsPage } from '../ui/MarketplaceListingsPage';

// Mock the fetch function
beforeEach(() => {
  vi.restoreAllMocks();
});

describe('MarketplaceListingsPage', () => {
  it('renders loading state initially', () => {
    // Mock fetch to never resolve (loading state)
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }) as Promise<Response>
    );

    render(<MarketplaceListingsPage />);

    expect(screen.getByText('Loading services...')).toBeDefined();
    expect(screen.getByText('Service Marketplace')).toBeDefined();
  });

  it('renders empty state when no services', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: [],
        }),
    } as Response);

    render(<MarketplaceListingsPage />);

    // Wait for the async state update
    const emptyMsg = await screen.findByText('No services available yet.');
    expect(emptyMsg).toBeDefined();
  });

  it('renders provider count header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: [],
        }),
    } as Response);

    render(<MarketplaceListingsPage />);

    // header shows provider count
    const countText = await screen.findByText('0 providers');
    expect(countText).toBeDefined();
  });

  it('shows error state on fetch failure', async () => {
    let rejectFetch: (err: Error) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectFetch = reject;
      }) as Promise<Response>
    );

    render(<MarketplaceListingsPage />);

    // Reject the fetch
    setTimeout(() => {
      rejectFetch!(new Error('Network error'));
    }, 10);

    // Wait for the error state
    const errorMsg = await screen.findByText(
      'Failed to load services. Pull to refresh to try again.'
    );
    expect(errorMsg).toBeDefined();
  });
});

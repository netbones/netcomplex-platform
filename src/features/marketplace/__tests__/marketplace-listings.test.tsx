import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketplaceListingsPage } from '../ui/MarketplaceListingsPage';

const mockListListings = vi.hoisted(() => vi.fn());

vi.mock('@api/client', () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null })),
  },
  trpc: {
    marketplace: {
      listListings: {
        useQuery: mockListListings,
      },
    },
  },
}));

beforeEach(() => {
  mockListListings.mockReset();
});

describe('MarketplaceListingsPage', () => {
  it('renders loading state initially', () => {
    mockListListings.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isError: false,
    });

    render(<MarketplaceListingsPage />);

    expect(screen.getByText('Loading services...')).toBeDefined();
    expect(screen.getByText('Service Marketplace')).toBeDefined();
  });

  it('renders empty state when no services', async () => {
    mockListListings.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
      isError: false,
    });

    render(<MarketplaceListingsPage />);

    const emptyMsg = await screen.findByText('No services available yet.');
    expect(emptyMsg).toBeDefined();
  });

  it('renders provider count header', async () => {
    mockListListings.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
      isError: false,
    });

    render(<MarketplaceListingsPage />);

    // header shows provider count
    const countText = await screen.findByText('0 providers');
    expect(countText).toBeDefined();
  });

  it('shows error state on fetch failure', async () => {
    mockListListings.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isError: true,
    });

    render(<MarketplaceListingsPage />);

    const errorMsg = await screen.findByText(
      'Failed to load marketplace listings. Please try again.'
    );
    expect(errorMsg).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Hoisted mocks ─────────────────────────────────────────────────

vi.mock('i18next', () => ({
  default: {
    use: () => ({ use: () => ({ use: () => ({ init: () => Promise.resolve() }) }) }),
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : String(key)),
    language: 'en',
  },
}));

vi.mock('react-i18next', async importOriginal => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, fallback?: string) => fallback ?? key,
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('i18next-http-backend', () => ({ default: {} }));
vi.mock('i18next-browser-languagedetector', () => ({ default: {} }));

vi.mock('@api/client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'user-1', role: 'ADMIN' } },
    }),
  },
}));

vi.mock('@shared/lib/hooks/useSafeTranslation', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, fb?: string) => fb ?? k }),
}));

vi.mock('@shared/ui', () => ({
  LoadingSkeleton: () => <span data-testid="loading-skeleton">Loading...</span>,
}));

// ── Controllable mock state ───────────────────────────────────────

let mockCompletionPercent = 45;

vi.mock('@/features/setup', () => ({
  useSetupProgress: () => ({
    setup:
      mockCompletionPercent >= 100
        ? null
        : {
            id: 'setup-1',
            tenantId: 'tenant-1',
            completionPercent: mockCompletionPercent,
            completedSections: [] as string[],
            launchedAt: null,
            lastViewedAt: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            missions: {} as Record<string, unknown[]>,
          },
    isLoading: false,
    error: null as Error | null,
    refreshProgress: vi.fn(),
    updateMission: vi.fn(),
    updateSetting: vi.fn(),
    isUpdating: false,
  }),
  // Minimal inline mock of SetupProgressCard for integration testing
  SetupProgressCard: ({ tenantId }: { tenantId: string }) => {
    if (mockCompletionPercent >= 100) return null;
    return (
      <div data-testid="setup-progress-card" data-tenant={tenantId}>
        <span>Community Setup</span>
        <span>{mockCompletionPercent}%</span>
        <a href="/setup">Continue Setup</a>
      </div>
    );
  },
}));

vi.mock('@entities/tenant', () => ({
  useTenant: () => ({ id: 'tenant-1', name: 'Test', slug: 'test' }),
  useTenantLoading: () => false,
  useTenantStore: () => {},
  useTenantActions: () => ({}),
}));

// All fetch calls return empty arrays
global.fetch = vi.fn(
  () =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    }) as unknown as Response
);

// ── Import after mocks ────────────────────────────────────────────

import { HomeLayer } from '@/widgets/dashboard/ui/HomeLayer';

// ── Tests ───────────────────────────────────────────────────────────

describe('HomeLayer setup integration', () => {
  beforeEach(() => {
    mockCompletionPercent = 45;
    vi.clearAllMocks();
  });

  it('renders SetupProgressCard when setup is incomplete', async () => {
    mockCompletionPercent = 45;

    render(<HomeLayer />);

    // Wait for async fetch + render cycle
    const card = await screen.findByTestId('setup-progress-card', {}, { timeout: 3000 });
    expect(card).toBeDefined();
  });

  it('shows correct percentage and link to /setup', async () => {
    mockCompletionPercent = 72;

    render(<HomeLayer />);

    await screen.findByText('Continue Setup', {}, { timeout: 3000 });
    expect(screen.getByText('72%')).toBeDefined();
  });

  it('does not render SetupProgressCard when setup is complete', async () => {
    mockCompletionPercent = 100;

    render(<HomeLayer />);

    // Wait for the default dashboard content to appear (empty state)
    await screen.findByText('Nothing scheduled for today', {}, { timeout: 3000 });

    // Card should NOT be in the DOM
    expect(screen.queryByTestId('setup-progress-card')).toBeNull();
    expect(screen.queryByText('Continue Setup')).toBeNull();
  });

  it('passes tenantId to SetupProgressCard', async () => {
    mockCompletionPercent = 30;

    render(<HomeLayer />);

    const card = await screen.findByTestId('setup-progress-card', {}, { timeout: 3000 });
    expect(card.getAttribute('data-tenant')).toBe('tenant-1');
  });
});

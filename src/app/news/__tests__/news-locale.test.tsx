'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// ── Mock react-i18next with controllable language ──────────────────────────
let mockLanguage = 'en';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: mockLanguage },
  }),
}));

// ── Mock next/navigation ───────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-post-123' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// ── Mock shared UI components ──────────────────────────────────────────────
// ── Mock auth client (http-client imports ./auth-client directly) ─────────
vi.mock('@api/auth-client', () => ({
  authClient: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: { token: 'test-token' } } })),
  },
  getSession: vi.fn(() => Promise.resolve({ data: { session: { token: 'test-token' } } })),
}));

vi.mock('@shared/ui', () => ({
  Breadcrumbs: () => null,
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TagCloud: () => null,
  RichTextRenderer: () => null,
  usePageLoading: () => ({
    isReady: true,
    LoadingComponent: null,
  }),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('@widgets/dashboard', () => ({
  AnnouncementsStreamWidget: () => null,
}));

vi.mock('@features/content', () => ({
  ContentEngagementBar: () => null,
}));

// ── Mock fetch globally ───────────────────────────────────────────────────
let fetchUrlCalls: string[] = [];

beforeEach(() => {
  fetchUrlCalls = [];
  mockLanguage = 'en';
  // @ts-expect-error global fetch mock
  globalThis.fetch = vi.fn((url: string) => {
    fetchUrlCalls.push(url);
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: '1',
              title: 'Test Article',
              content: 'Test content',
              excerpt: 'Test excerpt',
              category: 'NEWS',
              tags: ['community'],
              published: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Desc 1–3: News listing page locale propagation ─────────────────────────

describe('news/page.tsx locale propagation', () => {
  it('fetch URL includes &locale=en when i18n.language is "en"', async () => {
    mockLanguage = 'en';

    // Dynamic import so mocks are hoisted correctly
    const { default: NewsPage } = await import('../page');

    render(<NewsPage />);

    await waitFor(() => {
      expect(fetchUrlCalls.length).toBeGreaterThan(0);
    });

    expect(fetchUrlCalls[0]).toContain('&locale=en');
  });

  it('fetch URL includes &locale=af when i18n.language is "af"', async () => {
    mockLanguage = 'af';

    const { default: NewsPage } = await import('../page');

    render(<NewsPage />);

    await waitFor(() => {
      expect(fetchUrlCalls.length).toBeGreaterThan(0);
    });

    expect(fetchUrlCalls[0]).toContain('&locale=af');
  });

  it('re-fetches content when i18n.language changes', async () => {
    // Start with 'en'
    mockLanguage = 'en';
    const { default: NewsPage } = await import('../page');

    const { unmount } = render(<NewsPage />);

    await waitFor(() => {
      expect(fetchUrlCalls.length).toBeGreaterThan(0);
    });

    const initialCallCount = fetchUrlCalls.length;

    // Change language and re-render
    unmount();
    mockLanguage = 'af';

    render(<NewsPage />);

    await waitFor(() => {
      expect(fetchUrlCalls.length).toBeGreaterThan(initialCallCount);
    });

    // The new call should contain locale=af
    expect(fetchUrlCalls[fetchUrlCalls.length - 1]).toContain('&locale=af');
  });
});

// ── Desc 4: News detail page locale propagation ────────────────────────────

describe('news/[id]/page.tsx locale propagation', () => {
  it('fetches with &locale= query param', async () => {
    mockLanguage = 'en';

    const { default: NewsPostPage } = await import('../[id]/page');

    render(<NewsPostPage />);

    await waitFor(() => {
      expect(fetchUrlCalls.length).toBeGreaterThan(0);
    });

    // The post content fetch (first call) should include locale
    const postFetchUrl = fetchUrlCalls[0];
    expect(postFetchUrl).toContain('&locale=en');
  });
});

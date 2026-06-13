import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), prefetch: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) =>
    React.createElement('a', props, children),
}));

describe('TurnstileWidget component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Turnstile widget container', async () => {
    const { TurnstileWidget } = await import('@shared/ui');

    const { container } = render(
      <TurnstileWidget siteKey="test-site-key" theme="auto" onTokenChange={vi.fn()} />
    );

    // The widget creates a div container for the Turnstile challenge
    // In test environment, the Cloudflare script won't load, but the container should exist
    expect(container.firstChild).toBeInTheDocument();
  }, 15000);
});

describe('LoadingSpinner component', () => {
  it('renders loading spinner', async () => {
    const { LoadingSpinner } = await import('@shared/ui');

    render(<LoadingSpinner />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with custom size', async () => {
    const { LoadingSpinner } = await import('@shared/ui');

    render(<LoadingSpinner size="lg" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with custom className', async () => {
    const { LoadingSpinner } = await import('@shared/ui');

    render(<LoadingSpinner className="custom-class" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
  });
});

describe('LoadingSkeleton component', () => {
  it('renders skeleton placeholder', async () => {
    const { LoadingSkeleton } = await import('@shared/ui');

    render(<LoadingSkeleton />);

    // Skeleton renders with role="status" and animate-pulse class
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('Breadcrumbs component', () => {
  it('renders breadcrumb items', async () => {
    const { Breadcrumbs } = await import('@shared/ui');

    render(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Directory', href: '/directory' },
        ]}
      />
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByText(/directory/i)).toBeInTheDocument();
  });

  it('renders links for items with href', async () => {
    const { Breadcrumbs } = await import('@shared/ui');

    render(<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]} />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders current page as text without link', async () => {
    const { Breadcrumbs } = await import('@shared/ui');

    render(<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Current Page' }]} />);

    expect(screen.getByText('Current Page')).toBeInTheDocument();
    // Current page should not be a link
    const currentText = screen.getByText('Current Page');
    expect(currentText.closest('a')).toBeNull();
  });
});

describe('ErrorBoundary component', () => {
  it('renders children when no error occurs', async () => {
    const { ErrorBoundary } = await import('@shared/ui');

    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders custom fallback UI when child throws error', async () => {
    const { ErrorBoundary } = await import('@shared/ui');

    const ThrowError = () => {
      throw new Error('Test error');
    };

    // Suppress console.error for test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div data-testid="error-fallback">Custom error message</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});

describe('Tooltip component', () => {
  it('renders tooltip trigger', async () => {
    const { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } = await import('@shared/ui');

    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    expect(screen.getByRole('button', { name: /hover me/i })).toBeInTheDocument();
  });
});

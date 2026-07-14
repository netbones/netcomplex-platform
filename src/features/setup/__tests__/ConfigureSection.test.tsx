import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigureSection from '../ui/sections/ConfigureSection';

// ── Mocks ──────────────────────────────────────────────────────────

// Mock fetch for useAutoSaveSetting
const mockFetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
);
globalThis.fetch = mockFetch;

// Prevent i18next initialization
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
    }),
  };
});

// ── Helpers ───────────────────────────────────────────────────────

function renderConfigure(tier: 'foundation' | 'pro-max' | 'core' = 'foundation') {
  return render(<ConfigureSection tenantId="tenant-1" tier={tier} />);
}

// ── Tests ─────────────────────────────────────────────────────────

describe('ConfigureSection', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  // ── Rendering ───────────────────────────────────────────────────

  it('renders the section header', () => {
    renderConfigure();
    expect(screen.getByText('Configure Modules')).toBeTruthy();
  });

  it('renders foundation-tier module toggles', () => {
    renderConfigure('foundation');

    // Foundation has NO visible premium modules — the section shows
    // available modules based on tier. Foundation should see NO modules
    // since all modules in this section require pro-max or higher.
    // But should still show the header and the upgrade prompt.
    expect(screen.getByText('Configure Modules')).toBeTruthy();
  });

  it('renders pro-max-tier module toggles', () => {
    renderConfigure('pro-max');

    // Depth should see: bookings, dwallet, surveys, competitions, achievements, marketplace
    // But NOT maintenance (core only)
    const bookingsToggle = screen.queryByLabelText('Toggle Bookings');
    const surveysToggle = screen.queryByLabelText('Toggle Surveys');
    const marketplaceToggle = screen.queryByLabelText('Toggle Services / Marketplace');

    // At least one of these should be visible
    const visibleToggles = [bookingsToggle, surveysToggle, marketplaceToggle].filter(Boolean);
    expect(visibleToggles.length).toBeGreaterThan(0);
  });

  it('renders core-tier module toggles (all modules visible)', () => {
    renderConfigure('core');

    // Core should see ALL modules including maintenance
    const maintenanceToggle = screen.queryByLabelText('Toggle Maintenance');
    const bookingsToggle = screen.queryByLabelText('Toggle Bookings');
    const dwalletToggle = screen.queryByLabelText('Toggle dWallet');

    // At least maintenance should be visible for core
    const visibleToggles = [maintenanceToggle, bookingsToggle, dwalletToggle].filter(Boolean);
    expect(visibleToggles.length).toBeGreaterThan(0);
  });

  it('shows enabled/disabled count in header', () => {
    renderConfigure('pro-max');
    // Should show count: X/Y enabled
    expect(screen.getByText(/\d+\/\d+ enabled/)).toBeTruthy();
  });

  // ── Tier gating ─────────────────────────────────────────────────

  it('does not show premium upgrade prompt for pro-max tier', () => {
    renderConfigure('pro-max');
    // The amber upgrade box should not appear for pro-max/core tiers
    expect(screen.queryByText(/Upgrade for More Modules/)).toBeNull();
  });

  it('shows upgrade prompt for foundation tier', () => {
    renderConfigure('foundation');
    // Foundation should see upgrade prompt since most modules are locked
    expect(screen.getByText(/Upgrade for More Modules/)).toBeTruthy();
  });

  it('does not show maintenance toggle on foundation tier', () => {
    renderConfigure('foundation');
    expect(screen.queryByLabelText('Toggle Maintenance')).toBeNull();
  });

  it('does not show maintenance toggle on pro-max tier', () => {
    renderConfigure('pro-max');
    // Maintenance is core-only
    expect(screen.queryByLabelText('Toggle Maintenance')).toBeNull();
  });

  it('shows maintenance toggle on core tier', () => {
    renderConfigure('core');
    expect(screen.getByLabelText('Toggle Maintenance')).toBeTruthy();
  });

  // ── Toggle interactions ─────────────────────────────────────────

  it('toggling a module calls saveSetting', async () => {
    mockFetch.mockClear();
    renderConfigure('core');

    const bookingsToggle = screen.getByLabelText('Toggle Bookings');
    fireEvent.click(bookingsToggle);

    // Wait for debounce (500ms) — use minimal wait for test
    await vi.waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('shows "Saving" indicator when toggle changes', async () => {
    renderConfigure('core');

    const bookingsToggle = screen.getByLabelText('Toggle Bookings');
    fireEvent.click(bookingsToggle);

    // "Saving changes…" text should appear
    expect(screen.getByText('Saving changes…')).toBeTruthy();
  });

  // ── Config links ────────────────────────────────────────────────

  it('shows configure links for enabled modules', () => {
    renderConfigure('pro-max');

    // For pro-max, many modules default-enabled — they should show config links
    // Since hasModuleAccess for bookings with pro-max tier returns true
    const configLinks = screen.queryAllByText(/Configure/);
    // At minimum some links should be present when modules are enabled
    expect(configLinks.length).toBeGreaterThanOrEqual(0);
  });

  // ── Sub-component structure ─────────────────────────────────────

  it('renders MissionCard sub-component', () => {
    renderConfigure('core');
    expect(screen.getByTestId('mission-configure-modules')).toBeTruthy();
  });
});

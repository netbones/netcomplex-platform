import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GrowSection from '../ui/sections/GrowSection';
import type { TenantSetup, SetupMission } from '@/entities/setup';

// ── Helpers ───────────────────────────────────────────────────────

function makeSetup(overrides: Partial<TenantSetup> = {}): TenantSetup {
  return {
    id: 'setup-1',
    tenantId: 'tenant-1',
    completionPercent: 0,
    completedSections: [],
    launchedAt: null,
    lastViewedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeMission(missionKey: string, isCompleted: boolean, section = 'launch'): SetupMission {
  return {
    id: `mission-${missionKey}`,
    tenantSetupId: 'setup-1',
    section: section as SetupMission['section'],
    missionKey,
    title: `Mission ${missionKey}`,
    description: null,
    isRequired: true,
    isCompleted,
    completedAt: isCompleted ? '2026-01-01T00:00:00Z' : null,
    sortOrder: 0,
    metadata: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('GrowSection', () => {
  // ── Empty state ─────────────────────────────────────────────────

  it('renders empty state when fully set up (100% completion)', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 100 })}
        missions={{
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        }}
        settings={{ 'populate.stats': { count: 10 } }}
      />
    );

    expect(screen.getByText(/fully set up/)).toBeTruthy();
    expect(screen.getByText('Grow Your Community')).toBeTruthy();
  });

  it('shows no recommendations when everything is done', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="core"
        setup={makeSetup({ completionPercent: 100 })}
        missions={{
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        }}
        settings={{ 'populate.stats': { count: 10 } }}
      />
    );

    // No recommendation cards rendered
    expect(screen.queryByTestId(/recommendation-/)).toBeNull();
  });

  // ── Recommendations rendering ───────────────────────────────────

  it('renders recommendation cards for incomplete launch', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
      />
    );

    // Should have launch recommendations
    const cards = screen.queryAllByTestId(/recommendation-/);
    expect(cards.length).toBeGreaterThan(0);

    // Should include "Name your community" — the first launch mission
    expect(screen.getByText('Name your community')).toBeTruthy();
  });

  it('renders recommendation count in header', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
      />
    );

    // Count should appear
    expect(screen.getByText(/\d+ recommendation/)).toBeTruthy();
  });

  it('renders priority badges (High Priority, Recommended, Optional)', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
      />
    );

    // The first recommendation (launch.identity) has priority 0 — "High Priority"
    // Multiple cards may have the same priority badge, so use getAllByText
    const highPriorityBadges = screen.getAllByText('High Priority');
    expect(highPriorityBadges.length).toBeGreaterThan(0);
  });

  // ── Action buttons ─────────────────────────────────────────────

  it('shows Complete, Skip, and Learn More buttons on each card', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
      />
    );

    // Each recommendation card has 3 buttons
    const completeBtns = screen.getAllByText('Complete');
    const skipBtns = screen.getAllByText('Skip');
    const learnMoreBtns = screen.getAllByText('Learn More');

    expect(completeBtns.length).toBeGreaterThan(0);
    expect(skipBtns.length).toBeGreaterThan(0);
    expect(learnMoreBtns.length).toBeGreaterThan(0);
    expect(completeBtns.length).toBe(skipBtns.length);
    expect(skipBtns.length).toBe(learnMoreBtns.length);
  });

  it('calls onComplete when Complete button is clicked', () => {
    const onComplete = vi.fn();
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
        onComplete={onComplete}
      />
    );

    const completeBtn = screen.getAllByText('Complete')[0];
    fireEvent.click(completeBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('launch.identity');
  });

  it('calls onSkip when Skip button is clicked', () => {
    const onSkip = vi.fn();
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
        onSkip={onSkip}
      />
    );

    const skipBtn = screen.getAllByText('Skip')[0];
    fireEvent.click(skipBtn);

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledWith('launch.identity');
  });

  it('hides skipped recommendations', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
      />
    );

    // Count recommendations before skip
    const initialCards = screen.queryAllByTestId(/recommendation-/).length;

    // Skip the first recommendation
    const skipBtn = screen.getAllByText('Skip')[0];
    fireEvent.click(skipBtn);

    // Count after skip — should be one less
    const remainingCards = screen.queryAllByTestId(/recommendation-/).length;
    expect(remainingCards).toBe(initialCards - 1);
  });

  it('shows benefits panel when Learn More is clicked', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
      />
    );

    // Before clicking Learn More, benefits should not be visible
    expect(screen.queryByText('Benefits')).toBeNull();

    // Click Learn More on the first card
    const learnMoreBtn = screen.getAllByText('Learn More')[0];
    fireEvent.click(learnMoreBtn);

    // Benefits panel should now be visible
    expect(screen.getByText('Benefits')).toBeTruthy();
  });

  it('toggles benefits panel off when Learn More clicked again', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 0 })}
        missions={{}}
        settings={{}}
      />
    );

    const learnMoreBtn = screen.getAllByText('Learn More')[0];

    // First click — show
    fireEvent.click(learnMoreBtn);
    expect(screen.getByText('Benefits')).toBeTruthy();

    // Second click — hide
    fireEvent.click(learnMoreBtn);
    expect(screen.queryByText('Benefits')).toBeNull();
  });

  // ── Population recommendation ───────────────────────────────────

  it('shows invite recommendation when population is low', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 80 })}
        missions={{
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        }}
        settings={{ 'populate.stats': { count: 2 } }}
      />
    );

    expect(screen.getByText(/Invite more residents/)).toBeTruthy();
  });

  // ── Tier gating in component ────────────────────────────────────

  it('does not show core-tier recommendations for foundation tenants', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="foundation"
        setup={makeSetup({ completionPercent: 80 })}
        missions={{
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        }}
        settings={{
          'configure.modules.maintenance.enabled': true,
          'populate.stats': { count: 10 },
        }}
      />
    );

    // Maintenance is core-tier, should not appear for foundation
    expect(screen.queryByText('Configure maintenance')).toBeNull();
  });

  it('shows module config recommendations for depth tier', () => {
    render(
      <GrowSection
        tenantId="tenant-1"
        tier="depth"
        setup={makeSetup({ completionPercent: 80 })}
        missions={{
          'launch.identity': makeMission('launch.identity', true),
          'launch.branding': makeMission('launch.branding', true),
          'launch.domain': makeMission('launch.domain', true),
          'launch.timezone': makeMission('launch.timezone', true),
          'launch.address': makeMission('launch.address', true),
        }}
        settings={{
          'configure.modules.bookings.enabled': true,
          'populate.stats': { count: 10 },
        }}
      />
    );

    expect(screen.getByText('Set up bookings')).toBeTruthy();
  });
});

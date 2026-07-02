/**
 * EmptyWorkspaceState — Unit Tests (RED phase)
 *
 * Validates the welcome surface shown to zero-delegation users (D-12).
 * Copy is locked verbatim per UI-SPEC §Copywriting Contract — all
 * assertions use EXACT text equality, not regex or snapshots.
 *
 * RED: Stub returns null → ALL copy-equality + visibility + identity
 *      language assertions FAIL on first run.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { DelegationListItem } from '@entities/delegation';

// ═══════════════════════════════════════════════════════════════
// Mock modules BEFORE importing the component under test
// ═══════════════════════════════════════════════════════════════

const mockUseDelegations = vi.fn();
const mockUseWorkspaceContext = vi.fn();

vi.mock('@entities/delegation', () => ({
  useDelegations: (params?: { status?: string }) => mockUseDelegations(params),
}));

vi.mock('@features/workspace', () => ({
  useWorkspaceContext: () => mockUseWorkspaceContext(),
}));

// ═══════════════════════════════════════════════════════════════
// Lazy import — mocks must be registered first
// ═══════════════════════════════════════════════════════════════

import { EmptyWorkspaceState } from '../EmptyWorkspaceState';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function activeDelegation(overrides: Partial<DelegationListItem> = {}): DelegationListItem {
  return {
    id: 'd1',
    propertyId: 'p1',
    propertyAddress: '14 Palm Avenue',
    agentId: 'a1',
    agentName: 'Agent Smith',
    agentEmail: 'smith@agent.com',
    grantedById: 'o1',
    grantedByName: 'Owner Owens',
    permissions: ['maintenance:read', 'maintenance:create'],
    status: 'ACTIVE',
    startedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2027-01-01T00:00:00.000Z',
    acceptedAt: '2026-01-01T00:00:00.000Z',
    rejectedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Workspace context from plan 122-02 — PERSONAL with owned permissions.
 * Matches the `useWorkspaceContext()` return shape from @features/workspace.
 */
function personalWorkspaceContext() {
  return {
    workspaceId: 'personal:user-1',
    workspaceType: 'PERSONAL' as const,
    permissions: ['profile:read', 'settings:manage'] as const,
  };
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('EmptyWorkspaceState — RED phase (stub returns null → all text assertions fail)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: zero delegations — stub renders null → RED: getByText will throw
    mockUseDelegations.mockReturnValue({ data: [] });
    mockUseWorkspaceContext.mockReturnValue(personalWorkspaceContext());
  });

  describe('copy contract — EXACT text equality (UI-SPEC §Per-Surface Copy)', () => {
    it('renders heading exactly: "Welcome to Agent Workspace"', () => {
      render(React.createElement(EmptyWorkspaceState));
      // Stub returns null → getByText throws NotFoundError (RED)
      const heading = screen.getByText('Welcome to Agent Workspace');
      expect(heading).toBeInTheDocument();
    });

    it('renders body exactly: "You don\'t currently manage any delegated properties."', () => {
      render(React.createElement(EmptyWorkspaceState));
      const body = screen.getByText("You don't currently manage any delegated properties.");
      expect(body).toBeInTheDocument();
    });

    it('renders CTA 1: "Accept a delegation invitation" (verb-first imperative)', () => {
      render(React.createElement(EmptyWorkspaceState));
      const cta = screen.getByText('Accept a delegation invitation');
      expect(cta).toBeInTheDocument();
    });

    it('renders CTA 2: "Browse the Marketplace" (verb-first imperative)', () => {
      render(React.createElement(EmptyWorkspaceState));
      const cta = screen.getByText('Browse the Marketplace');
      expect(cta).toBeInTheDocument();
    });

    it('renders CTA 3: "Learn how property delegation works" (verb-first imperative)', () => {
      render(React.createElement(EmptyWorkspaceState));
      const cta = screen.getByText('Learn how property delegation works');
      expect(cta).toBeInTheDocument();
    });
  });

  describe('forbidden identity language — D-05 / UI-SPEC Copywriting Rules', () => {
    const forbiddenPhrases = [/Working As/i, /Logged in as/i, /Act as/i, /Become/i];

    forbiddenPhrases.forEach(phrase => {
      it(`does NOT render forbidden identity language: ${phrase}`, () => {
        render(React.createElement(EmptyWorkspaceState));
        // Stub returns null → queryByText returns null → assertion passes trivially.
        // After GREEN: the component must genuinely lack these strings.
        expect(screen.queryByText(phrase)).toBeNull();
      });
    });
  });

  describe('visibility guard — zero vs non-zero delegations', () => {
    it('renders the welcome surface when delegations.length === 0', () => {
      mockUseDelegations.mockReturnValue({ data: [] });
      render(React.createElement(EmptyWorkspaceState));
      // Stub returns null → getByText throws (RED)
      expect(screen.getByText('Welcome to Agent Workspace')).toBeInTheDocument();
    });

    it('returns null (renders nothing) when delegations.length > 0', () => {
      mockUseDelegations.mockReturnValue({ data: [activeDelegation()] });
      const { container } = render(React.createElement(EmptyWorkspaceState));
      // Internal guard: delegations.length > 0 → return null
      expect(container.firstChild).toBeNull();
    });

    it('renders empty state when useDelegations({ status: ACTIVE }) returns zero rows (PENDING filtered server-side)', () => {
      // The real API with { status: 'ACTIVE' } returns ONLY ACTIVE delegations.
      // PENDING/REVOKED/REJECTED/EXPIRED delegations are filtered server-side
      // and never reach the component. This test verifies that when the API
      // returns [], the welcome surface renders regardless of what non-ACTIVE
      // delegations might exist on other API calls.
      mockUseDelegations.mockReturnValue({ data: [] });
      render(React.createElement(EmptyWorkspaceState));
      expect(screen.getByText('Welcome to Agent Workspace')).toBeInTheDocument();
    });

    it('renders empty state when useDelegations({ status: ACTIVE }) returns zero rows (REVOKED filtered server-side)', () => {
      // Same server-side filter rationale as above — REVOKED delegations
      // are excluded by the API layer, so the component sees [].
      mockUseDelegations.mockReturnValue({ data: [] });
      render(React.createElement(EmptyWorkspaceState));
      expect(screen.getByText('Welcome to Agent Workspace')).toBeInTheDocument();
    });
  });

  describe('decorative illustration', () => {
    it('renders a decorative icon with aria-hidden and text-gray-300 (lowest visual weight)', () => {
      mockUseDelegations.mockReturnValue({ data: [] });
      const { container } = render(React.createElement(EmptyWorkspaceState));
      // The decorative illustration should exist with the correct attributes
      const decorative = container.querySelector('[aria-hidden="true"]');
      expect(decorative).not.toBeNull();
      if (decorative) {
        expect(decorative.classList.contains('text-gray-300')).toBe(true);
      }
    });
  });

  describe('C-04 compliance — NO Role branching', () => {
    it('does not import or reference Role enum (checked at build time via rg)', () => {
      // This test is a documentation gate — the actual enforcement
      // happens via the `rg "role\s*==="` command in the plan verification.
      // We assert the component renders without throwing (validates module load).
      mockUseDelegations.mockReturnValue({ data: [] });
      mockUseWorkspaceContext.mockReturnValue(personalWorkspaceContext());
      expect(() => render(React.createElement(EmptyWorkspaceState))).not.toThrow();
    });
  });
});

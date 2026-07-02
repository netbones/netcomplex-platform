/**
 * EmptyWorkspaceState — Welcome surface for zero-delegation users (D-12, WS-05)
 *
 * Replaces the plan 122-03 stub. Renders the compassionate empty state
 * that keeps the user oriented instead of dumping them into an inactive
 * workspace shell.
 *
 * Visibility:
 *   - Shows when the user has zero ACTIVE delegations.
 *   - PENDING, REVOKED, REJECTED, EXPIRED delegations do NOT suppress
 *     the empty state — only real, active delegations make it non-empty.
 *
 * Copy: locked verbatim per UI-SPEC §Copywriting Contract — any drift
 * is caught by the equality tests in EmptyWorkspaceState.test.tsx.
 *
 * C-04: NO Role branching — consumes useWorkspaceContext() and
 * useDelegations() only. The component does NOT import or check Role.
 */
'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { useDelegations } from '@entities/delegation';
import { useWorkspaceContext } from '@features/workspace';

/**
 * Resolve a lucide-react icon class string for the primary CTA accent colour.
 * Uses the soralia-primary palette (#4F46E5) per UI-SPEC §Color Accent.
 */
function CTAIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-2 inline-flex items-center text-[#4F46E5]" aria-hidden="true">
      {children}
    </span>
  );
}

/**
 * EmptyWorkspaceState — the welcome surface for zero-delegation users.
 *
 * Derived from D-12 wireframe + UI-SPEC §Surface 2:
 *   Priority 1: Heading (24px/700 — "Welcome to Agent Workspace")
 *   Priority 2: 3 verb-first CTAs stacked
 *   Priority 3: Decorative Building2 icon (text-gray-300, 48px)
 */
export function EmptyWorkspaceState(): JSX.Element | null {
  const _ctx = useWorkspaceContext();
  const { data: delegations } = useDelegations({ status: 'ACTIVE' });

  // Zero-delegation gate: only ACTIVE delegations count.
  // PENDING/REVOKED/REJECTED/EXPIRED → user still sees the welcome surface.
  if (delegations && delegations.length > 0) {
    return null;
  }

  // useWorkspaceContext is consumed but not branched on — C-04 compliance.
  void _ctx;

  return (
    <div className="bg-white rounded-lg py-16 px-8 text-center" data-testid="empty-workspace-state">
      {/* Priority 3: Decorative illustration — lowest visual weight */}
      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-6" aria-hidden="true" />

      {/* Priority 1: Heading — 24px / 700 (text-2xl font-bold) */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Agent Workspace</h2>

      {/* Body — text-sm / 400 */}
      <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
        You don&apos;t currently manage any delegated properties.
      </p>

      {/* Priority 2: 3 verb-first CTAs, stacked */}
      <nav aria-label="Next steps" className="flex flex-col items-center gap-3">
        {/*
          CTA 1 — Primary (accent #4F46E5).
          Route: /delegations/invitations is a documented placeholder;
          the actual accept-invitation flow is a follow-up P2 concern (D-03).
          TODO(122-05): wire to the real delegation-invitations page when built.
        */}
        <Link
          href="/delegations/invitations"
          className="inline-flex items-center px-6 py-3 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#4338CA] transition-colors"
        >
          <CTAIcon>
            {/* Inbox icon represents "accepting an invitation" */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
          </CTAIcon>
          Accept a delegation invitation
        </Link>

        {/*
          CTA 2 — Marketplace.
          Route: /marketplace is a documented placeholder;
          no frontend page exists yet (API: /api/marketplace/).
          TODO(122-05): wire to the real marketplace page when built.
        */}
        <Link
          href="/marketplace"
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CTAIcon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 1.5-3h15L21 9" />
              <path d="M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
              <path d="M15 21V9" />
            </svg>
          </CTAIcon>
          Browse the Marketplace
        </Link>

        {/*
          CTA 3 — Learn about delegation.
          Route: /delegation-learn is a documented placeholder.
          TODO(122-05): wire to the real delegation help page when built
          (or point to external docs if a help centre exists).
        */}
        <Link
          href="/delegation-learn"
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CTAIcon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </CTAIcon>
          Learn how property delegation works
        </Link>
      </nav>
    </div>
  );
}

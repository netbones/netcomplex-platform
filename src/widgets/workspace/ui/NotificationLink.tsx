/**
 * NotificationLink — Workspace-Aware Deep Link Handler (D-07)
 *
 * 'use client' — wraps notification links with automatic workspace switching.
 * On click: infers a WorkspaceTarget from the link, calls switchWorkspace,
 * navigates to the resource, and toasts the context change.
 *
 * Threat T-122-08: clicking a malicious link to an unauthorized property
 * will throw registry_miss at resolveWorkspaceContext → switchWorkspace
 * rolls back (P-03), error toast fires, NO navigation.
 */

'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useSwitchWorkspace } from '@features/workspace';
import { inferWorkspaceTarget } from '@features/workspace';

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

export interface NotificationLinkProps {
  /** The notification link URL (e.g. `/properties/14-palm-ave/maintenance/123`). */
  href: string;
  /** Optional notification ID for tracking. */
  notificationId?: string;
  /** The link content (typically "View details"). */
  children: React.ReactNode;
  /** Optional CSS class — passed through to the Link component. */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

/**
 * NotificationLink wraps a notification link with automatic workspace switching.
 *
 * D-07: clicking a notification about Palm Avenue switches WorkspaceContext,
 * navigates to the resource, and toasts the context change.
 *
 * If the target cannot be inferred (e.g. an unrecognized link), falls through
 * to a plain `<Link>` navigation without workspace switching.
 *
 * If the workspace switch fails (revoked delegation, etc.), the error toast
 * is already shown by switchWorkspace — we return without navigating.
 */
export function NotificationLink({
  href,
  notificationId,
  children,
  className,
}: NotificationLinkProps) {
  const switchWorkspace = useSwitchWorkspace();

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      const target = inferWorkspaceTarget(href);
      if (target) {
        e.preventDefault();
        try {
          await switchWorkspace(target, { href });
        } catch {
          // Error toast already shown by switchWorkspace (Step 1 catch branch).
          // Do NOT navigate — the delegation was revoked/expired/missing (T-122-08).
          return;
        }
      }
      // Fall through: target is null (unknown link type) → default <Link> navigation,
      // OR switch succeeded → switchWorkspace already called router.push.
    },
    [href, switchWorkspace]
  );

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}

/**
 * AssistSession scope guard — enforces metadata-scoped access restrictions.
 *
 * When a staff member operates under an active assist session with scope='metadata',
 * they may only read data, not modify content, users, or settings.
 * Sessions with scope='full' have no restrictions.
 * Regular users (no active assist session) are unrestricted — this guard only
 * applies to staff operating within an assist session context.
 *
 * Usage in API routes:
 *   const scopeError = await requireAssistScope(request, 'full');
 *   if (scopeError) return scopeError; // 403 response
 */

import { NextResponse } from 'next/server';
import { auth, db, assistSessions } from '@api/server';

import { eq, and, gt } from 'drizzle-orm';

export type AssistScope = 'full' | 'metadata';

/**
 * Check whether the requesting user is operating under a metadata-scoped
 * assist session that would block the requested operation.
 *
 * @param request - Incoming HTTP request (used to extract auth session)
 * @param requiredScope - 'full' if the operation modifies data, 'metadata' if read-only
 * @returns A 403 NextResponse if blocked, or null if the operation is allowed
 */
export async function requireAssistScope(
  request: Request,
  requiredScope: AssistScope
): Promise<NextResponse | null> {
  // 1. Get session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    // Not authenticated — let the route's own auth guard handle this
    return null;
  }

  // 2. Check if user has any active assist sessions
  const now = new Date();
  const activeSessions = await db
    .select({ scope: assistSessions.scope })
    .from(assistSessions)
    .where(
      and(
        eq(assistSessions.staffId, session.user.id),
        eq(assistSessions.isActive, true),
        gt(assistSessions.expiresAt, now)
      )
    );

  // 3. No active assist session → regular user, unrestricted
  if (activeSessions.length === 0) {
    return null;
  }

  // 4. If any session has scope='full', allow everything
  const hasFullScope = activeSessions.some(s => s.scope === 'full');
  if (hasFullScope) {
    return null;
  }

  // 5. All sessions are 'metadata' scope — block if 'full' access is required
  if (requiredScope === 'full') {
    return NextResponse.json(
      {
        error:
          'AssistSession scope restriction: metadata-scoped staff cannot modify content, users, or settings',
      },
      { status: 403 }
    );
  }

  // 6. metadata scope + metadata required → allow read
  return null;
}

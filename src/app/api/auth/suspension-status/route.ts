import { requireNotSuspended } from '@api/auth-utils';
import { NextResponse } from 'next/server';

export const maxDuration = 8;

/**
 * GET /api/auth/suspension-status - Check the current user's suspension state.
 * Used by the frontend dashboard to check suspension state on mount.
 * Returns whether the user is suspended and details of the suspension if active.
 */
export async function GET(request: Request) {
  const status = await requireNotSuspended(request);
  return NextResponse.json(status);
}

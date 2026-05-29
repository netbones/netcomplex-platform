// This route exists to establish the /api/v1/tenant/ namespace.
// The implementation lives at the flat /api/{resource} path for now.
// During the tRPC migration (Phase B), these routes will become tRPC procedures instead.
//
// The [listingId]-scoped handlers cannot be re-exported here because this
// path has no [listingId] dynamic segment. A v1 reviews list endpoint
// should be implemented when the v1 migration is scoped.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { success: true, data: [], meta: { total: 0, limit: 10, offset: 0, hasMore: false } },
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Use /api/community-services/reviews/[listingId]',
      },
    },
    { status: 501 }
  );
}

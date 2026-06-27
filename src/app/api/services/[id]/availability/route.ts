import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, _context: { params: Promise<{ id: string }> }) {
  return Response.json(
    { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'TODO' } },
    { status: 501 }
  );
}

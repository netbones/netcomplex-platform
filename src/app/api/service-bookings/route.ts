import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest) {
  return Response.json(
    { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'TODO' } },
    { status: 501 }
  );
}

export async function POST(_request: NextRequest) {
  return Response.json(
    { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'TODO' } },
    { status: 501 }
  );
}

export async function PATCH(_request: NextRequest) {
  return Response.json(
    { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'TODO' } },
    { status: 501 }
  );
}

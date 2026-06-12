import { apiSuccess } from '@api/server';

export async function GET() {
  return apiSuccess({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'nodejs',
    version: '1.0.0',
  });
}

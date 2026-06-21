import { apiSuccess, now } from '@api/server';

export async function GET() {
  return apiSuccess({
    status: 'ok',
    timestamp: now().toISOString(),
    runtime: 'nodejs',
    version: '1.0.0',
  });
}

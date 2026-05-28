import { apiSuccess } from '@api/api-response';

export async function GET() {
  return apiSuccess({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'nodejs',
    version: '1.0.0',
  });
}

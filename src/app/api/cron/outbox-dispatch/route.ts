import { apiSuccess, apiError, dispatchOutbox } from '@api/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected || !process.env.CRON_SECRET) {
    return apiError('UNAUTHORIZED', 'Invalid cron secret', 401);
  }

  try {
    const result = await dispatchOutbox(100);
    return apiSuccess(result);
  } catch {
    return apiError('INTERNAL_ERROR', 'Outbox dispatch failed', 500);
  }
}

import {
  auth,
  uploadImage,
  apiError,
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  rateLimitByIP,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function POST(request: Request) {
  // Rate limit: 10 uploads per minute per IP
  const rateLimit = await rateLimitByIP(request, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;

  const { tenantId } = await withTenant(); // Enforce tenant context
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No file provided', 400);
    }

    const result = await uploadImage(file, session.user.id, tenantId);

    if (result.error) {
      return apiError('VALIDATION_ERROR', String(result.error), 400);
    }

    return apiSuccess({ url: result.url, key: result.key });
  } catch (error) {
    logError({ component: 'upload-api', operation: 'POST' }, 'Upload error', error);
    return apiInternalError('Failed to upload file');
  }
}

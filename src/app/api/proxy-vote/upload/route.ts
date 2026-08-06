import {
  auth,
  apiError,
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  rateLimitByIP,
  uploadDocument,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function POST(request: Request) {
  const rateLimit = await rateLimitByIP(request, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;

  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const submittedTenantId = formData.get('tenantId') as string | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No file provided', 400);
    }

    // Verify submitted tenantId matches the resolved tenant context — fail closed
    // if the client claims a different tenant than the one in their request context.
    if (submittedTenantId && submittedTenantId !== tenantId) {
      return apiError('FORBIDDEN', 'Tenant mismatch', 403);
    }

    const result = await uploadDocument(file, tenantId, 'proxy-forms');

    if (result.error) {
      return apiError('VALIDATION_ERROR', String(result.error), 400);
    }

    return apiSuccess({ url: result.url, key: result.key });
  } catch (error) {
    logError({ component: 'proxy-upload-api', operation: 'POST' }, 'Upload error', error);
    return apiInternalError('Failed to upload document');
  }
}

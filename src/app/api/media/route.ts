import { auth } from '@api/auth';
import { listUserImages, deleteImage } from '@api/storage';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { logError } from '@shared/lib';

import { apiError, apiSuccess, apiUnauthorized, apiInternalError } from '@api/api-response';
export async function GET(request: Request) {
  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  try {
    const images = await listUserImages(session.user.id);
    return apiSuccess({ images });
  } catch (error) {
    logError({ component: 'media-api', operation: 'LIST' }, 'List images error', error);
    return apiInternalError('Failed to list images');
  }
}

export async function DELETE(request: Request) {
  await withTenant(); // Enforce tenant context
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return apiError('VALIDATION_ERROR', 'No key provided', 400);
    }

    const result = await deleteImage(key, session.user.id);

    if (result.error) {
      return apiError('VALIDATION_ERROR', String(result.error), 400);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    logError({ component: 'media-api', operation: 'DELETE' }, 'Delete image error', error);
    return apiInternalError('Failed to delete image');
  }
}

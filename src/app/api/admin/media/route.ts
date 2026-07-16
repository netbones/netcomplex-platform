import { NextRequest } from 'next/server';
import {
  uploadTenantImage,
  listTenantImages,
  deleteTenantImage,
  getSessionAndRole,
  apiError,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
  rateLimitByUser,
  guardSuspension,
} from '@api/server';
import { hasPermission } from '@shared/lib';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function GET() {
  try {
    const authData = await getSessionAndRole();
    if (!authData) return apiUnauthorized();
    const guard = guardSuspension(authData);
    if (guard) return guard;
    if (!hasPermission(authData.role, 'admin')) return apiForbidden();

    const { tenantId } = await withTenant();
    const images = await listTenantImages(tenantId);
    return apiSuccess({ images });
  } catch (error) {
    logError({ component: 'admin-media', operation: 'LIST' }, 'List tenant images error', error);
    return apiInternalError('Failed to list images');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authData = await getSessionAndRole(request);
    if (!authData) return apiUnauthorized();
    if (!hasPermission(authData.role, 'admin')) return apiForbidden();

    const rateLimit = await rateLimitByUser(authData.userId, { windowMs: 60_000, maxRequests: 10 });
    if (rateLimit) return rateLimit;

    const { tenantId } = await withTenant();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No file provided', 400);
    }

    const result = await uploadTenantImage(file, tenantId);

    if (result.error) {
      return apiError('VALIDATION_ERROR', String(result.error), 400);
    }

    return apiSuccess({ url: result.url, key: result.key });
  } catch (error) {
    logError({ component: 'admin-media', operation: 'UPLOAD' }, 'Upload error', error);
    return apiInternalError('Failed to upload file');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authData = await getSessionAndRole(request);
    if (!authData) return apiUnauthorized();
    if (!hasPermission(authData.role, 'admin')) return apiForbidden();

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return apiError('VALIDATION_ERROR', 'No key provided', 400);
    }

    const { tenantId } = await withTenant();
    const result = await deleteTenantImage(key, tenantId);

    if (result.error) {
      return apiError('VALIDATION_ERROR', String(result.error), 400);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    logError({ component: 'admin-media', operation: 'DELETE' }, 'Delete error', error);
    return apiInternalError('Failed to delete image');
  }
}

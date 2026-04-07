import { auth } from '@/lib/auth';
import { listUserImages, deleteImage } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant/with-tenant';
import { logError } from '@/lib/logging';

export async function GET(request: Request) {
  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const images = await listUserImages(session.user.id);
    return NextResponse.json({ images });
  } catch (error) {
    logError({ component: 'media-api', operation: 'LIST' }, 'List images error', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await withTenant(); // Enforce tenant context
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }

    const result = await deleteImage(key, session.user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ component: 'media-api', operation: 'DELETE' }, 'Delete image error', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

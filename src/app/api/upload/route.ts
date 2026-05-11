import { auth } from '@api/auth';
import { uploadImage } from '@api/storage';
import { NextResponse } from 'next/server';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { logError } from '@shared/lib';

export async function POST(request: Request) {
  await withTenant(); // Enforce tenant context
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await uploadImage(file, session.user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url, key: result.key });
  } catch (error) {
    logError({ component: 'upload-api', operation: 'POST' }, 'Upload error', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

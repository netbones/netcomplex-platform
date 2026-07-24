import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { createId } from '@shared/lib/id';
import { logError } from '@shared/lib';
import { db, mediaUploads } from './db';
import { eq, and, desc } from 'drizzle-orm';

// Validate required environment variables at startup
const requiredEnvVars = [
  'STORAGE_ENDPOINT',
  'ACCESS_KEY_ID',
  'SECRET_ACCESS_KEY',
  'STORAGE_BUCKET',
  'NEXT_PUBLIC_SUPABASE_URL',
];

const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
  logError({ component: 'storage', operation: 'init' }, errorMsg);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  }
}

const s3Client = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT,
  region: process.env.STORAGE_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.STORAGE_BUCKET || 'content-image';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB — Phase 125 proxy vote document upload

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return false;
  if (buffer.length < expected.length) return false;
  const matches = expected.every((byte, i) => buffer[i] === byte);
  if (!matches) return false;
  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }
  return true;
}

export interface UploadResult {
  url: string;
  key: string;
  error?: string;
}

export interface MediaItem {
  key: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export async function uploadImage(
  file: File,
  userId: string,
  tenantId?: string
): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) {
    return { url: '', key: '', error: 'Invalid file type. Only images are allowed.' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: '', key: '', error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { url: '', key: '', error: 'File too large. Maximum size is 2MB.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateMagicBytes(buffer, file.type)) {
      return {
        url: '',
        key: '',
        error: 'File content does not match its type. Possible MIME spoofing.',
      };
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const key = `users/${userId}/${createId()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read' as const,
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;

    db.insert(mediaUploads)
      .values({
        id: createId(),
        userId,
        tenantId: tenantId ?? '',
        key,
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })
      .catch(err =>
        logError(
          { component: 'storage', operation: 'uploadImage' },
          'Failed to write media record',
          err
        )
      );

    return { url: publicUrl, key };
  } catch (error) {
    logError({ component: 'storage', operation: 'uploadImage' }, 'Failed to upload image', error);
    return { url: '', key: '', error: 'Failed to upload image. Please try again.' };
  }
}

export async function listUserImages(userId: string): Promise<MediaItem[]> {
  try {
    const records = await db
      .select()
      .from(mediaUploads)
      .where(eq(mediaUploads.userId, userId))
      .orderBy(desc(mediaUploads.createdAt));

    if (records.length > 0) {
      return records.map(r => ({
        key: r.key,
        url: r.url,
        name: r.fileName,
        size: r.fileSize,
        uploadedAt: r.createdAt.toISOString(),
      }));
    }
  } catch (error) {
    logError({ component: 'storage', operation: 'listUserImages' }, 'DB query failed', error);
  }

  const prefix = `users/${userId}/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    return response.Contents.map(item => {
      const name = item.Key?.split('/').pop() || '';
      return {
        key: item.Key || '',
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${item.Key}`,
        name,
        size: item.Size || 0,
        uploadedAt: item.LastModified?.toISOString() || new Date().toISOString(),
      };
    });
  } catch (error) {
    logError({ component: 'storage', operation: 'listUserImages' }, 'Failed to list images', error);
    return [];
  }
}

export async function deleteImage(
  key: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify the key belongs to this user
  if (!key.startsWith(`users/${userId}/`)) {
    return { success: false, error: 'Unauthorized to delete this file' };
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    db.delete(mediaUploads)
      .where(and(eq(mediaUploads.key, key), eq(mediaUploads.userId, userId)))
      .catch(err =>
        logError(
          { component: 'storage', operation: 'deleteImage' },
          'Failed to delete media record',
          err
        )
      );

    return { success: true };
  } catch (error) {
    logError({ component: 'storage', operation: 'deleteImage' }, 'Failed to delete image', error);
    return { success: false, error: 'Failed to delete image' };
  }
}

export async function uploadTenantImage(file: File, tenantId: string): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) {
    return { url: '', key: '', error: 'Invalid file type. Only images are allowed.' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: '', key: '', error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { url: '', key: '', error: 'File too large. Maximum size is 2MB.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateMagicBytes(buffer, file.type)) {
      return {
        url: '',
        key: '',
        error: 'File content does not match its type. Possible MIME spoofing.',
      };
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const key = `tenants/${tenantId}/system/${createId()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read' as const,
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;

    db.insert(mediaUploads)
      .values({
        id: createId(),
        userId: '',
        tenantId,
        key,
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })
      .catch(err =>
        logError(
          { component: 'storage', operation: 'uploadTenantImage' },
          'Failed to write media record',
          err
        )
      );

    return { url: publicUrl, key };
  } catch (error) {
    logError(
      { component: 'storage', operation: 'uploadTenantImage' },
      'Failed to upload tenant image',
      error
    );
    return { url: '', key: '', error: 'Failed to upload image. Please try again.' };
  }
}

export async function listTenantImages(tenantId: string): Promise<MediaItem[]> {
  try {
    const records = await db
      .select()
      .from(mediaUploads)
      .where(eq(mediaUploads.tenantId, tenantId))
      .orderBy(desc(mediaUploads.createdAt));

    if (records.length > 0) {
      return records.map(r => ({
        key: r.key,
        url: r.url,
        name: r.fileName,
        size: r.fileSize,
        uploadedAt: r.createdAt.toISOString(),
      }));
    }
  } catch (error) {
    logError({ component: 'storage', operation: 'listTenantImages' }, 'DB query failed', error);
  }

  const prefix = `tenants/${tenantId}/system/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    return response.Contents.map(item => {
      const name = item.Key?.split('/').pop() || '';
      return {
        key: item.Key || '',
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${item.Key}`,
        name,
        size: item.Size || 0,
        uploadedAt: item.LastModified?.toISOString() || new Date().toISOString(),
      };
    });
  } catch (error) {
    logError(
      { component: 'storage', operation: 'listTenantImages' },
      'Failed to list tenant images',
      error
    );
    return [];
  }
}

export async function deleteTenantImage(
  key: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  if (!key.startsWith(`tenants/${tenantId}/system/`)) {
    return { success: false, error: 'Unauthorized to delete this file' };
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    db.delete(mediaUploads)
      .where(and(eq(mediaUploads.key, key), eq(mediaUploads.tenantId, tenantId)))
      .catch(err =>
        logError(
          { component: 'storage', operation: 'deleteTenantImage' },
          'Failed to delete media record',
          err
        )
      );

    return { success: true };
  } catch (error) {
    logError(
      { component: 'storage', operation: 'deleteTenantImage' },
      'Failed to delete image',
      error
    );
    return { success: false, error: 'Failed to delete image' };
  }
}

export function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Invalid file type. Only images are allowed.';
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
  }
  return null;
}

export async function uploadDocument(
  file: File,
  tenantId: string,
  subfolder?: string
): Promise<UploadResult> {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      url: '',
      key: '',
      error: `Invalid file type: ${file.type}. Accepted: PDF, JPG, PNG`,
    };
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return {
      url: '',
      key: '',
      error: `File too large: ${file.size} bytes. Maximum: 10MB`,
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const folder = subfolder ?? 'proxy-forms';
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `tenants/${tenantId}/documents/${folder}/${crypto.randomUUID()}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read' as const,
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;

    db.insert(mediaUploads)
      .values({
        id: createId(),
        userId: '',
        tenantId,
        key,
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })
      .catch(err =>
        logError(
          { component: 'storage', operation: 'uploadDocument' },
          'Failed to write media record',
          err
        )
      );

    return { url: publicUrl, key };
  } catch (error) {
    logError(
      { component: 'storage', operation: 'uploadDocument' },
      'Failed to upload document',
      error
    );
    return { url: '', key: '', error: 'Failed to upload document. Please try again.' };
  }
}

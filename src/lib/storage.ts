import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { logError } from './logging';

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

export async function uploadImage(file: File, userId: string): Promise<UploadResult> {
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

    const ext = file.name.split('.').pop() || 'jpg';
    const key = `users/${userId}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read' as const,
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
    return { url: publicUrl, key };
  } catch (error) {
    logError({ component: 'storage', operation: 'uploadImage' }, 'Failed to upload image', error);
    return { url: '', key: '', error: 'Failed to upload image. Please try again.' };
  }
}

export async function listUserImages(userId: string): Promise<MediaItem[]> {
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
    return { success: true };
  } catch (error) {
    logError({ component: 'storage', operation: 'deleteImage' }, 'Failed to delete image', error);
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

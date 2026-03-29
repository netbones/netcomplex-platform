import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT,
  region: 'eu-west-3',
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
  error?: string;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) {
    return { url: '', error: 'Invalid file type. Only images are allowed.' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: '', error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { url: '', error: 'File too large. Maximum size is 2MB.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split('.').pop() || 'jpg';
    const key = `uploads/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read' as const,
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
    return { url: publicUrl };
  } catch (error) {
    console.error('Upload error:', error);
    return { url: '', error: 'Failed to upload image. Please try again.' };
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

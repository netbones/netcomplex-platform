import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const BUCKET_NAME = 'content-images';
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
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${ext}`;
    const path = `uploads/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error('Supabase upload error:', error);
      return { url: '', error: 'Failed to upload image. Please try again.' };
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return { url: urlData.publicUrl };
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

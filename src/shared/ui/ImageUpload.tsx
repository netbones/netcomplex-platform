'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { createComponentLogger } from '@shared/lib';
import { apiPostForm } from '@/shared/api/http-client';

const log = createComponentLogger('ImageUpload');

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
  maxSize?: number;
}

export function ImageUpload({
  value,
  onChange,
  label = 'Upload Image',
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  maxSize = 2 * 1024 * 1024, // 2MB default
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
      return;
    }

    if (!accept.split(',').some(type => file.type.includes(type.replace('image/', '')))) {
      toast.error('Invalid file type. Please upload an image.');
      return;
    }

    setUploading(true);
    const uploadToast = toast.loading('Uploading image...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await apiPostForm<{ url: string; error?: string }>('/api/upload', formData);
      setPreview(data.url);
      onChange(data.url);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      log.error({}, 'Upload error', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      toast.dismiss(uploadToast);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-300 flex items-center justify-center">
          {preview ? (
            <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
          ) : (
            <span className="text-gray-400 text-xs text-center p-2">No image</span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 text-sm bg-soralia-primary text-white rounded-md hover:bg-soralia-primary/90 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading...' : preview ? 'Change' : 'Upload'}
          </button>

          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {value && <p className="text-xs text-gray-500 mt-1">Current image set</p>}
    </div>
  );
}

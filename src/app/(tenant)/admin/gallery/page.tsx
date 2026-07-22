'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createComponentLogger } from '@shared/lib';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const log = createComponentLogger('admin-gallery');

interface MediaItem {
  key: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export default function AdminGalleryPage() {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      setImages(data.images || []);
    } catch (err) {
      log.error({}, 'Failed to fetch gallery images', err);
      toast.error('Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const filesArray = Array.from(files);
    const loadingToast = toast.loading(`Uploading ${filesArray.length} image(s)...`);

    for (const file of filesArray) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const error = await res.json();
          toast.error(`${file.name}: ${error.error || 'Upload failed'}`);
        }
      } catch (err) {
        log.error({}, 'Upload error', err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    toast.dismiss(loadingToast);
    setUploading(false);
    await fetchImages();
    toast.success('Images uploaded!');
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Delete this image from the system gallery?')) return;

    try {
      const res = await fetch(`/api/admin/media?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setImages(prev => prev.filter(img => img.key !== key));
        toast.success('Image deleted');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete image');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Gallery' }]} />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-soralia-dark">System Gallery</h1>
          <span className="text-sm text-gray-500">{images.length} images</span>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
            dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            handleUpload(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={e => handleUpload(e.target.files)}
          />
          <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Upload
              className={`mx-auto text-gray-400 mb-2 ${uploading ? 'animate-bounce' : ''}`}
              size={32}
            />
            <p className="text-gray-600">
              {uploading ? 'Uploading...' : 'Drag & drop images here or click to browse'}
            </p>
            <p className="text-sm text-gray-400 mt-1">JPEG, PNG, GIF, WebP • Max 2MB</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-video bg-gray-200 rounded-lg" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No system images yet</p>
            <p className="text-sm mt-1">
              Upload images above to make them available in the &quot;System Gallery&quot; picker.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(img => (
              <div
                key={img.key}
                className="group relative bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="aspect-video relative">
                  <Image src={img.url} alt={img.name} fill className="object-cover" unoptimized />
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(img.key)}
                    className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                    title="Delete image"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="p-2 text-xs text-gray-500 truncate flex justify-between">
                  <span>{img.name}</span>
                  <span>{formatDate(img.uploadedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

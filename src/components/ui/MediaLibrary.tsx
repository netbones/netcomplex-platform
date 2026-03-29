'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';

interface MediaItem {
  key: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export function MediaLibrary() {
  const { data: session } = authClient.useSession();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchImages();
    }
  }, [session?.user?.id]);

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      setImages(data.images || []);
    } catch (e) {
      console.error('Failed to fetch images');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const filesArray = Array.from(files);
    const loadingToast = toast.loading(`Uploading ${filesArray.length} image(s)...`);

    for (const file of filesArray) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          toast.error(`${file.name}: ${error.error}`);
        }
      } catch (e) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    toast.dismiss(loadingToast);
    setUploading(false);
    fetchImages();
    toast.success('Images uploaded!');
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      const res = await fetch(`/api/media?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setImages(images.filter(img => img.key !== key));
        toast.success('Image deleted');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete');
      }
    } catch (e) {
      toast.error('Failed to delete image');
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied!');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
          <i
            className={`fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2 ${uploading ? 'animate-bounce' : ''}`}
          ></i>
          <p className="text-gray-600">
            {uploading ? 'Uploading...' : 'Drag & drop images here or click to browse'}
          </p>
          <p className="text-sm text-gray-400 mt-1">JPEG, PNG, GIF, WebP • Max 2MB</p>
        </div>
      </div>

      {/* Images grid */}
      {images.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          No images yet. Upload your first image above.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map(img => (
            <div
              key={img.key}
              className="group relative bg-white rounded-lg shadow overflow-hidden"
            >
              <div className="aspect-square">
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => copyToClipboard(img.url)}
                  className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                  title="Copy URL"
                >
                  <i className="fas fa-link"></i>
                </button>
                <button
                  onClick={() => window.open(img.url, '_blank')}
                  className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                  title="View"
                >
                  <i className="fas fa-external-link-alt"></i>
                </button>
                <button
                  onClick={() => handleDelete(img.key)}
                  className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
                  title="Delete"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              <div className="p-2 text-xs text-gray-500 truncate">{formatSize(img.size)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface HeaderImagePickerProps {
  open: boolean;
  onClose: () => void;
  currentImage?: string;
  onSelect: (imageUrl: string) => void;
}

interface MediaItem {
  key: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

async function fetchMyImages(): Promise<MediaItem[]> {
  const r = await fetch('/api/media');
  const d = await r.json();
  return d.data?.images || d.images || [];
}

async function uploadMyImage(file: File): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Upload failed');
  }
  const data = await res.json();
  return { url: data.data.url, key: data.data.key };
}

export function HeaderImagePicker({
  open,
  onClose,
  currentImage,
  onSelect,
}: HeaderImagePickerProps) {
  const [tab, setTab] = useState<'system' | 'my'>('system');
  const [systemImages, setSystemImages] = useState<MediaItem[]>([]);
  const [myImages, setMyImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState(currentImage || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/media')
        .then(r => r.json())
        .then(d => setSystemImages(d.data?.images || d.images || []))
        .catch(() => {}),
      fetchMyImages()
        .then(setMyImages)
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    setSelected(currentImage || '');
    loadImages();
  }, [open, currentImage]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const filesArray = Array.from(files);
    const loadingToast = toast.loading(`Uploading ${filesArray.length} image(s)...`);
    const uploaded: MediaItem[] = [];

    for (const file of filesArray) {
      try {
        const { url, key } = await uploadMyImage(file);
        uploaded.push({
          url,
          key,
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`);
      }
    }

    toast.dismiss(loadingToast);
    setUploading(false);
    if (uploaded.length > 0) {
      setMyImages(prev => [...uploaded, ...prev]);
      if (uploaded.length === 1) setSelected(uploaded[0].url);
    }
    fetchMyImages()
      .then(serverImages => {
        if (serverImages.length > 0) setMyImages(serverImages);
      })
      .catch(() => {});
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Images uploaded!');
  };

  if (!open) return null;

  const handleConfirm = async () => {
    if (!selected) return;
    try {
      await onSelect(selected);
      toast.success('Header image updated');
    } catch {
      toast.error('Failed to save header image');
    }
    onClose();
  };

  const images = tab === 'system' ? systemImages : myImages;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Choose Header Image</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4 border-b">
          <button
            onClick={() => setTab('system')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === 'system'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            System Gallery
          </button>
          <button
            onClick={() => setTab('my')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === 'my'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Images
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'my' && (
            <div
              className={`border-2 border-dashed rounded-lg p-4 mb-4 text-center transition-colors ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-gray-400'
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
              <div className="cursor-pointer py-2" onClick={() => fileInputRef.current?.click()}>
                <Upload
                  className={`mx-auto text-gray-400 mb-1 ${uploading ? 'animate-bounce' : ''}`}
                  size={24}
                />
                <p className="text-sm text-gray-600">
                  {uploading ? 'Uploading...' : 'Drag & drop images or click to browse'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, GIF, WebP • Max 2MB</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">
                {tab === 'system'
                  ? 'No system images yet. Admin can upload from the admin panel.'
                  : 'No personal images yet. Upload using the area above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {images.map(img => (
                <button
                  key={img.key}
                  onClick={() => setSelected(img.url)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    selected === img.url
                      ? 'border-indigo-600 ring-2 ring-indigo-400'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image src={img.url} alt={img.name} fill className="object-cover" unoptimized />
                  {selected === img.url && (
                    <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Apply Header
          </button>
        </div>
      </div>
    </div>
  );
}

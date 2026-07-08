'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Image as ImageIcon } from 'lucide-react';
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
  const [selected, setSelected] = useState(currentImage || '');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(currentImage || '');

    Promise.all([
      fetch('/api/admin/media')
        .then(r => r.json())
        .then(d => setSystemImages(d.images || []))
        .catch(() => {}),
      fetch('/api/media')
        .then(r => r.json())
        .then(d => setMyImages(d.images || []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [open, currentImage]);

  if (!open) return null;

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    toast.success('Header image updated');
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
                  : 'No personal images yet. Upload from the Media widget.'}
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

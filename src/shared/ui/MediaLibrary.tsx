'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';
import { authClient } from '@api/client';
import { createComponentLogger } from '@shared/lib';

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
  LayoutGrid,
  Link,
  Trash2,
  Upload,
} from 'lucide-react';
const log = createComponentLogger('MediaLibrary');

interface MediaItem {
  key: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

interface MediaLibraryProps {
  viewMode?: 'grid' | 'carousel';
  selectable?: boolean;
  onSelect?: (item: MediaItem) => void;
}

export function MediaLibrary({
  viewMode: initialViewMode = 'grid',
  selectable = false,
  onSelect,
}: MediaLibraryProps) {
  const { data: session } = authClient.useSession();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>(initialViewMode);
  const [selectedIndex, setSelectedIndex] = useState(0);
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
      log.error({}, 'Failed to fetch images', e);
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
      } catch {
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
    } catch {
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
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              >
                <LayoutGrid />
              </button>
            </TooltipTrigger>
            <TooltipContent>Grid view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setViewMode('carousel')}
                className={`p-2 rounded-md ${viewMode === 'carousel' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              >
                <Images />
              </button>
            </TooltipTrigger>
            <TooltipContent>Carousel view</TooltipContent>
          </Tooltip>
        </div>
        <span className="text-sm text-gray-500">{images.length} images</span>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
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
              <Upload
                className={`text-4xl text-gray-400 mb-2 ${uploading ? 'animate-bounce' : ''}`}
              />
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
                  className="group relative bg-white rounded-lg shadow overflow-hidden cursor-pointer"
                  onClick={() => selectable && onSelect?.(img)}
                >
                  <div className="aspect-square relative">
                    <Image src={img.url} alt={img.name} fill className="object-cover" unoptimized />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            copyToClipboard(img.url);
                          }}
                          className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        >
                          <Link />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copy URL</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            window.open(img.url, '_blank');
                          }}
                          className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        >
                          <ExternalLink />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>View</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(img.key);
                          }}
                          className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
                        >
                          <Trash2 />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="p-2 text-xs text-gray-500 truncate">{formatSize(img.size)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Carousel View */}
      {viewMode === 'carousel' && (
        <>
          {images.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No images to display in carousel.</p>
              <p className="text-sm mt-2">Upload images to see them here.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Main carousel */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <Image
                  src={images[selectedIndex].url}
                  alt={images[selectedIndex].name}
                  fill
                  className="object-contain"
                  unoptimized
                />
                {/* Navigation arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setSelectedIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight />
                    </button>
                  </>
                )}
                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                  {selectedIndex + 1} / {images.length}
                </div>
                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => copyToClipboard(images[selectedIndex].url)}
                        className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <Link />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Copy URL</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => window.open(images[selectedIndex].url, '_blank')}
                        className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ExternalLink />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>View full</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDelete(images[selectedIndex].key)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Trash2 />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={img.key}
                    onClick={() => setSelectedIndex(idx)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === selectedIndex
                        ? 'border-indigo-600'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.name}
                      width={80}
                      height={80}
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload area for carousel mode */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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
                className={`text-2xl text-gray-400 mb-2 ${uploading ? 'animate-bounce' : ''}`}
              />
              <p className="text-gray-600 text-sm">
                {uploading ? 'Uploading...' : 'Drop images here or click to upload'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Globe, ChevronLeft } from 'lucide-react';

interface PublicAlbum {
  id: string;
  title: string;
  description: string | null;
  mediaIds: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
}

export function CommunityGalleryWidget() {
  const [albums, setAlbums] = useState<PublicAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<PublicAlbum | null>(null);

  useEffect(() => {
    fetch('/api/user/albums/public')
      .then(r => r.json())
      .then(d => setAlbums(d?.albums || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Community Gallery</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Community Gallery</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No public albums yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Share albums publicly from your My Album widget
          </p>
        </div>
      </div>
    );
  }

  if (selectedAlbum) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setSelectedAlbum(null)}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 truncate">{selectedAlbum.title}</h3>
        </div>
        {selectedAlbum.description && (
          <p className="text-sm text-gray-600">{selectedAlbum.description}</p>
        )}
        <p className="text-xs text-gray-500">
          by {selectedAlbum.userName} &middot;{' '}
          {new Date(selectedAlbum.createdAt).toLocaleDateString()}
        </p>
        {selectedAlbum.mediaIds.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">No media in this album</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {selectedAlbum.mediaIds.map(mediaId => (
              <AlbumMediaThumbnail key={mediaId} mediaId={mediaId} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Community Gallery</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {albums.map(album => (
          <button
            key={album.id}
            onClick={() => setSelectedAlbum(album)}
            className="text-left border rounded-lg p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden">
                {album.userAvatar ? (
                  <img src={album.userAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-medium text-indigo-600">
                    {album.userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 truncate">{album.userName}</span>
            </div>
            <h4 className="font-medium text-sm text-gray-900 truncate">{album.title}</h4>
            {album.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{album.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{album.mediaIds.length} items</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function AlbumMediaThumbnail({ mediaId }: { mediaId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/media')
      .then(r => r.json())
      .then(d => {
        const item = (d?.images || []).find((img: { key: string }) => img.key === mediaId);
        if (item) setUrl(item.url);
      })
      .catch(() => {});
  }, [mediaId]);

  if (!url) {
    return <div className="aspect-square bg-gray-200 rounded animate-pulse" />;
  }

  return (
    <div className="aspect-square rounded overflow-hidden">
      <img src={url} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

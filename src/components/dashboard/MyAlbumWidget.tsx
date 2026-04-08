'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { toast } from 'sonner';

interface AlbumItem {
  id: string;
  title: string;
  description?: string;
  mediaIds: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MediaItem {
  key: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export function MyAlbumWidget() {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const [newAlbum, setNewAlbum] = useState({ title: '', description: '', isPublic: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAlbums();
      fetchMediaItems();
    }
  }, [session?.user?.id]);

  const fetchAlbums = async () => {
    try {
      const res = await fetch('/api/user/albums');
      const data = await res.json();
      setAlbums(data.albums || []);
    } catch (e) {
      toast.error('Failed to fetch albums');
    }
  };

  const fetchMediaItems = async () => {
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      setMediaItems(data.images || []);
    } catch (e) {
      toast.error('Failed to fetch media items');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbum.title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/user/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          album: {
            title: newAlbum.title.trim(),
            description: newAlbum.description.trim(),
            isPublic: newAlbum.isPublic,
            mediaIds: [],
          },
        }),
      });
      const data = await res.json();
      setAlbums(data.albums || []);
      setNewAlbum({ title: '', description: '', isPublic: false });
    } catch (e) {
      toast.error('Failed to create album');
    }
    setSaving(false);
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('Delete this album?')) return;

    setSaving(true);
    try {
      const res = await fetch('/api/user/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', albumId }),
      });
      const data = await res.json();
      setAlbums(data.albums || []);
      if (selectedAlbum?.id === albumId) {
        setSelectedAlbum(null);
      }
    } catch (e) {
      toast.error('Failed to delete album');
    }
    setSaving(false);
  };

  const handleUpdateAlbum = async (album: AlbumItem) => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', album }),
      });
      const data = await res.json();
      setAlbums(data.albums || []);
      setSelectedAlbum(album);
    } catch (e) {
      toast.error('Failed to update album');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4">
          <div className="animate-pulse">Loading albums...</div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('myAlbums', 'My Albums')}</h3>
          {!isEditing && albums.length < 3 && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {albums.length === 0 ? t('createAlbum', 'Create Album') : t('addAlbum', 'Add Album')}
            </button>
          )}
        </div>

        {isEditing && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('createNewAlbum', 'Create New Album')}
            </h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t('albumTitle', 'Album Title')}
                value={newAlbum.title}
                onChange={e => setNewAlbum({ ...newAlbum, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <textarea
                placeholder={t('albumDescription', 'Album Description (optional)')}
                value={newAlbum.description}
                onChange={e => setNewAlbum({ ...newAlbum, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={2}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAlbum.isPublic}
                  onChange={e => setNewAlbum({ ...newAlbum, isPublic: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">
                  {t('makePublic', 'Make album public on profile')}
                </span>
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreateAlbum}
                disabled={saving || !newAlbum.title.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? t('creating', 'Creating...') : t('create', 'Create')}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
              >
                {t('cancel', 'Cancel')}
              </button>
            </div>
          </div>
        )}

        {albums.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm mb-4">{t('noAlbums', 'No albums yet')}</p>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
              >
                {t('createFirstAlbum', 'Create Your First Album')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map(album => (
              <div
                key={album.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{album.title}</h4>
                  <div className="flex items-center gap-1">
                    {album.isPublic && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {t('public', 'Public')}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteAlbum(album.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title={t('deleteAlbum', 'Delete Album')}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                {album.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{album.description}</p>
                )}
                <div className="text-xs text-gray-500 mb-3">
                  {album.mediaIds.length} {t('items', 'items')} • {t('created', 'Created')}{' '}
                  {new Date(album.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAlbum(selectedAlbum?.id === album.id ? null : album)}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    {selectedAlbum?.id === album.id
                      ? t('hideContents', 'Hide Contents')
                      : t('viewContents', 'View Contents')}
                  </button>
                  <button
                    onClick={() => {
                      const updatedAlbum = { ...album, isPublic: !album.isPublic };
                      handleUpdateAlbum(updatedAlbum);
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    {album.isPublic
                      ? t('makePrivate', 'Make Private')
                      : t('makePublic', 'Make Public')}
                  </button>
                </div>
                {selectedAlbum?.id === album.id && (
                  <div className="mt-3 pt-3 border-t">
                    {album.mediaIds.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        {t('noMediaInAlbum', 'No media in this album yet')}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {album.mediaIds.slice(0, 6).map(mediaId => {
                          const mediaItem = mediaItems.find(item => item.key === mediaId);
                          return mediaItem ? (
                            <div key={mediaId} className="aspect-square">
                              <img
                                src={mediaItem.url}
                                alt={mediaItem.name}
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          ) : null;
                        })}
                        {album.mediaIds.length > 6 && (
                          <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-500">
                              +{album.mediaIds.length - 6}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {albums.length >= 3 && (
          <div className="text-center py-2 text-sm text-gray-500">
            {t('maxAlbumsReached', 'Maximum of 3 albums reached')}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

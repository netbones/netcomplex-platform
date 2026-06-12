'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { authClient } from '@api/client';
import { canPublishAnnouncements } from '@shared/lib';
import { useAnnouncements, AnnouncementForm, AnnouncementList } from '@features/announcements';
import type { AnnouncementWithResource } from '@features/announcements';
import type { AnnouncementFormData } from '@api/shared';
import { toast } from 'sonner';
export default function AnnouncementsAdminPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role || 'RESIDENT';

  const {
    announcements,
    loading,
    error,
    submitting,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refresh,
  } = useAnnouncements();

  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementWithResource | null>(
    null
  );

  // Permission check
  const canPublish = canPublishAnnouncements(userRole);

  const handleFormSubmit = useCallback(
    async (data: AnnouncementFormData, id?: string): Promise<{ warning?: string } | null> => {
      if (id) {
        const result = await updateAnnouncement(id, data);
        if (result) {
          toast.success('Announcement updated!');
          setShowForm(false);
          setEditingAnnouncement(null);
          return result as { warning?: string };
        }
        return null;
      } else {
        const result = await createAnnouncement(data);
        if (result) {
          toast.success('Announcement created!');
          setShowForm(false);
          return result as { warning?: string };
        }
        return null;
      }
    },
    [createAnnouncement, updateAnnouncement]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Are you sure you want to delete this announcement?')) return;
      const ok = await deleteAnnouncement(id);
      if (ok) {
        toast.success('Announcement deleted');
      }
    },
    [deleteAnnouncement]
  );

  const handleEdit = useCallback((announcement: AnnouncementWithResource) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingAnnouncement(null);
  }, []);

  if (!canPublish) {
    return (
      <ErrorBoundary>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Announcements' }]} />
          <div className="text-center py-12">
            <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You do not have permission to manage announcements.</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Announcements' }]} />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          {!showForm && (
            <button
              onClick={() => {
                setEditingAnnouncement(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <i className="fas fa-plus mr-2"></i>New Announcement
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <AnnouncementForm
              userRole={userRole}
              initialData={
                editingAnnouncement
                  ? {
                      id: editingAnnouncement.id,
                      title: editingAnnouncement.title,
                      content: editingAnnouncement.content,
                      author: editingAnnouncement.author,
                      priority: editingAnnouncement.priority,
                      targetFilter: editingAnnouncement.targetFilter,
                      targetRoles:
                        editingAnnouncement.targetRoles as AnnouncementFormData['targetRoles'],
                      resourceId: editingAnnouncement.resourceId ?? undefined,
                      expiresAt: editingAnnouncement.expiresAt
                        ? editingAnnouncement.expiresAt instanceof Date
                          ? editingAnnouncement.expiresAt.toISOString().slice(0, 16)
                          : String(editingAnnouncement.expiresAt)
                        : null,
                    }
                  : undefined
              }
              onSubmit={handleFormSubmit}
              onDelete={async id => {
                const ok = await deleteAnnouncement(id);
                if (ok) toast.success('Announcement deleted');
                setShowForm(false);
                setEditingAnnouncement(null);
                return ok;
              }}
              onCancel={handleCancel}
            />
          </div>
        )}

        <AnnouncementList
          announcements={announcements}
          loading={loading}
          error={error}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRetry={refresh}
        />
      </div>
    </ErrorBoundary>
  );
}

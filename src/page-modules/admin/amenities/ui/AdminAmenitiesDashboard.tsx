'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, MoreVertical, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { createComponentLogger } from '@shared/lib';
import { apiDelete, apiGet, apiPatch } from '@/shared/api/http-client';
import { ApiClientError } from '@/shared/api/http-client';
import { AMENITY_ICON_COLORS, formatHours } from '@entities/amenity';
import type { Amenity } from '@entities/amenity';

const log = createComponentLogger('AdminAmenitiesDashboard');

interface AmenityRow extends Amenity {
  bookingsToday: number | null;
  bookingCount: number;
}

interface AmenitiesListResponse {
  amenities: AmenityRow[];
  stats: {
    activeAmenities: number;
    bookingsToday: number;
    onWaitlist: number;
    noShowsThisWeek: number | null;
  };
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-medium text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function RowMenu({
  amenity,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  amenity: AmenityRow;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const canDelete = amenity.bookingCount === 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
        aria-label="Amenity actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onToggleActive();
              }}
            >
              {amenity.active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              disabled={!canDelete}
              title={
                canDelete ? 'Delete amenity' : 'Cannot delete — bookings exist. Deactivate instead.'
              }
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SortableAmenityRow({
  amenity,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  amenity: AmenityRow;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: amenity.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colors = AMENITY_ICON_COLORS[amenity.icon] || AMENITY_ICON_COLORS.default;
  const hours = formatHours(amenity.hoursOpen, amenity.hoursClose);

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 last:border-0">
      <td className="px-2 py-3 text-gray-400 w-8">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1"
          aria-label={`Reorder ${amenity.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}
          >
            <i className={`ti ti-${amenity.icon} text-[15px] ${colors.text}`} aria-hidden="true" />
          </div>
          <span className="font-medium text-gray-900">{amenity.name}</span>
        </div>
      </td>
      <td className="px-2 py-3 text-gray-500 whitespace-nowrap">{hours}</td>
      <td className="px-2 py-3">
        {amenity.bookable ? (
          <Check className="w-4 h-4 text-green-600" aria-label="Bookable" />
        ) : (
          <X className="w-4 h-4 text-gray-400" aria-label="Not bookable" />
        )}
      </td>
      <td className="px-2 py-3 text-gray-500">
        {amenity.bookingsToday == null ? '—' : amenity.bookingsToday}
      </td>
      <td className="px-2 py-3">
        <span
          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
            amenity.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {amenity.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-2 py-3 text-right">
        <RowMenu
          amenity={amenity}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

export function AdminAmenitiesDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<AmenityRow[]>([]);
  const [stats, setStats] = useState<AmenitiesListResponse['stats'] | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    try {
      const { data } = await apiGet<AmenitiesListResponse>('/api/admin/amenities');
      setRows(data.amenities);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      log.error({}, 'Failed to load amenities', err);
      setError('Failed to load amenities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const persistOrder = useCallback(
    async (ordered: AmenityRow[]) => {
      try {
        await apiPatch('/api/admin/amenities/reorder', {
          orderedIds: ordered.map(r => r.id),
        });
      } catch (err) {
        log.error({}, 'Failed to reorder amenities', err);
        toast.error('Failed to save order');
        void load();
      }
    },
    [load]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setRows(prev => {
        const oldIndex = prev.findIndex(r => r.id === active.id);
        const newIndex = prev.findIndex(r => r.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;
        const next = arrayMove(prev, oldIndex, newIndex);
        void persistOrder(next);
        return next;
      });
    },
    [persistOrder]
  );

  const toggleActive = useCallback(
    async (amenity: AmenityRow) => {
      try {
        await apiPatch(`/api/admin/amenities/${amenity.id}`, { active: !amenity.active });
        toast.success(amenity.active ? 'Amenity deactivated' : 'Amenity activated');
        void load();
      } catch (err) {
        log.error({ id: amenity.id }, 'Failed to toggle active', err);
        toast.error('Failed to update amenity');
      }
    },
    [load]
  );

  const deleteAmenity = useCallback(
    async (amenity: AmenityRow) => {
      if (amenity.bookingCount > 0) {
        toast.error('Cannot delete — bookings exist. Deactivate instead.');
        return;
      }
      if (!window.confirm(`Delete “${amenity.name}”? This cannot be undone.`)) return;
      try {
        await apiDelete(`/api/admin/amenities/${amenity.id}`);
        toast.success('Amenity deleted');
        void load();
      } catch (err) {
        log.error({ id: amenity.id }, 'Failed to delete amenity', err);
        const msg = err instanceof ApiClientError ? err.message : 'Failed to delete amenity';
        toast.error(msg);
      }
    },
    [load]
  );

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Amenities' }]} />

          <div className="flex items-center justify-between mt-6 mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <DomainIconBadge id="amenities" variant="admin" size="md" />
              <h1 className="text-3xl font-bold text-gray-900">Amenities</h1>
            </div>
            <Link
              href="/admin/amenities/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add amenity
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatTile label="Active amenities" value={stats?.activeAmenities ?? 0} />
            <StatTile label="Bookings today" value={stats?.bookingsToday ?? 0} />
            <StatTile label="On waitlist" value={stats?.onWaitlist ?? 0} />
            <StatTile
              label="No-shows this week"
              value={stats?.noShowsThisWeek == null ? '—' : stats.noShowsThisWeek}
            />
          </div>

          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search amenities"
            className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 font-medium">
                    <th className="px-2 py-2 w-8" />
                    <th className="px-2 py-2">Amenity</th>
                    <th className="px-2 py-2">Hours</th>
                    <th className="px-2 py-2">Bookable</th>
                    <th className="px-2 py-2">Bookings today</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <SortableContext
                  items={filtered.map(r => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                          {search.trim()
                            ? 'No amenities match your search.'
                            : 'No amenities yet. Add one to get started.'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map(amenity => (
                        <SortableAmenityRow
                          key={amenity.id}
                          amenity={amenity}
                          onEdit={() => router.push(`/admin/amenities/${amenity.id}`)}
                          onToggleActive={() => void toggleActive(amenity)}
                          onDelete={() => void deleteAmenity(amenity)}
                        />
                      ))
                    )}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

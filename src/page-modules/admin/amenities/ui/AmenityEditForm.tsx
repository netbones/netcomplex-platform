'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { apiGet, apiPatch, apiPost, apiPostForm } from '@/shared/api/http-client';
import { ApiClientError } from '@/shared/api/http-client';
import {
  AMENITY_ICON_OPTIONS,
  amenityAdminSchema,
  type Amenity,
  type AmenityAdminInput,
} from '@entities/amenity';

const log = createComponentLogger('AmenityEditForm');

type FormValues = AmenityAdminInput;

function toNullableNumber(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

interface AmenityEditFormProps {
  amenityId?: string;
}

function defaultsFromAmenity(a?: Amenity | null): FormValues {
  if (!a) {
    return {
      name: '',
      icon: 'tennis',
      photoUrl: null,
      alwaysOpen: false,
      hoursOpen: '06:00',
      hoursClose: '21:30',
      bookable: true,
      slotDurationMins: 60,
      maxOccupancy: 4,
      waitlistEnabled: false,
      rulesText: '',
      active: true,
    };
  }
  const alwaysOpen = !a.hoursOpen || !a.hoursClose;
  return {
    name: a.name,
    icon: (AMENITY_ICON_OPTIONS.some(o => o.value === a.icon)
      ? a.icon
      : 'tennis') as FormValues['icon'],
    photoUrl: a.photoUrl,
    alwaysOpen,
    hoursOpen: a.hoursOpen ?? '06:00',
    hoursClose: a.hoursClose ?? '21:30',
    bookable: a.bookable,
    slotDurationMins: a.slotDurationMins,
    maxOccupancy: a.maxOccupancy,
    waitlistEnabled: a.waitlistEnabled,
    rulesText: a.rulesText ?? '',
    active: a.active,
    contactEnabled: a.contactEnabled,
    contactPhone: a.contactPhone,
    description: a.description,
  };
}

export function AmenityEditForm({ amenityId }: AmenityEditFormProps) {
  const router = useRouter();
  const isEdit = Boolean(amenityId);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameWarning, setNameWarning] = useState<string | null>(null);
  const [siblingNames, setSiblingNames] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(amenityAdminSchema) as Resolver<FormValues>,
    defaultValues: defaultsFromAmenity(null),
  });

  const bookable = watch('bookable');
  const alwaysOpen = watch('alwaysOpen');
  const photoUrl = watch('photoUrl');
  const name = watch('name');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiGet<{
          amenities: Array<{ id: string; name: string }>;
        }>('/api/admin/amenities');
        if (cancelled) return;
        setSiblingNames(
          data.amenities.filter(a => a.id !== amenityId).map(a => a.name.toLowerCase())
        );
      } catch {
        // Soft uniqueness only — ignore list failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amenityId]);

  useEffect(() => {
    const trimmed = name?.trim().toLowerCase() ?? '';
    if (trimmed && siblingNames.includes(trimmed)) {
      setNameWarning('Another amenity already uses this name.');
    } else {
      setNameWarning(null);
    }
  }, [name, siblingNames]);

  useEffect(() => {
    if (!amenityId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiGet<Amenity & { bookingCount: number }>(
          `/api/admin/amenities/${amenityId}`
        );
        if (cancelled) return;
        reset(defaultsFromAmenity(data));
      } catch (err) {
        log.error({ amenityId }, 'Failed to load amenity', err);
        toast.error('Failed to load amenity');
        router.push('/admin/amenities');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amenityId, reset, router]);

  const title = useMemo(() => (isEdit ? 'Edit amenity' : 'Add amenity'), [isEdit]);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiPostForm<{ url: string }>('/api/admin/media', formData);
      setValue('photoUrl', data.url, { shouldDirty: true });
      toast.success('Photo uploaded');
    } catch (err) {
      log.error({}, 'Photo upload failed', err);
      toast.error(err instanceof ApiClientError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      if (isEdit && amenityId) {
        await apiPatch(`/api/admin/amenities/${amenityId}`, values);
        toast.success('Changes saved');
      } else {
        await apiPost('/api/admin/amenities', values);
        toast.success('Amenity created');
      }
      router.push('/admin/amenities');
    } catch (err) {
      log.error({ amenityId }, 'Save failed', err);
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!amenityId) return;
    setSaving(true);
    try {
      await apiPatch(`/api/admin/amenities/${amenityId}`, { active: false });
      toast.success('Amenity deactivated');
      router.push('/admin/amenities');
    } catch (err) {
      log.error({ amenityId }, 'Deactivate failed', err);
      toast.error('Failed to deactivate');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Amenities', href: '/admin/amenities' },
              { label: isEdit ? 'Edit' : 'Add' },
            ]}
          />

          <Link
            href="/admin/amenities"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mt-4 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to amenities
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-5">{title}</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Name</label>
              <input
                {...register('name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              {nameWarning && !errors.name && (
                <p className="text-xs text-amber-600 mt-1">{nameWarning}</p>
              )}
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1.5">Icon</label>
                <select
                  {...register('icon')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  {AMENITY_ICON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1.5">Photo (optional)</label>
                <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50 bg-white">
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {photoUrl ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => void onUpload(e.target.files?.[0])}
                  />
                </label>
                {photoUrl ? (
                  <button
                    type="button"
                    className="text-xs text-gray-500 underline mt-1"
                    onClick={() => setValue('photoUrl', null, { shouldDirty: true })}
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1.5">Opens</label>
                <input
                  type="time"
                  disabled={alwaysOpen}
                  {...register('hoursOpen')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1.5">Closes</label>
                <input
                  type="time"
                  disabled={alwaysOpen}
                  {...register('hoursClose')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
            {(errors.hoursOpen || errors.hoursClose) && (
              <p className="text-xs text-red-600 -mt-2">
                {errors.hoursOpen?.message || errors.hoursClose?.message}
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-600 -mt-1">
              <input type="checkbox" {...register('alwaysOpen')} className="rounded" />
              Always open (no hours restriction)
            </label>

            <label className="flex items-center justify-between text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
              Bookable
              <input type="checkbox" {...register('bookable')} className="rounded" />
            </label>

            {bookable && (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1.5">
                      Slot duration (mins)
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register('slotDurationMins', { setValueAs: toNullableNumber })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {errors.slotDurationMins && (
                      <p className="text-xs text-red-600 mt-1">{errors.slotDurationMins.message}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1.5">Max occupancy</label>
                    <input
                      type="number"
                      min={1}
                      {...register('maxOccupancy', { setValueAs: toNullableNumber })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {errors.maxOccupancy && (
                      <p className="text-xs text-red-600 mt-1">{errors.maxOccupancy.message}</p>
                    )}
                  </div>
                </div>

                <label className="flex items-center justify-between text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
                  Allow waitlist when fully booked
                  <input type="checkbox" {...register('waitlistEnabled')} className="rounded" />
                </label>
              </>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Rules and info (shown to residents)
              </label>
              <textarea
                rows={3}
                {...register('rulesText')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <label className="flex items-center justify-between text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
              Active (visible to residents)
              <input type="checkbox" {...register('active')} className="rounded" />
            </label>

            <div className="flex gap-2.5 pt-2">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => void deactivate()}
                  disabled={saving}
                  className="px-3.5 py-2.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Deactivate
                </button>
              )}
              <div className="flex-1" />
              <Link
                href="/admin/amenities"
                className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEdit ? 'Save changes' : 'Create amenity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  );
}

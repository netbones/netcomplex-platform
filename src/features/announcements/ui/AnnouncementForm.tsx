'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { announcementSchema, type AnnouncementFormData } from '@entities/content';
import {
  PRIORITY_TAXONOMY,
  getAllowedPriorities,
  MAX_PRIORITY_BY_ROLE,
  type AnnouncementPriority,
} from '../model/priority-taxonomy';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('AnnouncementForm');

/** Input type for the form — accounts for Zod .default() making fields optional on input */
type AnnouncementFormInput = z.input<typeof announcementSchema>;

/** Role enum values from the Zod schema */
type TargetRole = AnnouncementFormData['targetRoles'][number];

interface ResourceOption {
  id: string;
  title: string;
  category: string;
}

interface AnnouncementFormInitialData {
  id?: string;
  title?: string;
  content?: string;
  author?: string;
  priority?: AnnouncementPriority;
  targetFilter?: 'ALL' | 'OWNERS_ONLY' | 'RENTERS_ONLY';
  targetRoles?: TargetRole[];
  resourceId?: string;
  expiresAt?: string | null;
}

interface AnnouncementFormProps {
  /** Current user's role for priority gating */
  userRole: string;
  /** Initial data for editing (omit for create mode) */
  initialData?: AnnouncementFormInitialData;
  /** Submit handler — returns the created/updated announcement or null on failure */
  onSubmit: (data: AnnouncementFormData, id?: string) => Promise<{ warning?: string } | null>;
  /** Delete handler for edit mode */
  onDelete?: (id: string) => Promise<boolean>;
  /** Cancel callback */
  onCancel?: () => void;
}

const TARGET_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Residents' },
  { value: 'OWNERS_ONLY', label: 'Owners Only' },
  { value: 'RENTERS_ONLY', label: 'Renters Only' },
] as const;

const ROLE_OPTIONS = [
  { value: 'RESIDENT', label: 'Resident' },
  { value: 'GROUP_ADMIN', label: 'Group Admin' },
  { value: 'COMMITTEE', label: 'Committee' },
  { value: 'BOARD', label: 'Board' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ASSOCIATE', label: 'Associate' },
] as const;

function formatForInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 16);
}

export function AnnouncementForm({
  userRole,
  initialData,
  onSubmit,
  onDelete,
  onCancel,
}: AnnouncementFormProps) {
  const isEditing = !!initialData?.id;
  const allowedPriorities = getAllowedPriorities(userRole);
  const maxPriorityLabel = PRIORITY_TAXONOMY[MAX_PRIORITY_BY_ROLE[userRole] ?? 'normal']?.label;

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [selectedTargetRoles, setSelectedTargetRoles] = useState<TargetRole[]>(
    initialData?.targetRoles ?? []
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<AnnouncementFormInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      author: initialData?.author || '',
      priority: initialData?.priority || 'normal',
      targetFilter: initialData?.targetFilter || 'ALL',
      targetRoles: initialData?.targetRoles ?? [],
      resourceId: initialData?.resourceId || '',
      expiresAt: initialData?.expiresAt ? formatForInput(initialData.expiresAt) : '',
    },
  });

  // Fetch tenant resources for the document attachment dropdown
  useEffect(() => {
    async function fetchResources() {
      try {
        const res = await fetch('/api/resources');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : [];
          setResources(
            items.map((r: { id: string; title: string; category: string }) => ({
              id: r.id,
              title: r.title,
              category: r.category,
            }))
          );
        }
      } catch (err) {
        log.error({}, 'Failed to fetch resources for dropdown', err);
      } finally {
        setResourcesLoading(false);
      }
    }
    fetchResources();
  }, []);

  const handleFormSubmit = async (data: AnnouncementFormInput) => {
    // Zod resolver transforms defaults, so data is now AnnouncementFormData-compatible
    const formData: AnnouncementFormData = {
      ...data,
      targetRoles: selectedTargetRoles,
    } as AnnouncementFormData;
    const result = await onSubmit(formData, initialData?.id);
    if (result?.warning) {
      toast.warning(result.warning);
    }
  };

  const handleRoleToggle = (role: TargetRole) => {
    setSelectedTargetRoles(prev => {
      const next = prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role];
      setValue('targetRoles', next);
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-2xl">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('title')}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.title ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Announcement title"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('content')}
          rows={5}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.content ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Full announcement content"
        />
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
      </div>

      {/* Author */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Author <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('author')}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.author ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Author name (e.g. Board Secretary)"
        />
        {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author.message}</p>}
      </div>

      {/* Priority (role-gated) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Priority <span className="text-red-500">*</span>
        </label>
        <select
          {...register('priority')}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.priority ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          {allowedPriorities.map(p => (
            <option key={p} value={p}>
              {PRIORITY_TAXONOMY[p].label} — {PRIORITY_TAXONOMY[p].meaning}
            </option>
          ))}
        </select>
        {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>}

        {/* Priority taxonomy helper text */}
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700 mb-1">Priority Definitions:</p>
          {(['urgent', 'high', 'normal', 'low'] as AnnouncementPriority[]).map(key => {
            const tax = PRIORITY_TAXONOMY[key];
            const isAllowed = allowedPriorities.includes(key);
            return (
              <p key={key} className={isAllowed ? '' : 'opacity-40 line-through'}>
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-1.5 ${tax.color.split(' ')[1]}`}
                ></span>
                <strong>{tax.label}:</strong> {tax.meaning} (e.g. {tax.examples})
              </p>
            );
          })}
        </div>

        {/* Role gating note */}
        {allowedPriorities.length < 4 && (
          <p className="mt-2 text-xs text-amber-700">
            Your role permits a maximum priority of {maxPriorityLabel}.
          </p>
        )}
      </div>

      {/* Target Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Audience Filter</label>
        <select
          {...register('targetFilter')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {TARGET_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Target Roles (multi-select checkboxes) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {ROLE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedTargetRoles.includes(opt.value as TargetRole)}
                onChange={() => handleRoleToggle(opt.value as TargetRole)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to send to all roles matching the audience filter above.
        </p>
      </div>

      {/* Resource Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Attach Supporting Document
        </label>
        {resourcesLoading ? (
          <p className="text-sm text-gray-500">Loading resources...</p>
        ) : (
          <select
            {...register('resourceId')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">None</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.category})
              </option>
            ))}
          </select>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Link a document (e.g. agenda, court document, financial statement) for governance or legal
          notices.
        </p>
      </div>

      {/* Expires At */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expiry Date (optional)
        </label>
        <input
          type="datetime-local"
          {...register('expiresAt')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          If set, this announcement will automatically stop displaying after this date.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          {isEditing && (
            <>
              {!deleteConfirmOpen ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="px-4 py-2 text-red-600 hover:text-red-800 text-sm"
                >
                  Delete Announcement
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Are you sure?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (initialData?.id && onDelete) {
                        const ok = await onDelete(initialData.id);
                        if (ok) toast.success('Announcement deleted');
                      }
                      setDeleteConfirmOpen(false);
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Announcement' : 'Create Announcement'}
          </button>
        </div>
      </div>
    </form>
  );
}

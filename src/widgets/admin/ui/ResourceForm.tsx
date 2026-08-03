'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { toastPromise } from '@shared/lib/hooks';
import { RichTextEditor } from '@shared/ui';
import { z } from 'zod';
import { createComponentLogger } from '@shared/lib';
import { ToastMsg } from '@shared/lib/hooks';
import { apiDelete, apiPatch, apiPost } from '@/shared/api/http-client';

import { CheckCircle, Loader2, Trash2 } from 'lucide-react';
const log = createComponentLogger('ResourceForm');

const resourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum([
    'ARCHITECTURAL',
    'ENGINEERING',
    'GOVERNANCE',
    'BOARD_REPORT',
    'DIY',
    'FINANCIAL',
    'LEGAL',
    'OTHER',
  ]),
  fileUrl: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  externalUrl: z.string().url('Invalid URL').optional().or(z.literal('')).nullable(),
  bodyContent: z.any().optional().nullable(),
  version: z.string().optional().nullable(),
  visibility: z.enum(['ALL_RESIDENTS', 'OWNERS_ONLY', 'BOARD_ONLY', 'COMMITTEE_ONLY']),
  publishedAt: z.string().optional().nullable(),
});

export type ResourceFormData = z.infer<typeof resourceSchema>;

const CATEGORIES = [
  { value: 'ARCHITECTURAL', label: 'Architectural' },
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'GOVERNANCE', label: 'Governance' },
  { value: 'BOARD_REPORT', label: 'Board Report' },
  { value: 'DIY', label: 'DIY' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'OTHER', label: 'Other' },
];

const VISIBILITY_OPTIONS = [
  { value: 'ALL_RESIDENTS', label: 'All Residents' },
  { value: 'OWNERS_ONLY', label: 'Owners Only' },
  { value: 'BOARD_ONLY', label: 'Board Only' },
  { value: 'COMMITTEE_ONLY', label: 'Committee Only' },
];

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/acad',
  'application/dwg',
  'image/vnd.dwg',
];

interface ResourceFormProps {
  initialData?: {
    id?: string;
    title?: string;
    description?: string | null;
    category?: string;
    fileUrl?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
    externalUrl?: string | null;
    bodyContent?: Record<string, unknown> | null;
    version?: string | null;
    visibility?: string;
    publishedAt?: string | null;
  };
}

function getInitialDefaultValues(initialData?: ResourceFormProps['initialData']): ResourceFormData {
  return {
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: (initialData?.category as ResourceFormData['category']) || 'OTHER',
    fileUrl: initialData?.fileUrl || null,
    fileType: initialData?.fileType || null,
    fileSize: initialData?.fileSize || null,
    externalUrl: initialData?.externalUrl || null,
    bodyContent: initialData?.bodyContent || null,
    version: initialData?.version || null,
    visibility: (initialData?.visibility as ResourceFormData['visibility']) || 'ALL_RESIDENTS',
    publishedAt: initialData?.publishedAt
      ? new Date(initialData.publishedAt).toISOString().slice(0, 16)
      : null,
  };
}

export function ResourceForm({ initialData }: ResourceFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: getInitialDefaultValues(initialData),
  });

  const [uploading, setUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Controlled state for date input (type="date" doesn't support partial selection)
  const [publishDateDisplay, setPublishDateDisplay] = useState(
    initialData?.publishedAt ? new Date(initialData.publishedAt).toISOString().slice(0, 10) : ''
  );

  const bodyContent = watch('bodyContent');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx|dwg|xlsx)$/i)) {
      toast.error('Unsupported file type. Allowed: PDF, DOCX, DWG, XLSX');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      setValue('fileUrl', data.url);
      setValue('fileType', file.type || file.name.split('.').pop());
      setValue('fileSize', file.size);
      toast.success('File uploaded successfully');
    } catch (error) {
      log.error({}, 'File upload error', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleBodyContentChange = (content: unknown) => {
    setValue('bodyContent', content);
  };

  const onSubmit = async (data: ResourceFormData) => {
    await toastPromise(
      (async () => {
        const body = {
          ...data,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        };

        if (isEditing) {
          await apiPatch(`/api/resources/${initialData.id}`, body);
        } else {
          await apiPost('/api/resources', body);
        }

        router.push('/admin/resources');
        router.refresh();
      })(),
      {
        loading: isEditing ? 'Updating resource...' : 'Creating resource...',
        success: isEditing ? ToastMsg.updated('Resource') : ToastMsg.created('Resource'),
        error: ToastMsg.failedToSave('resource'),
        component: 'ResourceForm',
      }
    );
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    await toastPromise(
      (async () => {
        await apiDelete(`/api/resources/${initialData.id}`);
        router.push('/admin/resources');
        router.refresh();
      })(),
      {
        loading: 'Deleting resource...',
        success: ToastMsg.deleted('Resource'),
        error: ToastMsg.failedToDelete('resource'),
        component: 'ResourceForm',
      }
    );
    setDeleteConfirmOpen(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('title')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Resource title"
        />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Brief description of the resource"
        />
      </div>

      {/* Category and Visibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register('category')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
          <select
            {...register('visibility')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {VISIBILITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">File Upload</label>
        <div className="flex items-center gap-4">
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.docx,.dwg,.xlsx"
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {uploading && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Allowed: PDF, DOCX, DWG, XLSX</p>
        {watch('fileUrl') && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="text-green-500" />
            <span>File uploaded</span>
            <button
              type="button"
              onClick={() => {
                setValue('fileUrl', null);
                setValue('fileType', null);
                setValue('fileSize', null);
              }}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* External URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          External URL <span className="text-gray-400">(alternative to file upload)</span>
        </label>
        <input
          type="url"
          {...register('externalUrl')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://example.com/document.pdf"
        />
        {errors.externalUrl && (
          <p className="text-red-500 text-sm mt-1">{errors.externalUrl.message}</p>
        )}
      </div>

      {/* Body Content (Tiptap Rich Text Editor) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Body Content <span className="text-gray-400">(optional — for DIY articles)</span>
        </label>
        <RichTextEditor
          content={bodyContent}
          onChange={handleBodyContentChange}
          placeholder="Write additional content here..."
        />
      </div>

      {/* Version */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Version <span className="text-gray-400">(e.g. v2.1, Rev B, April 2026)</span>
        </label>
        <input
          type="text"
          {...register('version')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="v1.0"
        />
      </div>

      {/* Published Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Published Date</label>
        <input
          type="date"
          value={publishDateDisplay}
          onChange={e => {
            const val = e.target.value;
            setPublishDateDisplay(val);
            setValue('publishedAt', val ? val + 'T00:00' : null, { shouldValidate: false });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>{isEditing ? 'Update Resource' : 'Create Resource'}</>
          )}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 className="mr-2" />
            Delete
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push('/admin/resources')}
          className="px-6 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Resource</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this resource? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

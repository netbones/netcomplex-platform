'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createComponentLogger } from '@shared/lib';
import { trpc } from '@api/client';

const log = createComponentLogger('EducationForm');

interface BursaryField {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
}

export function EducationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get('type') || 'bursary';
  const editId = searchParams.get('id');
  const isBursary = type === 'bursary';

  const [fields, setFields] = useState<BursaryField[]>([]);
  const [form, setForm] = useState<{
    title: string;
    funder: string;
    fieldId: string;
    amount: string;
    description: string;
    deadline: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    externalUrl: string;
    provider: string;
    mediaType: 'BOOK' | 'COURSE' | 'JOURNAL' | 'VIDEO';
  }>({
    title: '',
    funder: '',
    fieldId: '',
    amount: '',
    description: '',
    deadline: '',
    status: 'DRAFT',
    externalUrl: '',
    provider: '',
    mediaType: 'COURSE',
  });
  const [saving, setSaving] = useState(false);

  const { data: fieldsData } = trpc.education.listBursaryFields.useQuery() as {
    data?: BursaryField[];
  };
  const { data: bursaryData } = trpc.education.getBursary.useQuery(
    { id: editId ?? '' },
    { enabled: isBursary && !!editId }
  ) as { data?: Record<string, unknown> };
  const { data: resourceData } = trpc.education.getEducationResource.useQuery(
    { id: editId ?? '' },
    { enabled: !isBursary && !!editId }
  ) as { data?: Record<string, unknown> };

  const createBursaryMutation = trpc.education.createBursary.useMutation();
  const updateBursaryMutation = trpc.education.updateBursary.useMutation();
  const createResourceMutation = trpc.education.createEducationResource.useMutation();
  const updateResourceMutation = trpc.education.updateEducationResource.useMutation();

  useEffect(() => {
    if (fieldsData) setFields(fieldsData);
  }, [fieldsData]);

  useEffect(() => {
    if (!editId) return;
    if (isBursary && bursaryData) {
      const d = bursaryData;
      setForm(prev => ({
        ...prev,
        title: (d.title as string) ?? '',
        funder: (d.funder as string) ?? '',
        fieldId: (d.fieldId as string) ?? '',
        amount: (d.amount as string) ?? '',
        description: (d.description as string) ?? '',
        deadline: d.deadline ? new Date(d.deadline as string).toISOString().slice(0, 10) : '',
        status: (d.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') ?? 'DRAFT',
      }));
    }
    if (!isBursary && resourceData) {
      const d = resourceData;
      setForm(prev => ({
        ...prev,
        title: (d.title as string) ?? '',
        provider: (d.provider as string) ?? '',
        mediaType: (d.mediaType as 'BOOK' | 'COURSE' | 'JOURNAL' | 'VIDEO') ?? 'COURSE',
        externalUrl: (d.externalUrl as string) ?? '',
      }));
    }
  }, [editId, isBursary, bursaryData, resourceData]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (isBursary) {
        const payload = {
          title: form.title,
          funder: form.funder,
          fieldId: form.fieldId,
          amount: form.amount,
          description: form.description,
          deadline: form.deadline,
          status: form.status,
        };
        if (editId) {
          await updateBursaryMutation.mutateAsync({ id: editId, ...payload });
        } else {
          await createBursaryMutation.mutateAsync(payload);
        }
      } else {
        const payload = {
          title: form.title,
          provider: form.provider,
          mediaType: form.mediaType,
          externalUrl: form.externalUrl,
        };
        if (editId) {
          await updateResourceMutation.mutateAsync({ id: editId, ...payload });
        } else {
          await createResourceMutation.mutateAsync(payload);
        }
      }
      router.push('/admin/education');
    } catch (err) {
      log.error({}, 'Failed to save education item', err);
    } finally {
      setSaving(false);
    }
  };

  const activeFields = fields.filter(f => f.isActive);
  if (!activeFields.length && isBursary)
    return <div className="p-4 text-gray-500">Loading fields of study...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      {isBursary ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funder</label>
            <input
              value={form.funder}
              onChange={e => setForm({ ...form, funder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
              <select
                value={form.fieldId}
                onChange={e => setForm({ ...form, fieldId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">-- Select --</option>
                {activeFields.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e =>
                  setForm({ ...form, status: e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="R60 000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <input
              value={form.provider}
              onChange={e => setForm({ ...form, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.mediaType}
              onChange={e =>
                setForm({ ...form, mediaType: e.target.value as typeof form.mediaType })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="BOOK">Book</option>
              <option value="COURSE">Course</option>
              <option value="JOURNAL">Journal</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
            <input
              value={form.externalUrl}
              onChange={e => setForm({ ...form, externalUrl: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </>
      )}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => router.push('/admin/education')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

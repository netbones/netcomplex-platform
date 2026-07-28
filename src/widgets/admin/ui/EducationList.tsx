'use client';

import { useState } from 'react';
import { trpc } from '@api/client';

import type { BursaryRow, ResourceRow, EduSettings, TabId } from './education/types';
import { PinTab } from './education/PinTab';
import { BursaryTab } from './education/BursaryTab';
import { ResourceTab } from './education/ResourceTab';
import { ShelfTab } from './education/ShelfTab';

export function EducationList() {
  const [tab, setTab] = useState<TabId>('pin');
  const [searchB, setSearchB] = useState('');
  const [searchR, setSearchR] = useState('');

  const { data: bursaries = [] } = trpc.education.listBursaries.useQuery() as {
    data?: BursaryRow[];
  };
  const { data: resources = [] } = trpc.education.listEducationResources.useQuery() as {
    data?: ResourceRow[];
  };
  const { data: fields = [] } = trpc.education.listBursaryFields.useQuery() as {
    data?: { id: string; value: string; label: string; isActive: boolean }[];
  };
  const {
    data: settings = { pin: { title: '', sub: '', link: '', btn: 'Apply' }, shelf: [] },
    refetch: refetchSettings,
  } = trpc.education.getEducationSettings.useQuery() as {
    data?: EduSettings;
    refetch: () => void;
  };

  const createBursaryMutation = trpc.education.createBursary.useMutation({
    onSuccess: () => refetchBursaries(),
  });
  const updateBursaryMutation = trpc.education.updateBursary.useMutation({
    onSuccess: () => refetchBursaries(),
  });
  const deleteBursaryMutation = trpc.education.deleteBursary.useMutation({
    onSuccess: () => refetchBursaries(),
  });
  const createResourceMutation = trpc.education.createEducationResource.useMutation({
    onSuccess: () => refetchResources(),
  });
  const updateResourceMutation = trpc.education.updateEducationResource.useMutation({
    onSuccess: () => refetchResources(),
  });
  const deleteResourceMutation = trpc.education.deleteEducationResource.useMutation({
    onSuccess: () => refetchResources(),
  });
  const updateSettingsMutation = trpc.education.updateEducationSettings.useMutation({
    onSuccess: () => refetchSettings(),
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _bursaries, refetch: refetchBursaries } =
    trpc.education.listBursaries.useQuery() as {
      data?: BursaryRow[];
      refetch: () => void;
    };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _resources, refetch: refetchResources } =
    trpc.education.listEducationResources.useQuery() as {
      data?: ResourceRow[];
      refetch: () => void;
    };

  const saveBursary = (item: Partial<BursaryRow> & { id?: string }) => {
    if (item.id) {
      updateBursaryMutation.mutate({ ...item, id: item.id } as Parameters<
        typeof updateBursaryMutation.mutate
      >[0]);
    } else {
      createBursaryMutation.mutate({
        title: item.title ?? '',
        funder: item.funder ?? '',
        fieldId: item.fieldId ?? '',
        amount: item.amount ?? '',
        description: item.description ?? '',
        deadline: item.deadline ?? new Date().toISOString(),
        status: (item.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') ?? 'DRAFT',
      } as Parameters<typeof createBursaryMutation.mutate>[0]);
    }
  };

  const toggleBursaryStatus = (b: BursaryRow) => {
    const newStatus = b.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    updateBursaryMutation.mutate({ id: b.id, status: newStatus });
  };

  const deleteBursary = (id: string) => deleteBursaryMutation.mutate({ id });

  const saveResource = (item: Partial<ResourceRow> & { id?: string }) => {
    if (item.id) {
      updateResourceMutation.mutate({ id: item.id, ...item } as Parameters<
        typeof updateResourceMutation.mutate
      >[0]);
    } else {
      createResourceMutation.mutate({
        title: item.title ?? '',
        provider: item.provider,
        externalUrl: item.externalUrl,
        mediaType: item.mediaType,
        featured: item.featured,
        tags: item.tags,
      } as Parameters<typeof createResourceMutation.mutate>[0]);
    }
  };

  const deleteResource = (id: string) => deleteResourceMutation.mutate({ id });

  const saveSettings = (data: EduSettings) => updateSettingsMutation.mutate(data);

  return (
    <div className="adm-root">
      <div className="adm-head">
        <div className="adm-title">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
          </svg>
          Education portal content
        </div>
        <button
          className="adm-icon-btn"
          style={{ width: 'auto', padding: '0 12px', gap: 6, display: 'flex' }}
          onClick={() => window.open('/education', '_blank')}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span style={{ fontSize: 12 }}>Preview live</span>
        </button>
      </div>

      <div className="adm-tabs" role="tablist">
        {(['pin', 'bursaries', 'resources', 'shelf'] as TabId[]).map(t => (
          <button
            key={t}
            className={`adm-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'pin' && 'Pinned'}
            {t === 'bursaries' && 'Bursaries'}
            {t === 'resources' && 'Resources'}
            {t === 'shelf' && 'Gutenberg shelf'}
          </button>
        ))}
      </div>

      {tab === 'pin' && <PinTab settings={settings} onSaveSettings={saveSettings} />}
      {tab === 'bursaries' && (
        <BursaryTab
          bursaries={bursaries}
          fields={fields}
          search={searchB}
          onSearchChange={setSearchB}
          onSave={saveBursary}
          onToggleStatus={toggleBursaryStatus}
          onDelete={deleteBursary}
        />
      )}
      {tab === 'resources' && (
        <ResourceTab
          resources={resources}
          search={searchR}
          onSearchChange={setSearchR}
          onSave={saveResource}
          onDelete={deleteResource}
        />
      )}
      {tab === 'shelf' && <ShelfTab settings={settings} onSaveSettings={saveSettings} />}

      <style>{`
        .adm-root { padding: 1rem 0; font-family: var(--font-sans); }
        .adm-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .adm-title { font-size: 15px; font-weight: 500; color: #111827; display: flex; align-items: center; gap: 8px; }
        .adm-tabs { display: flex; gap: 0; border-bottom: 0.5px solid #e5e7eb; margin-bottom: 1.25rem; }
        .adm-tab { padding: 0.5rem 1rem; font-size: 13px; color: #6b7280; cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .adm-tab.active { color: #4F46E5; border-bottom-color: #4F46E5; font-weight: 500; }
        .adm-toolbar { display: flex; gap: 8px; margin-bottom: 0.75rem; align-items: center; justify-content: space-between; }
        .adm-toolbar input { flex: 1; max-width: 260px; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
        .adm-count { font-size: 12px; color: #6b7280; }
        .adm-row { display: grid; grid-template-columns: 28px 1fr auto auto auto; align-items: center; gap: 10px; padding: 10px 12px; border: 0.5px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px; background: #fafafa; }
        .adm-row-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
        .adm-row-icon.bursary { background: #eef2ff; color: #4F46E5; }
        .adm-row-icon.resource { background: #ecfdf5; color: #059669; }
        .adm-row-body { min-width: 0; }
        .adm-row-title { font-size: 13px; font-weight: 500; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-row-sub { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-status { font-size: 11px; padding: 2px 8px; border-radius: 99px; border: 0.5px solid #e5e7eb; white-space: nowrap; }
        .adm-status.published { color: #059669; background: #ecfdf5; border-color: #a7f3d0; }
        .adm-status.draft { color: #6b7280; background: #f9fafb; }
        .adm-status.expired { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
        .adm-icon-btn { width: 30px; height: 30px; border-radius: 8px; border: 0.5px solid #d1d5db; background: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b7280; }
        .adm-icon-btn:hover { background: #f3f4f6; }
        .adm-icon-btn.danger:hover { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
        .adm-row-actions { display: flex; gap: 6px; }
        .adm-panel { background: #f9fafb; border-radius: 12px; padding: 1rem 1.125rem; margin-bottom: 1.25rem; }
        .adm-panel-label { font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 6px; }
        .adm-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
        .adm-field-row.full { grid-template-columns: 1fr; }
        .adm-field label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 3px; }
        .adm-field input, .adm-field select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: white; }
        .adm-panel-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
        .adm-shelf-manager { display: flex; flex-wrap: wrap; gap: 8px; }
        .adm-shelf-item { display: flex; align-items: center; gap: 8px; border: 0.5px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; background: #fafafa; }
        .adm-shelf-stripe { width: 4px; height: 20px; border-radius: 2px; }
        .adm-shelf-title { font-size: 12px; font-weight: 500; }
        .adm-shelf-remove { cursor: pointer; color: #6b7280; font-size: 16px; line-height: 1; }
        .adm-shelf-remove:hover { color: #dc2626; }
        .adm-shelf-add { display: flex; gap: 6px; align-items: center; border: 0.5px dashed #d1d5db; border-radius: 8px; padding: 6px 10px; }
        .adm-pin-current { border: 2px solid #c7d2fe; border-radius: 12px; padding: 0.875rem 1rem; margin-bottom: 1rem; background: #fafafa; }
        .adm-pin-label { font-size: 11px; background: #eef2ff; color: #4F46E5; border-radius: 4px; padding: 2px 7px; font-weight: 500; display: inline-block; margin-bottom: 8px; }
        .adm-pin-title { font-size: 14px; font-weight: 500; }
        .adm-pin-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .adm-empty { text-align: center; padding: 1.5rem; color: #6b7280; font-size: 13px; }
      `}</style>
    </div>
  );
}

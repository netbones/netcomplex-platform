'use client';

import { useState } from 'react';
import type { ResourceRow } from './types';

export function ResourceTab({
  resources,
  search,
  onSearchChange,
  onSave,
  onDelete,
}: {
  resources: ResourceRow[];
  search: string;
  onSearchChange: (v: string) => void;
  onSave: (item: Partial<ResourceRow> & { id?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<ResourceRow | null>(null);

  const resTypeLabel = (mt: string | null) =>
    mt ? mt.charAt(0) + mt.slice(1).toLowerCase() : 'Link';

  const filtered = resources.filter(
    r =>
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.provider ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="adm-toolbar">
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Filter resources..."
        />
        <span className="adm-count">
          {filtered.length} of {resources.length}
        </span>
        <button
          className="adm-icon-btn"
          style={{ width: 'auto', padding: '0 12px', gap: 4, display: 'flex' }}
          onClick={() =>
            setEditing({
              id: '',
              title: '',
              provider: null,
              externalUrl: null,
              mediaType: 'COURSE',
              featured: false,
              tags: [],
              createdAt: '',
            })
          }
        >
          Add resource
        </button>
      </div>
      {editing && (
        <div className="adm-panel">
          <div className="adm-panel-label">{editing.id ? 'Edit resource' : 'New resource'}</div>
          <div className="adm-field-row">
            <div className="adm-field">
              <label>Title</label>
              <input
                value={editing.title}
                onChange={e => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label>Provider</label>
              <input
                value={editing.provider ?? ''}
                onChange={e => setEditing({ ...editing, provider: e.target.value })}
              />
            </div>
          </div>
          <div className="adm-field-row">
            <div className="adm-field">
              <label>Type</label>
              <select
                value={editing.mediaType ?? ''}
                onChange={e =>
                  setEditing({ ...editing, mediaType: e.target.value as ResourceRow['mediaType'] })
                }
              >
                <option value="BOOK">Book</option>
                <option value="COURSE">Course</option>
                <option value="JOURNAL">Journal</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>
            <div className="adm-field">
              <label>Featured on shelf?</label>
              <input
                type="checkbox"
                checked={editing.featured}
                onChange={e => setEditing({ ...editing, featured: e.target.checked })}
                style={{ width: 'auto', marginTop: 6 }}
              />
            </div>
          </div>
          <div className="adm-field-row full">
            <div className="adm-field">
              <label>Link URL</label>
              <input
                value={editing.externalUrl ?? ''}
                onChange={e => setEditing({ ...editing, externalUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="adm-panel-actions">
            <button
              className="adm-icon-btn"
              style={{ width: 'auto', padding: '0 12px' }}
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              className="adm-icon-btn"
              style={{
                width: 'auto',
                padding: '0 12px',
                background: 'var(--bg-accent)',
                color: 'white',
              }}
              onClick={() => {
                onSave(editing);
                setEditing(null);
              }}
            >
              {editing.id ? 'Save changes' : 'Create resource'}
            </button>
          </div>
        </div>
      )}
      <div>
        {filtered.length ? (
          filtered.map(r => (
            <div key={r.id} className="adm-row">
              <div className="adm-row-icon resource">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
              </div>
              <div className="adm-row-body">
                <div className="adm-row-title">{r.title}</div>
                <div className="adm-row-sub">
                  {r.provider || '—'} · {resTypeLabel(r.mediaType)} {r.featured ? '· Featured' : ''}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {resTypeLabel(r.mediaType)}
              </div>
              <div className="adm-row-actions">
                <button className="adm-icon-btn" onClick={() => setEditing(r)}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <button className="adm-icon-btn danger" onClick={() => onDelete(r.id)}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="adm-empty">
            No resources match. Try a different search or add a new one.
          </div>
        )}
      </div>
    </div>
  );
}

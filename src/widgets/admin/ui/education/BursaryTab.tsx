'use client';

import { useState } from 'react';
import type { BursaryRow, BursaryField } from './types';

export function BursaryTab({
  bursaries,
  fields,
  search,
  onSearchChange,
  onSave,
  onToggleStatus,
  onDelete,
}: {
  bursaries: BursaryRow[];
  fields: BursaryField[];
  search: string;
  onSearchChange: (v: string) => void;
  onSave: (item: Partial<BursaryRow> & { id?: string }) => void;
  onToggleStatus: (b: BursaryRow) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<BursaryRow | null>(null);

  const getFieldLabel = (fieldId: string) => fields.find(f => f.id === fieldId)?.label ?? fieldId;

  const statusBadge = (s: string) => {
    const cls = s === 'PUBLISHED' ? 'published' : s === 'DRAFT' ? 'draft' : 'expired';
    const lbl = s === 'PUBLISHED' ? 'Published' : s === 'DRAFT' ? 'Draft' : 'Expired';
    return <span className={`adm-status ${cls}`}>{lbl}</span>;
  };

  const filtered = bursaries.filter(
    b =>
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.funder.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="adm-toolbar">
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Filter bursaries..."
        />
        <span className="adm-count">
          {filtered.length} of {bursaries.length}
        </span>
        <button
          className="adm-icon-btn"
          style={{ width: 'auto', padding: '0 12px', gap: 4, display: 'flex' }}
          onClick={() =>
            setEditing({
              id: '',
              title: '',
              funder: '',
              fieldId: fields[0]?.id ?? '',
              amount: '',
              description: '',
              applyUrl: null,
              deadline: '',
              status: 'DRAFT',
            })
          }
        >
          Add bursary
        </button>
      </div>
      {editing && (
        <div className="adm-panel">
          <div className="adm-panel-label">{editing.id ? 'Edit bursary' : 'New bursary'}</div>
          <div className="adm-field-row">
            <div className="adm-field">
              <label>Title</label>
              <input
                value={editing.title}
                onChange={e => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label>Funder</label>
              <input
                value={editing.funder}
                onChange={e => setEditing({ ...editing, funder: e.target.value })}
              />
            </div>
          </div>
          <div className="adm-field-row">
            <div className="adm-field">
              <label>Field of study</label>
              <select
                value={editing.fieldId}
                onChange={e => setEditing({ ...editing, fieldId: e.target.value })}
              >
                {fields
                  .filter(f => f.isActive)
                  .map(f => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="adm-field">
              <label>Amount</label>
              <input
                value={editing.amount}
                onChange={e => setEditing({ ...editing, amount: e.target.value })}
                placeholder="e.g. R90 000/yr"
              />
            </div>
          </div>
          <div className="adm-field-row">
            <div className="adm-field">
              <label>Closing date</label>
              <input
                type="date"
                value={editing.deadline ? editing.deadline.slice(0, 10) : ''}
                onChange={e => setEditing({ ...editing, deadline: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label>Status</label>
              <select
                value={editing.status}
                onChange={e =>
                  setEditing({ ...editing, status: e.target.value as BursaryRow['status'] })
                }
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
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
              {editing.id ? 'Save changes' : 'Create bursary'}
            </button>
          </div>
        </div>
      )}
      <div>
        {filtered.length ? (
          filtered.map(b => (
            <div key={b.id} className="adm-row">
              <div className="adm-row-icon bursary">$</div>
              <div className="adm-row-body">
                <div className="adm-row-title">{b.title}</div>
                <div className="adm-row-sub">
                  {b.funder} · {getFieldLabel(b.fieldId)} · {b.amount} · closes{' '}
                  {b.deadline ? new Date(b.deadline).toLocaleDateString('en-ZA') : '—'}
                </div>
              </div>
              {statusBadge(b.status)}
              <div className="adm-row-actions">
                <button className="adm-icon-btn" onClick={() => setEditing(b)}>
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
                <button className="adm-icon-btn" onClick={() => onToggleStatus(b)}>
                  {b.status === 'PUBLISHED' ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <button className="adm-icon-btn danger" onClick={() => onDelete(b.id)}>
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
            No bursaries match. Try a different search or add a new one.
          </div>
        )}
      </div>
    </div>
  );
}

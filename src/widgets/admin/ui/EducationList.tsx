'use client';

import { useState, useEffect, useCallback } from 'react';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('EducationList');

interface BursaryRow {
  id: string;
  title: string;
  funder: string;
  fieldId: string;
  amount: string;
  description: string;
  applyUrl: string | null;
  deadline: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

interface ResourceRow {
  id: string;
  title: string;
  provider: string | null;
  externalUrl: string | null;
  mediaType: 'BOOK' | 'COURSE' | 'JOURNAL' | 'VIDEO' | null;
  featured: boolean;
  tags: string[];
  createdAt: string;
}

interface BursaryField {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
}

interface PinData {
  title: string;
  sub: string;
  link: string;
  btn: string;
}

interface ShelfBook {
  title: string;
  author: string;
  gutId: string;
  stripe: string;
}

interface EduSettings {
  pin: PinData;
  shelf: ShelfBook[];
}

type TabId = 'pin' | 'bursaries' | 'resources' | 'shelf';

const STRIPE_POOL = [
  '#3B6D11',
  '#185FA5',
  '#854F0B',
  '#993556',
  '#534AB7',
  '#993C1D',
  '#0F6E56',
  '#3C3489',
];
const EMPTY_PIN: PinData = { title: '', sub: '', link: '', btn: 'Apply' };

export function EducationList() {
  const [tab, setTab] = useState<TabId>('pin');
  const [bursaries, setBursaries] = useState<BursaryRow[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [fields, setFields] = useState<BursaryField[]>([]);
  const [settings, setSettings] = useState<EduSettings>({ pin: EMPTY_PIN, shelf: [] });
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingBursary, setEditingBursary] = useState<BursaryRow | null>(null);
  const [editingResource, setEditingResource] = useState<ResourceRow | null>(null);
  const [searchB, setSearchB] = useState('');
  const [searchR, setSearchR] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, rRes, fRes, sRes] = await Promise.all([
        fetch('/api/education/bursaries'),
        fetch('/api/education/resources'),
        fetch('/api/education/bursary-fields'),
        fetch('/api/education/settings'),
      ]);
      const bJson = await bRes.json();
      const rJson = await rRes.json();
      const fJson = await fRes.json();
      const sJson = await sRes.json();
      setBursaries(bJson.data ?? []);
      setResources(rJson.data ?? []);
      setFields(fJson.data ?? []);
      setSettings(sJson.data ?? { pin: EMPTY_PIN, shelf: [] });
    } catch (err) {
      log.error({}, 'Failed to fetch education data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getFieldLabel = (fieldId: string) => fields.find(f => f.id === fieldId)?.label ?? fieldId;

  const statusBadge = (s: string) => {
    const cls = s === 'PUBLISHED' ? 'published' : s === 'DRAFT' ? 'draft' : 'expired';
    const lbl = s === 'PUBLISHED' ? 'Published' : s === 'DRAFT' ? 'Draft' : 'Expired';
    return <span className={`adm-status ${cls}`}>{lbl}</span>;
  };

  const resTypeLabel = (mt: string | null) =>
    mt ? mt.charAt(0) + mt.slice(1).toLowerCase() : 'Link';

  // ── Bursary actions ──

  const saveBursary = async (item: Partial<BursaryRow> & { id?: string }) => {
    if (item.id) {
      await fetch(`/api/education/bursaries/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    } else {
      await fetch('/api/education/bursaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    }
    setEditingBursary(null);
    fetchAll();
  };

  const toggleBursaryStatus = async (b: BursaryRow) => {
    const newStatus = b.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    await fetch(`/api/education/bursaries/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchAll();
  };

  const deleteBursary = async (id: string) => {
    await fetch(`/api/education/bursaries/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  // ── Resource actions ──

  const saveResource = async (item: Partial<ResourceRow> & { id?: string }) => {
    if (item.id) {
      await fetch(`/api/education/resources/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    } else {
      await fetch('/api/education/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    }
    setEditingResource(null);
    fetchAll();
  };

  const deleteResource = async (id: string) => {
    await fetch(`/api/education/resources/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  // ── Settings actions ──

  const saveSettings = async (data: EduSettings) => {
    await fetch('/api/education/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSettings(data);
  };

  // ── Pin ──

  const [pinForm, setPinForm] = useState<PinData>(EMPTY_PIN);
  useEffect(() => {
    setPinForm(settings.pin);
  }, [settings.pin]);

  const savePin = () => saveSettings({ ...settings, pin: pinForm });
  const clearPin = () => saveSettings({ ...settings, pin: EMPTY_PIN });

  // ── Shelf ──

  const addShelfItem = () => {
    const title = (document.getElementById('shelf-title') as HTMLInputElement)?.value?.trim();
    const author = (document.getElementById('shelf-author') as HTMLInputElement)?.value?.trim();
    const gutId = (document.getElementById('shelf-gutid') as HTMLInputElement)?.value?.trim();
    if (!title || !gutId) return;
    const newShelf = [
      ...settings.shelf,
      {
        title,
        author: author || 'Unknown',
        gutId,
        stripe: STRIPE_POOL[settings.shelf.length % STRIPE_POOL.length],
      },
    ];
    saveSettings({ ...settings, shelf: newShelf });
  };

  const removeShelfItem = (i: number) => {
    saveSettings({ ...settings, shelf: settings.shelf.filter((_, idx) => idx !== i) });
  };

  if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />;

  const filteredBursaries = bursaries.filter(
    b =>
      !searchB ||
      b.title.toLowerCase().includes(searchB.toLowerCase()) ||
      b.funder.toLowerCase().includes(searchB.toLowerCase())
  );
  const filteredResources = resources.filter(
    r =>
      !searchR ||
      r.title.toLowerCase().includes(searchR.toLowerCase()) ||
      (r.provider ?? '').toLowerCase().includes(searchR.toLowerCase())
  );

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
            onClick={() => {
              setTab(t);
              setEditingBursary(null);
              setEditingResource(null);
            }}
          >
            {t === 'pin' && 'Pinned'}
            {t === 'bursaries' && 'Bursaries'}
            {t === 'resources' && 'Resources'}
            {t === 'shelf' && 'Gutenberg shelf'}
          </button>
        ))}
      </div>

      {/* PIN TAB */}
      {tab === 'pin' && (
        <div>
          <div className="adm-pin-current">
            {settings.pin.title ? (
              <>
                <span className="adm-pin-label">Currently pinned</span>
                <div className="adm-pin-title">{settings.pin.title}</div>
                <div className="adm-pin-sub">{settings.pin.sub}</div>
              </>
            ) : (
              <>
                <span
                  className="adm-pin-label"
                  style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}
                >
                  No pin set
                </span>
                <div className="adm-pin-title" style={{ color: 'var(--text-muted)' }}>
                  No pinned item is showing to residents
                </div>
              </>
            )}
          </div>
          <div className="adm-panel">
            <div className="adm-panel-label">Set pinned item</div>
            <div className="adm-field-row full">
              <div className="adm-field">
                <label>Headline</label>
                <input
                  type="text"
                  value={pinForm.title}
                  onChange={e => setPinForm({ ...pinForm, title: e.target.value })}
                  placeholder="e.g. NSFAS 2026 applications are open"
                />
              </div>
            </div>
            <div className="adm-field-row full">
              <div className="adm-field">
                <label>Subtext</label>
                <input
                  type="text"
                  value={pinForm.sub}
                  onChange={e => setPinForm({ ...pinForm, sub: e.target.value })}
                  placeholder="e.g. All SA citizens at public universities — closes 31 Jan 2026"
                />
              </div>
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label>Link URL</label>
                <input
                  type="text"
                  value={pinForm.link}
                  onChange={e => setPinForm({ ...pinForm, link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="adm-field">
                <label>Button label</label>
                <input
                  type="text"
                  value={pinForm.btn}
                  onChange={e => setPinForm({ ...pinForm, btn: e.target.value })}
                />
              </div>
            </div>
            <div className="adm-panel-actions">
              <button
                className="adm-icon-btn"
                style={{ width: 'auto', padding: '0 12px' }}
                onClick={clearPin}
              >
                Clear pin
              </button>
              <button
                className="adm-icon-btn"
                style={{
                  width: 'auto',
                  padding: '0 12px',
                  background: 'var(--bg-accent)',
                  color: 'white',
                }}
                onClick={savePin}
              >
                Save pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BURSARIES TAB */}
      {tab === 'bursaries' && (
        <div>
          <div className="adm-toolbar">
            <input
              type="text"
              value={searchB}
              onChange={e => setSearchB(e.target.value)}
              placeholder="Filter bursaries..."
            />
            <span className="adm-count">
              {filteredBursaries.length} of {bursaries.length}
            </span>
            <button
              className="adm-icon-btn"
              style={{ width: 'auto', padding: '0 12px', gap: 4, display: 'flex' }}
              onClick={() =>
                setEditingBursary({
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
          {editingBursary && (
            <div className="adm-panel">
              <div className="adm-panel-label">
                {editingBursary.id ? 'Edit bursary' : 'New bursary'}
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Title</label>
                  <input
                    value={editingBursary.title}
                    onChange={e => setEditingBursary({ ...editingBursary, title: e.target.value })}
                  />
                </div>
                <div className="adm-field">
                  <label>Funder</label>
                  <input
                    value={editingBursary.funder}
                    onChange={e => setEditingBursary({ ...editingBursary, funder: e.target.value })}
                  />
                </div>
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Field of study</label>
                  <select
                    value={editingBursary.fieldId}
                    onChange={e =>
                      setEditingBursary({ ...editingBursary, fieldId: e.target.value })
                    }
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
                    value={editingBursary.amount}
                    onChange={e => setEditingBursary({ ...editingBursary, amount: e.target.value })}
                    placeholder="e.g. R90 000/yr"
                  />
                </div>
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Closing date</label>
                  <input
                    type="date"
                    value={editingBursary.deadline ? editingBursary.deadline.slice(0, 10) : ''}
                    onChange={e =>
                      setEditingBursary({ ...editingBursary, deadline: e.target.value })
                    }
                  />
                </div>
                <div className="adm-field">
                  <label>Status</label>
                  <select
                    value={editingBursary.status}
                    onChange={e =>
                      setEditingBursary({
                        ...editingBursary,
                        status: e.target.value as BursaryRow['status'],
                      })
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
                  onClick={() => setEditingBursary(null)}
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
                  onClick={() => saveBursary(editingBursary)}
                >
                  {editingBursary.id ? 'Save changes' : 'Create bursary'}
                </button>
              </div>
            </div>
          )}
          <div>
            {filteredBursaries.length ? (
              filteredBursaries.map(b => (
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
                    <button className="adm-icon-btn" onClick={() => setEditingBursary(b)}>
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
                    <button className="adm-icon-btn" onClick={() => toggleBursaryStatus(b)}>
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
                  <button className="adm-icon-btn danger" onClick={() => deleteBursary(b.id)}>
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
      )}

      {/* RESOURCES TAB */}
      {tab === 'resources' && (
        <div>
          <div className="adm-toolbar">
            <input
              type="text"
              value={searchR}
              onChange={e => setSearchR(e.target.value)}
              placeholder="Filter resources..."
            />
            <span className="adm-count">
              {filteredResources.length} of {resources.length}
            </span>
            <button
              className="adm-icon-btn"
              style={{ width: 'auto', padding: '0 12px', gap: 4, display: 'flex' }}
              onClick={() =>
                setEditingResource({
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
          {editingResource && (
            <div className="adm-panel">
              <div className="adm-panel-label">
                {editingResource.id ? 'Edit resource' : 'New resource'}
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Title</label>
                  <input
                    value={editingResource.title}
                    onChange={e =>
                      setEditingResource({ ...editingResource, title: e.target.value })
                    }
                  />
                </div>
                <div className="adm-field">
                  <label>Provider</label>
                  <input
                    value={editingResource.provider ?? ''}
                    onChange={e =>
                      setEditingResource({ ...editingResource, provider: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Type</label>
                  <select
                    value={editingResource.mediaType ?? ''}
                    onChange={e =>
                      setEditingResource({
                        ...editingResource,
                        mediaType: e.target.value as ResourceRow['mediaType'],
                      })
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
                    checked={editingResource.featured}
                    onChange={e =>
                      setEditingResource({ ...editingResource, featured: e.target.checked })
                    }
                    style={{ width: 'auto', marginTop: 6 }}
                  />
                </div>
              </div>
              <div className="adm-field-row full">
                <div className="adm-field">
                  <label>Link URL</label>
                  <input
                    value={editingResource.externalUrl ?? ''}
                    onChange={e =>
                      setEditingResource({ ...editingResource, externalUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="adm-panel-actions">
                <button
                  className="adm-icon-btn"
                  style={{ width: 'auto', padding: '0 12px' }}
                  onClick={() => setEditingResource(null)}
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
                  onClick={() => saveResource(editingResource)}
                >
                  {editingResource.id ? 'Save changes' : 'Create resource'}
                </button>
              </div>
            </div>
          )}
          <div>
            {filteredResources.length ? (
              filteredResources.map(r => (
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
                      {r.provider || '—'} · {resTypeLabel(r.mediaType)}{' '}
                      {r.featured ? '· Featured' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {resTypeLabel(r.mediaType)}
                  </div>
                  <div className="adm-row-actions">
                    <button className="adm-icon-btn" onClick={() => setEditingResource(r)}>
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
                  <button className="adm-icon-btn danger" onClick={() => deleteResource(r.id)}>
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
      )}

      {/* SHELF TAB */}
      {tab === 'shelf' && (
        <div>
          <div className="adm-panel">
            <div className="adm-panel-label">
              Gutenberg shelf — up to 10 titles shown to residents
            </div>
            <div className="adm-shelf-manager">
              {settings.shelf.map((b, i) => (
                <div key={i} className="adm-shelf-item">
                  <div className="adm-shelf-stripe" style={{ background: b.stripe }} />
                  <div>
                    <div className="adm-shelf-title">{b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {b.author} · #{b.gutId}
                    </div>
                  </div>
                  <span
                    className="adm-shelf-remove"
                    onClick={() => removeShelfItem(i)}
                    style={{ cursor: 'pointer', marginLeft: 8 }}
                  >
                    &times;
                  </span>
                </div>
              ))}
              <div className="adm-shelf-add">
                <input
                  id="shelf-title"
                  type="text"
                  placeholder="Title"
                  style={{ width: 130, fontSize: 12, height: 30 }}
                />
                <input
                  id="shelf-author"
                  type="text"
                  placeholder="Author"
                  style={{ width: 100, fontSize: 12, height: 30 }}
                />
                <input
                  id="shelf-gutid"
                  type="text"
                  placeholder="Gutenberg ID"
                  style={{ width: 90, fontSize: 12, height: 30 }}
                />
                <button className="adm-icon-btn" onClick={addShelfItem}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

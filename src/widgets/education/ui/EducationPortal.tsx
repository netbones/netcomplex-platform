'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSafeTranslation } from '@shared/lib';
import { ErrorBoundary } from '@shared/ui';
import {
  BURSARIES,
  RESOURCES,
  GUTENBERG,
  FIELDS,
  RESOURCE_TYPES,
  deadlineLabel,
  NSFAS_URL,
} from '../data';
import type { Bursary, Resource, EducationTabId } from '@entities/education';

function countClosing(bursaries: Bursary[]): number {
  return bursaries.filter(b => {
    const days = Math.round((new Date(b.deadline).getTime() - Date.now()) / 86400000);
    return days >= 0 && days < 30;
  }).length;
}

function totalFunding(bursaries: Bursary[]): string {
  const total = bursaries.reduce((sum, b) => {
    const num = parseInt(b.amount.replace(/[^0-9]/g, ''));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
  if (total >= 1_000_000) return `R${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `R${(total / 1_000).toFixed(0)}K`;
  return `R${total}`;
}

function BursaryCard({
  bursary,
  isSaved,
  onToggleSave,
  tx,
}: {
  bursary: Bursary;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  tx: (key: string, fallback: string) => string;
}) {
  const dl = deadlineLabel(bursary.deadline);
  const urgent = dl.endsWith('d left');
  const isClosed = dl === 'closed';

  return (
    <div className="edu-card" id={`card-${bursary.id}`}>
      <div className="edu-card-header">
        <div className="edu-card-icon bursary">
          <i className="ti ti-award" aria-hidden="true" />
        </div>
        <div>
          <div className="edu-card-title">{bursary.title}</div>
          <div className="edu-card-org">{bursary.org}</div>
        </div>
      </div>
      <div className="edu-card-desc">{bursary.desc}</div>
      <div className="edu-card-meta">
        <span className="edu-pill">{bursary.field}</span>
        <span
          className={`edu-pill ${urgent ? 'deadline' : isClosed ? '' : bursary.status === 'open' ? 'open' : ''}`}
        >
          {urgent
            ? `⚡ ${dl}`
            : isClosed
              ? tx('card.closed', 'Closed')
              : bursary.status === 'closing'
                ? tx('card.closingSoon', 'Closing soon')
                : dl}
        </span>
      </div>
      <div className="edu-card-footer">
        <div className="edu-card-amount">
          {bursary.amount}
          {bursary.period ? <span> {bursary.period}</span> : null}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="edu-btn-small"
            onClick={() => onToggleSave(bursary.id)}
            aria-label={isSaved ? tx('card.remove', 'Remove') : tx('card.save', 'Save')}
          >
            <i
              className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`}
              aria-hidden="true"
            />
          </button>
          <a href={NSFAS_URL} target="_blank" rel="noopener noreferrer" className="edu-btn-small">
            {tx('card.details', 'Details')} ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({
  resource,
  isSaved,
  onToggleSave,
  tx,
}: {
  resource: Resource;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  tx: (key: string, fallback: string) => string;
}) {
  return (
    <div className="edu-card" id={`card-${resource.id}`}>
      <div className="edu-card-header">
        <div className="edu-card-icon resource">
          <i className="ti ti-book" aria-hidden="true" />
        </div>
        <div>
          <div className="edu-card-title">{resource.title}</div>
          <div className="edu-card-org">{resource.org}</div>
        </div>
      </div>
      <div className="edu-card-desc">{resource.desc}</div>
      <div className="edu-card-meta">
        {resource.tags.map(t => (
          <span key={t} className="edu-pill">
            {t}
          </span>
        ))}
        <span className="edu-pill">{resource.type}</span>
      </div>
      <div className="edu-card-footer">
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <i className="ti ti-lock-open" style={{ fontSize: '13px' }} aria-hidden="true" />{' '}
          {tx('card.freeAccess', 'Free access')}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="edu-btn-small"
            onClick={() => onToggleSave(resource.id)}
            aria-label={isSaved ? tx('card.remove', 'Remove') : tx('card.save', 'Save')}
          >
            <i
              className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`}
              aria-hidden="true"
            />
          </button>
          <a
            href={resource.link}
            target="_blank"
            rel="noopener noreferrer"
            className="edu-btn-small"
          >
            {tx('card.open', 'Open')} <i className="ti ti-external-link" />
          </a>
        </div>
      </div>
    </div>
  );
}

function GutenbergShelf({ tx }: { tx: (key: string, fallback: string) => string }) {
  return (
    <>
      <div className="edu-section-label">
        {tx('shelf.gutenberg', 'Gutenberg classics — free to read')}
      </div>
      <div className="edu-shelf">
        {GUTENBERG.map(book => (
          <a
            key={book.id}
            className="edu-spine"
            href={`https://www.gutenberg.org/ebooks/${book.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title={book.title}
          >
            <div className="edu-spine-stripe" style={{ background: book.stripe }} />
            <div className="edu-spine-title">{book.title}</div>
            <div className="edu-spine-meta">{book.author}</div>
          </a>
        ))}
      </div>
    </>
  );
}

function BursariesTab({
  bursaries,
  saved,
  onToggleSave,
  tx,
}: {
  bursaries: Bursary[];
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  tx: (key: string, fallback: string) => string;
}) {
  const [query, setQuery] = useState('');
  const [field, setField] = useState('');

  const filtered = bursaries.filter(b => {
    const q = query.toLowerCase();
    return (
      (!q ||
        b.title.toLowerCase().includes(q) ||
        b.org.toLowerCase().includes(q) ||
        b.desc.toLowerCase().includes(q)) &&
      (!field || b.field === field)
    );
  });

  return (
    <div>
      <div className="edu-stats">
        <div className="edu-stat">
          <div className="edu-stat-num">{bursaries.length}</div>
          <div className="edu-stat-lbl">{tx('stats.open', 'Open opportunities')}</div>
        </div>
        <div className="edu-stat">
          <div className="edu-stat-num">{totalFunding(bursaries)}</div>
          <div className="edu-stat-lbl">{tx('stats.funding', 'Total funding available')}</div>
        </div>
        <div className="edu-stat">
          <div className="edu-stat-num">{countClosing(bursaries)}</div>
          <div className="edu-stat-lbl">{tx('stats.closing', 'Closing this month')}</div>
        </div>
      </div>

      <div className="edu-featured">
        <span className="edu-featured-badge">{tx('featured.pinned', 'Pinned')}</span>
        <div className="edu-featured-body">
          <div className="edu-featured-title">
            {tx('featured.nsfasTitle', 'NSFAS 2026 applications are open')}
          </div>
          <div className="edu-featured-sub">
            {tx(
              'featured.nsfasDesc',
              'All SA citizens at public universities and TVET colleges — closes 31 Jan 2026'
            )}
          </div>
        </div>
        <div className="edu-featured-action">
          <a href={NSFAS_URL} target="_blank" rel="noopener noreferrer" className="edu-btn-small">
            {tx('card.apply', 'Apply')} <i className="ti ti-external-link" />
          </a>
        </div>
      </div>

      <div className="edu-search">
        <input
          type="text"
          placeholder={tx('search.bursaries', 'Search bursaries...')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select value={field} onChange={e => setField(e.target.value)}>
          <option value="">{tx('filter.allFields', 'All fields')}</option>
          {FIELDS.map(f => (
            <option key={f} value={f}>
              {tx(`filter.field${f}`, f)}
            </option>
          ))}
        </select>
      </div>

      <div className="edu-grid">
        {filtered.length > 0
          ? filtered.map(b => (
              <BursaryCard
                key={b.id}
                bursary={b}
                isSaved={saved.has(b.id)}
                onToggleSave={onToggleSave}
                tx={tx}
              />
            ))
          : null}
      </div>
      {filtered.length === 0 ? (
        <div className="edu-empty">
          <i className="ti ti-mood-confuzed-filled" aria-hidden="true" />
          {tx('empty.bursaries', 'No bursaries match those filters. Try broadening your search.')}
        </div>
      ) : null}
    </div>
  );
}

function ResourcesTab({
  resources,
  saved,
  onToggleSave,
  tx,
}: {
  resources: typeof RESOURCES;
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  tx: (key: string, fallback: string) => string;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');

  const filtered = resources.filter(r => {
    const q = query.toLowerCase();
    return (
      (!q ||
        r.title.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.tags.some(x => x.toLowerCase().includes(q))) &&
      (!type || r.type === type)
    );
  });

  return (
    <div>
      <div className="edu-search">
        <input
          type="text"
          placeholder={tx('search.resources', 'Search textbooks, guides, courses...')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="">{tx('filter.allTypes', 'All types')}</option>
          {RESOURCE_TYPES.map(t => (
            <option key={t} value={t}>
              {tx(`filter.type${t}`, t)}
            </option>
          ))}
        </select>
      </div>

      <GutenbergShelf tx={tx} />

      <div className="edu-section-label">{tx('allResources', 'All resources')}</div>
      <div className="edu-grid">
        {filtered.length > 0
          ? filtered.map(r => (
              <ResourceCard
                key={r.id}
                resource={r}
                isSaved={saved.has(r.id)}
                onToggleSave={onToggleSave}
                tx={tx}
              />
            ))
          : null}
      </div>
      {filtered.length === 0 ? (
        <div className="edu-empty">
          <i className="ti ti-mood-confuzed-filled" aria-hidden="true" />
          {tx('empty.resources', 'No resources match. Try a different search or type.')}
        </div>
      ) : null}
    </div>
  );
}

function SavedTab({
  bursaries,
  resources,
  saved,
  onToggleSave,
  tx,
}: {
  bursaries: Bursary[];
  resources: typeof RESOURCES;
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  tx: (key: string, fallback: string) => string;
}) {
  const savedBursaries = bursaries.filter(b => saved.has(b.id));
  const savedResources = resources.filter(r => saved.has(r.id));

  if (saved.size === 0) {
    return (
      <div className="edu-empty">
        <i className="ti ti-bookmark" aria-hidden="true" />
        {tx(
          'saved.empty',
          'Nothing saved yet. Bookmark bursaries and resources to find them here.'
        )}
      </div>
    );
  }

  return (
    <div>
      {savedBursaries.length > 0 ? (
        <>
          <div className="edu-section-label">{tx('saved.bursaries', 'Saved bursaries')}</div>
          <div className="edu-grid">
            {savedBursaries.map(b => (
              <BursaryCard key={b.id} bursary={b} isSaved onToggleSave={onToggleSave} tx={tx} />
            ))}
          </div>
        </>
      ) : null}
      {savedResources.length > 0 ? (
        <>
          <div className="edu-section-label">{tx('saved.resources', 'Saved resources')}</div>
          <div className="edu-grid">
            {savedResources.map(r => (
              <ResourceCard key={r.id} resource={r} isSaved onToggleSave={onToggleSave} tx={tx} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function EducationPortal() {
  const { tx } = useSafeTranslation('education');
  const [activeTab, setActiveTab] = useState<EducationTabId>('bursaries');
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const savedCountEl = useRef<HTMLSpanElement>(null);

  const toggleSave = useCallback((id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('edu-saved');
      if (stored) setSaved(new Set(JSON.parse(stored)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('edu-saved', JSON.stringify([...saved]));
  }, [saved]);

  return (
    <ErrorBoundary>
      <div className="edu-root">
        <h2 className="sr-only">
          {tx('title', 'Education portal')} —{' '}
          {tx('subtitle', 'Scholarships, bursaries, and free learning resources')}
        </h2>

        <div className="edu-tabs" role="tablist">
          {(['bursaries', 'resources', 'saved'] as EducationTabId[]).map(tab => (
            <button
              key={tab}
              className={`edu-tab${activeTab === tab ? ' active' : ''}`}
              role="tab"
              onClick={() => setActiveTab(tab)}
              aria-selected={activeTab === tab}
            >
              {tab === 'bursaries' ? <i className="ti ti-award" aria-hidden="true" /> : null}
              {tab === 'resources' ? <i className="ti ti-books" aria-hidden="true" /> : null}
              {tab === 'saved' ? <i className="ti ti-bookmark" aria-hidden="true" /> : null}
              {tx(`tabs.${tab}`, tab)}
              {tab === 'saved' && saved.size > 0 ? (
                <span ref={savedCountEl} className="edu-saved-badge">
                  {saved.size}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div
          id="tab-bursaries"
          className="tab-panel"
          style={{ display: activeTab === 'bursaries' ? 'block' : 'none' }}
        >
          <BursariesTab bursaries={BURSARIES} saved={saved} onToggleSave={toggleSave} tx={tx} />
        </div>

        <div
          id="tab-resources"
          className="tab-panel"
          style={{ display: activeTab === 'resources' ? 'block' : 'none' }}
        >
          <ResourcesTab resources={RESOURCES} saved={saved} onToggleSave={toggleSave} tx={tx} />
        </div>

        <div
          id="tab-saved"
          className="tab-panel"
          style={{ display: activeTab === 'saved' ? 'block' : 'none' }}
        >
          <SavedTab
            bursaries={BURSARIES}
            resources={RESOURCES}
            saved={saved}
            onToggleSave={toggleSave}
            tx={tx}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}

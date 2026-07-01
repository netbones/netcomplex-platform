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

interface DbBursary {
  id: string;
  title: string;
  funder: string;
  fieldId: string;
  amount: string;
  description: string;
  applyUrl: string | null;
  deadline: string;
  status: string;
}

interface DbResource {
  id: string;
  title: string;
  provider: string | null;
  externalUrl: string | null;
  mediaType: string | null;
  featured: boolean;
  tags: string[];
  description: string | null;
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

function mapBursary(db: DbBursary, fieldLabel?: string): Bursary {
  return {
    id: db.id,
    title: db.title,
    org: db.funder,
    field: fieldLabel ?? db.fieldId,
    amount: db.amount,
    period: '',
    desc: db.description,
    deadline: db.deadline,
    status: db.status === 'PUBLISHED' ? 'open' : db.status === 'DRAFT' ? 'closing' : 'closed',
  };
}

function mapResource(db: DbResource): Resource {
  return {
    id: db.id,
    title: db.title,
    org: db.provider ?? '',
    type: db.mediaType ? db.mediaType.charAt(0) + db.mediaType.slice(1).toLowerCase() : 'Course',
    desc: db.description ?? '',
    link: db.externalUrl ?? '',
    tags: db.tags,
  };
}

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
          </svg>
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <a href={NSFAS_URL} target="_blank" rel="noopener noreferrer" className="edu-btn-small">
            {tx('card.details', 'Details')}{' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ verticalAlign: '-1px' }}
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>{' '}
          {tx('card.freeAccess', 'Free access')}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="edu-btn-small"
            onClick={() => onToggleSave(resource.id)}
            aria-label={isSaved ? tx('card.remove', 'Remove') : tx('card.save', 'Save')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <a
            href={resource.link}
            target="_blank"
            rel="noopener noreferrer"
            className="edu-btn-small"
          >
            {tx('card.open', 'Open')}{' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ verticalAlign: '-1px' }}
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function GutenbergShelf({
  books,
  tx,
}: {
  books: ShelfBook[];
  tx: (key: string, fallback: string) => string;
}) {
  if (!books.length) return null;
  return (
    <>
      <div className="edu-section-label">
        {tx('shelf.gutenberg', 'Gutenberg classics — free to read')}
      </div>
      <div className="edu-shelf">
        {books.map(book => (
          <a
            key={book.gutId}
            className="edu-spine"
            href={`https://www.gutenberg.org/ebooks/${book.gutId}`}
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
  pin,
  tx,
}: {
  bursaries: Bursary[];
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  pin: PinData | null;
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

      {pin?.title ? (
        <div className="edu-featured">
          <span className="edu-featured-badge">{tx('featured.pinned', 'Pinned')}</span>
          <div className="edu-featured-body">
            <div className="edu-featured-title">{pin.title}</div>
            <div className="edu-featured-sub">{pin.sub}</div>
          </div>
          <div className="edu-featured-action">
            <a
              href={pin.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="edu-btn-small"
            >
              {pin.btn || 'Apply'}
            </a>
          </div>
        </div>
      ) : (
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
              {tx('card.apply', 'Apply')}
            </a>
          </div>
        </div>
      )}

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: 'block', margin: '0 auto 8px' }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 15h8" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
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
  books,
  tx,
}: {
  resources: Resource[];
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  books: ShelfBook[];
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

      <GutenbergShelf books={books} tx={tx} />

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: 'block', margin: '0 auto 8px' }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 15h8" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
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
  resources: Resource[];
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  tx: (key: string, fallback: string) => string;
}) {
  const savedBursaries = bursaries.filter(b => saved.has(b.id));
  const savedResources = resources.filter(r => saved.has(r.id));

  if (saved.size === 0) {
    return (
      <div className="edu-empty">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ display: 'block', margin: '0 auto 8px' }}
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
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
  const [apiBursaries, setApiBursaries] = useState<Bursary[] | null>(null);
  const [apiResources, setApiResources] = useState<Resource[] | null>(null);
  const [shelfBooks, setShelfBooks] = useState<ShelfBook[]>([]);
  const [pin, setPin] = useState<PinData | null>(null);
  const savedCountEl = useRef<HTMLSpanElement>(null);

  const fetchData = useCallback(async () => {
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

      const fields: { id: string; label: string }[] = fJson.data ?? [];
      const fieldMap = new Map(fields.map(f => [f.id, f.label]));

      const rawBursaries = (bJson.data ?? []) as DbBursary[];
      const rawResources = (rJson.data ?? []) as DbResource[];
      const settings = sJson.data ?? {};

      if (rawBursaries.length > 0) {
        setApiBursaries(rawBursaries.map(b => mapBursary(b, fieldMap.get(b.fieldId))));
      }
      if (rawResources.length > 0) {
        setApiResources(rawResources.map(mapResource));
      }
      if (settings.shelf?.length > 0) {
        setShelfBooks(settings.shelf);
      }
      if (settings.pin?.title) {
        setPin(settings.pin);
      }
    } catch {
      /* fall through to static data */
    }
  }, []);

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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    localStorage.setItem('edu-saved', JSON.stringify([...saved]));
  }, [saved]);

  // Use API data if available, fallback to static data
  const bursaries = apiBursaries ?? BURSARIES;
  const resources = apiResources ?? RESOURCES;
  const shelf: ShelfBook[] =
    shelfBooks.length > 0
      ? shelfBooks
      : GUTENBERG.map(g => ({ title: g.title, author: g.author, gutId: g.id, stripe: g.stripe }));

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
              {tab === 'bursaries' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ verticalAlign: '-2px', marginRight: '6px' }}
                >
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              ) : null}
              {tab === 'resources' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ verticalAlign: '-2px', marginRight: '6px' }}
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              ) : null}
              {tab === 'saved' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ verticalAlign: '-2px', marginRight: '6px' }}
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              ) : null}
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
          <BursariesTab
            bursaries={bursaries}
            saved={saved}
            onToggleSave={toggleSave}
            pin={pin}
            tx={tx}
          />
        </div>

        <div
          id="tab-resources"
          className="tab-panel"
          style={{ display: activeTab === 'resources' ? 'block' : 'none' }}
        >
          <ResourcesTab
            resources={resources}
            saved={saved}
            onToggleSave={toggleSave}
            books={shelf}
            tx={tx}
          />
        </div>

        <div
          id="tab-saved"
          className="tab-panel"
          style={{ display: activeTab === 'saved' ? 'block' : 'none' }}
        >
          <SavedTab
            bursaries={bursaries}
            resources={resources}
            saved={saved}
            onToggleSave={toggleSave}
            tx={tx}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}

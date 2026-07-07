'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import Image from 'next/image';
import { usePageLoading } from '@shared/ui';

const log = createComponentLogger('resources-page');

interface ResourceItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  bodyContent: Record<string, unknown> | null;
  version: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryConfig {
  icon: string;
  color: string;
  bg: string;
  border: string;
  cardAccent: string;
  labelKey: string;
  description: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  ARCHITECTURAL: {
    icon: 'fa-building',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    cardAccent: 'bg-blue-500',
    labelKey: 'categories.architectural',
    description: 'Plans, layouts, design standards and building guidelines.',
  },
  ENGINEERING: {
    icon: 'fa-cogs',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-500',
    cardAccent: 'bg-indigo-500',
    labelKey: 'categories.engineering',
    description: 'Infrastructure, utilities and technical specifications.',
  },
  GOVERNANCE: {
    icon: 'fa-landmark',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    cardAccent: 'bg-purple-500',
    labelKey: 'categories.governance',
    description: 'Rules, policies, constitutions and governance documents.',
  },
  BOARD_REPORT: {
    icon: 'fa-file-signature',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-500',
    cardAccent: 'bg-rose-500',
    labelKey: 'categories.boardReport',
    description: 'Board reports and community management updates.',
  },
  DIY: {
    icon: 'fa-tools',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-500',
    cardAccent: 'bg-green-500',
    labelKey: 'categories.diy',
    description: 'Maintenance tips and homeowner guides.',
  },
  FINANCIAL: {
    icon: 'fa-chart-line',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    cardAccent: 'bg-emerald-500',
    labelKey: 'categories.financial',
    description: 'Budgets, statements and financial information.',
  },
  LEGAL: {
    icon: 'fa-gavel',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    cardAccent: 'bg-amber-500',
    labelKey: 'categories.legal',
    description: 'Legal notices, contracts and compliance documents.',
  },
  OTHER: {
    icon: 'fa-folder',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-500',
    cardAccent: 'bg-slate-500',
    labelKey: 'categories.other',
    description: 'Additional resources and reference material.',
  },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG);

function getFileIcon(fileType: string | null): string {
  if (!fileType) return 'fa-file';
  const lower = fileType.toLowerCase();
  if (lower.includes('pdf')) return 'fa-file-pdf';
  if (lower.includes('word') || lower.includes('doc')) return 'fa-file-word';
  if (lower.includes('excel') || lower.includes('xls') || lower.includes('csv'))
    return 'fa-file-excel';
  if (lower.includes('image') || lower.includes('png') || lower.includes('jpg'))
    return 'fa-file-image';
  return 'fa-file';
}

function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourcesPage() {
  const { t } = useTranslation(['common', 'resources']);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: t('nav.home'), href: '/' },
      { label: t('nav.resources'), href: '/resources' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    async function fetchResources() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/resources');
        if (!res.ok) {
          throw new Error(`Failed to fetch resources: ${res.status}`);
        }
        const body = await res.json();
        const data = body?.data ?? body;
        setResources(Array.isArray(data) ? data : []);
      } catch (err) {
        log.error({}, 'Failed to fetch resources', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchResources();
  }, []);

  const filteredResources = useMemo(() => {
    let filtered = resources;
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        r => r.title.toLowerCase().includes(query) || r.description?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [resources, selectedCategory, searchTerm]);

  const groupedResources = useMemo(() => {
    const groups: Record<string, ResourceItem[]> = {};
    for (const resource of filteredResources) {
      if (!groups[resource.category]) {
        groups[resource.category] = [];
      }
      groups[resource.category].push(resource);
    }
    return groups;
  }, [filteredResources]);

  const activeCategoryCount = ALL_CATEGORIES.filter(c =>
    resources.some(r => r.category === c)
  ).length;

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.resources') }]} />

        {/* Gradient Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-10 mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image src="/platform/resources.svg" alt="" width={48} height={48} />
                <h1 className="text-4xl font-bold">{t('resources:title')}</h1>
              </div>
              <p className="text-indigo-100 text-lg max-w-2xl">{t('resources:subtitle')}</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold">{resources.length}</div>
                <div className="text-xs uppercase tracking-wider">Resources</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{activeCategoryCount}</div>
                <div className="text-xs uppercase tracking-wider">Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{filteredResources.length}</div>
                <div className="text-xs uppercase tracking-wider">Showing</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-lg ${
              selectedCategory === 'ALL'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="font-semibold text-sm">{t('resources:filter.all', 'All')}</div>
            <div className="text-xs text-gray-500">{resources.length} resources</div>
          </button>
          {ALL_CATEGORIES.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const count = resources.filter(r => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl border p-4 text-left transition-all hover:shadow-lg ${
                  selectedCategory === cat
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <i className={`fas ${config.icon} ${config.color} text-xl mb-2 block`} />
                <div className="font-semibold text-sm">
                  {t(`resources:${config.labelKey}`, cat)}
                </div>
                <div className="text-xs text-gray-500">{count} resources</div>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="mb-10">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search resources..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
            <p className="text-red-700 font-medium">{t('resources:error.loading')}</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredResources.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <i className="fas fa-folder-open text-gray-400 text-5xl mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t('resources:empty.title', 'No Resources Available')}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {t(
                'resources:empty.description',
                'There are no resources to display yet. Check back later for updates.'
              )}
            </p>
          </div>
        )}

        {/* Resources Grouped by Category */}
        {!loading && !error && filteredResources.length > 0 && (
          <>
            {selectedCategory === 'ALL' ? (
              ALL_CATEGORIES.map(cat => {
                const items = groupedResources[cat];
                if (!items || items.length === 0) return null;
                const config = CATEGORY_CONFIG[cat];
                const label = t(`resources:${config.labelKey}`, cat);
                return (
                  <div
                    key={cat}
                    id={`category-${cat.toLowerCase()}`}
                    className={`rounded-3xl border-l-4 ${config.border} ${config.bg} p-8 mb-10`}
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">
                          <i className={`fas ${config.icon} ${config.color} mr-3`} />
                          {label}
                        </h2>
                        <p className="text-gray-600 mt-2">{config.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-gray-900">{items.length}</div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          Resources
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map(resource => (
                        <ResourceCard
                          key={resource.id}
                          resource={resource}
                          t={t}
                          categoryConfig={config}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className={`rounded-3xl border-l-4 ${CATEGORY_CONFIG[selectedCategory]?.border} ${CATEGORY_CONFIG[selectedCategory]?.bg} p-8 mb-10`}
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      <i
                        className={`fas ${CATEGORY_CONFIG[selectedCategory]?.icon} ${CATEGORY_CONFIG[selectedCategory]?.color} mr-3`}
                      />
                      {t(
                        `resources:${CATEGORY_CONFIG[selectedCategory]?.labelKey}`,
                        selectedCategory
                      )}
                    </h2>
                    <p className="text-gray-600 mt-2">
                      {CATEGORY_CONFIG[selectedCategory]?.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-gray-900">
                      {filteredResources.length}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Resources</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResources.map(resource => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      t={t}
                      categoryConfig={CATEGORY_CONFIG[selectedCategory]}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

import type { TFunction } from 'i18next';

function ResourceCard({
  resource,
  t,
  categoryConfig,
}: {
  resource: ResourceItem;
  t: TFunction<['common', 'resources']>;
  categoryConfig: CategoryConfig;
}) {
  const fileIcon = getFileIcon(resource.fileType);
  const fileSize = formatFileSize(resource.fileSize);

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col">
      <div className={`h-1 w-full ${categoryConfig.cardAccent}`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <i className={`fas ${fileIcon} text-blue-600 text-xl mr-3`}></i>
            <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
          </div>
          <div className="flex gap-1 items-start shrink-0">
            {resource.visibility && resource.visibility !== 'ALL_RESIDENTS' && (
              <span className="bg-amber-100 text-amber-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
                {resource.visibility.replace('_ONLY', '').replace('_', ' ')}
              </span>
            )}
            {resource.version && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
                v{resource.version}
              </span>
            )}
          </div>
        </div>

        {resource.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{resource.description}</p>
        )}

        {resource.fileUrl && (
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            {resource.fileType && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {resource.fileType.toUpperCase()}
              </span>
            )}
            {fileSize && <span>{fileSize}</span>}
          </div>
        )}

        <div className="flex space-x-2 mt-auto pt-3">
          {resource.fileUrl && (
            <a
              href={resource.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 transition-colors text-center"
            >
              <i className="fas fa-download mr-1"></i>
              {t('resources:download', 'Download')}
            </a>
          )}
          {(resource.externalUrl || resource.bodyContent) && (
            <a
              href={resource.externalUrl || `#preview-${resource.id}`}
              target={resource.externalUrl ? '_blank' : undefined}
              rel={resource.externalUrl ? 'noopener noreferrer' : undefined}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm hover:bg-gray-300 transition-colors text-center"
            >
              <i className="fas fa-eye mr-1"></i>
              {t('resources:view', 'View')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

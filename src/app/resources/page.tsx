'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { CARD_ANIMATIONS, createComponentLogger } from '@shared/lib';
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

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; labelKey: string }> = {
  ARCHITECTURAL: {
    icon: 'fa-building',
    color: 'text-blue-600',
    labelKey: 'categories.architectural',
  },
  ENGINEERING: { icon: 'fa-cogs', color: 'text-indigo-600', labelKey: 'categories.engineering' },
  GOVERNANCE: { icon: 'fa-landmark', color: 'text-purple-600', labelKey: 'categories.governance' },
  BOARD_REPORT: {
    icon: 'fa-file-signature',
    color: 'text-red-600',
    labelKey: 'categories.boardReport',
  },
  DIY: { icon: 'fa-tools', color: 'text-green-600', labelKey: 'categories.diy' },
  FINANCIAL: { icon: 'fa-chart-line', color: 'text-emerald-600', labelKey: 'categories.financial' },
  LEGAL: { icon: 'fa-gavel', color: 'text-amber-600', labelKey: 'categories.legal' },
  OTHER: { icon: 'fa-folder', color: 'text-gray-600', labelKey: 'categories.other' },
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
        const data = await res.json();
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
    if (selectedCategory === 'ALL') return resources;
    return resources.filter(r => r.category === selectedCategory);
  }, [resources, selectedCategory]);

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

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.resources') }]} />

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('resources:title')}</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t('resources:subtitle')}</p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('resources:filter.all', 'All')}
          </button>
          {ALL_CATEGORIES.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const count = resources.filter(r => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className={`fas ${config.icon} mr-1`}></i>
                {t(`resources:${config.labelKey}`, cat)} ({count})
              </button>
            );
          })}
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
              // Show all categories with groupings
              ALL_CATEGORIES.map(cat => {
                const items = groupedResources[cat];
                if (!items || items.length === 0) return null;
                const config = CATEGORY_CONFIG[cat];
                return (
                  <div
                    key={cat}
                    id={`category-${cat.toLowerCase()}`}
                    className={`bg-white rounded-lg shadow-lg p-8 mb-8 hover:shadow-xl ${CARD_ANIMATIONS.transition}`}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      <i className={`fas ${config.icon} ${config.color} mr-3`}></i>
                      {t(`resources:${config.labelKey}`, cat)}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map(resource => (
                        <ResourceCard key={resource.id} resource={resource} t={t} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Show single category
              <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  <i className={`fas ${CATEGORY_CONFIG[selectedCategory]?.icon} mr-3`}></i>
                  {t(`resources:${CATEGORY_CONFIG[selectedCategory]?.labelKey}`, selectedCategory)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResources.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} t={t} />
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
}: {
  resource: ResourceItem;
  t: TFunction<['common', 'resources']>;
}) {
  const fileIcon = getFileIcon(resource.fileType);
  const fileSize = formatFileSize(resource.fileSize);

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md hover:scale-[1.02] transition-shadow flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <i className={`fas ${fileIcon} text-blue-600 text-xl mr-3`}></i>
          <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
        </div>
        {resource.version && (
          <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full">
            v{resource.version}
          </span>
        )}
      </div>

      {resource.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{resource.description}</p>
      )}

      {/* File info */}
      {resource.fileUrl && (
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
          {resource.fileType && (
            <span className="bg-gray-100 px-2 py-1 rounded">{resource.fileType.toUpperCase()}</span>
          )}
          {fileSize && <span>{fileSize}</span>}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex space-x-2 mt-auto pt-3">
        {resource.fileUrl && (
          <a
            href={resource.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors text-center"
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
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-300 transition-colors text-center"
          >
            <i className="fas fa-eye mr-1"></i>
            {t('resources:view', 'View')}
          </a>
        )}
      </div>
    </div>
  );
}

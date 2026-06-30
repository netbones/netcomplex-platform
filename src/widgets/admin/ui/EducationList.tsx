'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSafeTranslation } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('EducationList');

interface EducationData {
  bursaries: BursaryItem[];
  resources: ResourceItem[];
}

interface BursaryItem {
  id: string;
  title: string;
  org: string;
  field: string;
  amount: string;
  period: string;
  desc: string;
  deadline: string;
  status: 'open' | 'closing' | 'closed';
}

interface ResourceItem {
  id: string;
  title: string;
  org: string;
  type: string;
  desc: string;
  link: string;
  tags: string[];
}

export function EducationList() {
  const { tx: t } = useSafeTranslation('admin');
  const [data, setData] = useState<EducationData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/education');
      const json = await res.json();
      setData(json.data || { bursaries: [], resources: [] });
    } catch (err) {
      log.error({}, 'Failed to fetch education data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('domains.education', 'Education')} — Bursaries ({data?.bursaries.length ?? 0})
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {t(
            'domains.descriptions.educationBursaries',
            'Manage bursary and scholarship opportunities.'
          )}
        </p>
        <a
          href="/admin/education/new?type=bursary"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('forms.addBursary', 'Add Bursary')}
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('domains.education', 'Education')} — Resources ({data?.resources.length ?? 0})
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {t(
            'domains.descriptions.educationResources',
            'Manage free learning resources, courses, and books.'
          )}
        </p>
        <a
          href="/admin/education/new?type=resource"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('forms.addResource', 'Add Resource')}
        </a>
      </div>
    </div>
  );
}

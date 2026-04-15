'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { MaintenanceForm } from '@features/maintenance';
import { MaintenanceList } from '@widgets/maintenance';
import { MaintenanceRequest } from '@entities/maintenance';
import { usePageLoading } from '@/hooks/usePageLoading';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('maintenance-page');

export function MaintenancePage() {
  const { t } = useTranslation(['common', 'maintenance']);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Maintenance', href: '/maintenance' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch('/api/maintenance');
        const data = await res.json();
        setRequests(data);
      } catch (error) {
        log.error({}, 'Failed to fetch requests', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.maintenance') }]}
          />
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-soralia-primary">{t('maintenance:title')}</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-soralia-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              {showForm ? t('maintenance:viewMyRequests') : t('maintenance:newRequest')}
            </button>
          </div>

          {showForm ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">{t('maintenance:submitNewRequest')}</h2>
                <MaintenanceForm onSubmit={async () => setShowForm(false)} />
              </div>
            </div>
          ) : (
            <MaintenanceList
              requests={requests}
              loading={loading}
              onNewRequest={() => setShowForm(true)}
              t={t}
            />
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
}

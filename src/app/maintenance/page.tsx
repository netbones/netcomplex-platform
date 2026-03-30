'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MaintenanceForm } from '@/components/maintenance/MaintenanceForm';

interface MaintenanceRequest {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function MaintenancePage() {
  const { t } = useTranslation(['common', 'maintenance']);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch('/api/maintenance');
        const data = await res.json();
        setRequests(data);
      } catch (error) {
        console.error('Failed to fetch requests:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  return (
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
          <div>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No maintenance requests yet.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-soralia-primary hover:underline"
                >
                  {t('maintenance:submitFirst')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(request => (
                  <div key={request.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg capitalize">
                          {request.category.replace('_', ' ')}
                        </h3>
                        <p className="text-gray-600 mt-1">{request.description}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Submitted: {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'SUBMITTED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

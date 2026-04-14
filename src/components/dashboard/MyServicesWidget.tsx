'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useApiToast } from '@/hooks/useApiToast';

interface ServiceListing {
  id: string;
  title: string;
  category: string;
  status: string;
  rating: number;
  reviewCount: number;
}

export function MyServicesWidget() {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const { fetch: apiFetch } = useApiToast({ component: 'MyServicesWidget' });
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    apiFetch(
      globalThis
        .fetch(`/api/community-services/listings?providerId=${session.user.id}&limit=5`)
        .then(res => res.json() as Promise<{ listings?: ServiceListing[] }>),
      {
        error: 'Failed to fetch my services',
        onSuccess: (data: { listings?: ServiceListing[] }) => setServices(data.listings || []),
        onError: () => setLoading(false),
      }
    );
  }, [session?.user?.id]);

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-2">
        {services.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <i className="fas fa-briefcase text-2xl mb-2 block"></i>
            <p className="text-sm">No services yet</p>
            <Link
              href="/services/new"
              className="text-indigo-600 text-sm hover:underline mt-2 inline-block"
            >
              Create your first service
            </Link>
          </div>
        ) : (
          <>
            {services.map(service => (
              <Link
                key={service.id}
                href={`/services/${service.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{service.title}</p>
                    <p className="text-xs text-gray-500">{service.category}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      service.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {service.status}
                  </span>
                </div>
                {service.rating > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <i className="fas fa-star text-yellow-500"></i>
                    <span>{service.rating.toFixed(1)}</span>
                    <span>({service.reviewCount} reviews)</span>
                  </div>
                )}
              </Link>
            ))}
            <Link
              href="/services?tab=my-services"
              className="block text-center text-sm text-indigo-600 hover:underline mt-3"
            >
              View all services
            </Link>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { toast } from 'sonner';

interface ServiceInquiry {
  id: string;
  message: string;
  preferredContact: string;
  status: string;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
  };
  inquirer?: {
    name: string;
    avatar?: string;
  };
}

export function ServiceInquiriesWidget() {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInquiries() {
      if (!session?.user?.id) return;
      try {
        const res = await fetch('/api/community-services/inquiries?providerId=' + session.user.id);
        if (res.ok) {
          const data = await res.json();
          setInquiries(data.inquiries || data || []);
        }
      } catch (error) {
        toast.error('Failed to fetch inquiries');
      } finally {
        setLoading(false);
      }
    }
    fetchInquiries();
  }, [session?.user?.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-2">
        {inquiries.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <i className="fas fa-envelope-open-text text-2xl mb-2 block"></i>
            <p className="text-sm">No inquiries yet</p>
          </div>
        ) : (
          <>
            {inquiries.slice(0, 5).map(inquiry => (
              <div
                key={inquiry.id}
                className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-medium">
                    {inquiry.inquirer?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {inquiry.inquirer?.name || 'Anonymous'}
                    </p>
                    {inquiry.listing && (
                      <Link
                        href={`/services/${inquiry.listing.id}`}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {inquiry.listing.title}
                      </Link>
                    )}
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{inquiry.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          inquiry.status === 'NEW'
                            ? 'bg-blue-100 text-blue-700'
                            : inquiry.status === 'REPLIED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {inquiry.status}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(inquiry.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Link
              href="/services?tab=inquiries"
              className="block text-center text-sm text-indigo-600 hover:underline mt-3"
            >
              View all inquiries
            </Link>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

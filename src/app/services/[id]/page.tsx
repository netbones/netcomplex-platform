'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  ServiceTypeBadge,
  CategoryBadge,
  ReviewStars,
  PricingDisplay,
  ServiceListing,
} from '@entities/service';
import { RelatedServices } from '@widgets/service';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('service-detail-page');

interface ServiceInquiryForm {
  message: string;
  preferredContact: 'email' | 'phone';
}

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.id as string;
  const [service, setService] = useState<ServiceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiryForm, setInquiryForm] = useState<ServiceInquiryForm>({
    message: '',
    preferredContact: 'email',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Directory', href: '/directory' },
      { label: 'Services', href: '/directory?tab=services' },
      { label: service?.title || 'Loading...', href: `/services/${serviceId}` },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    async function fetchService() {
      try {
        const res = await fetch(`/api/community-services/listings?id=${serviceId}`);
        if (!res.ok) throw new Error('Service not found');
        const data = await res.json();
        const listing = data.listing || data;
        setService(listing);
      } catch (err) {
        setError('Failed to load service');
      } finally {
        setLoading(false);
      }
    }
    if (serviceId) fetchService();
  }, [serviceId]);

  async function handleSubmitInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiryForm.message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/community-services/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          message: inquiryForm.message,
          preferredContact: inquiryForm.preferredContact,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch (err) {
      log.error({}, 'Failed to send inquiry', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isReady) return LoadingComponent;

  if (loading) {
    return (
      <div className="min-h-screen bg-soralia-light flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading service...</div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-soralia-light flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Service not found'}</p>
          <a href="/directory" className="text-soralia-primary hover:underline">
            Back to Directory
          </a>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Directory', href: '/directory' },
              { label: 'Services', href: '/directory?tab=services' },
              { label: service.title },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero Image */}
              <div className="relative h-64 md:h-80 bg-gray-200 rounded-lg overflow-hidden">
                {service.images?.[0] ? (
                  <Image
                    src={service.images[0]}
                    alt={service.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                    <div className="text-center">
                      <i className="fas fa-tools text-4xl text-indigo-400 mb-2"></i>
                      <p className="text-indigo-600">No image available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Service Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <ServiceTypeBadge type={service.verified ? 'THIRD_PARTY' : 'MEMBER'} />
                      {service.category && <CategoryBadge category={service.category} />}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {service.title}
                    </h1>
                  </div>
                  <div className="text-right">
                    <ReviewStars rating={service.rating} />
                    <p className="text-sm text-gray-500">({service.reviewCount} reviews)</p>
                  </div>
                </div>

                <p className="text-gray-600 whitespace-pre-wrap">{service.description}</p>

                {/* Service Areas */}
                {service.serviceAreas?.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-gray-900 mb-2">Service Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {service.serviceAreas.map((area, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pricing Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <PricingDisplay
                  priceType={service.priceType}
                  price={service.price}
                  currency={service.currency}
                />
              </div>

              {/* Provider Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Service Provider</h3>
                {service.provider ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-soralia-primary/20 flex items-center justify-center">
                      {service.provider.avatar ? (
                        <Image
                          src={service.provider.avatar}
                          alt={service.provider.name || 'Provider'}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-soralia-primary font-semibold">
                          {(service.provider.name || 'P').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {service.provider.name || 'Provider'}
                      </p>
                      {service.verified && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <i className="fas fa-check-circle"></i> Verified Provider
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Provider information not available</p>
                )}
              </div>

              {/* Inquiry Form */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Send Inquiry</h3>
                {submitted ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-check text-green-600"></i>
                    </div>
                    <p className="text-gray-600">Your inquiry has been sent!</p>
                    <p className="text-sm text-gray-500 mt-1">The provider will respond soon.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitInquiry} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Message
                      </label>
                      <textarea
                        value={inquiryForm.message}
                        onChange={e => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
                        placeholder="Describe what you need..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Contact
                      </label>
                      <select
                        value={inquiryForm.preferredContact}
                        onChange={e =>
                          setInquiryForm({
                            ...inquiryForm,
                            preferredContact: e.target.value as 'email' | 'phone',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !inquiryForm.message.trim()}
                      className="w-full bg-soralia-primary text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Sending...' : 'Send Inquiry'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <RelatedServices serviceId={serviceId} />
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}

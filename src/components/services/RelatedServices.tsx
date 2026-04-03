'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ServiceListing } from './ServiceCard';
import { ReviewStars } from './ReviewStars';
import { PricingDisplay } from './PricingDisplay';

interface RelatedServicesProps {
  serviceId: string;
}

export function RelatedServices({ serviceId }: RelatedServicesProps) {
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      try {
        const res = await fetch(
          `/api/community-services/listings/related?serviceId=${serviceId}&limit=4`
        );
        if (res.ok) {
          const data = await res.json();
          setServices(data.relatedServices || []);
        }
      } catch (error) {
        console.error('Failed to fetch related services:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRelated();
  }, [serviceId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
            <div className="h-32 bg-gray-200 rounded mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Services</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map(service => (
          <Link
            key={service.id}
            href={`/services/${service.id}`}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 block"
          >
            <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
              {service.images?.[0] ? (
                <img
                  src={service.images[0]}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <i className="fas fa-image text-2xl"></i>
                </div>
              )}
            </div>
            <h3 className="font-medium text-gray-900 truncate">{service.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <ReviewStars rating={service.rating} />
              <span className="text-sm text-gray-500">({service.reviewCount || 0})</span>
            </div>
            {service.price && (
              <div className="mt-2">
                <PricingDisplay
                  priceType={service.priceType}
                  price={service.price}
                  currency={service.currency}
                />
              </div>
            )}
            {service.provider?.name && (
              <p className="text-sm text-gray-500 mt-2 truncate">
                <i className="fas fa-user mr-1"></i>
                {service.provider.name}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

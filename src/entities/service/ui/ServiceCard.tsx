'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ServiceTypeBadge } from './ServiceTypeBadge';
import { CategoryBadge } from './CategoryBadge';
import { ReviewStars } from './ReviewStars';
import { PricingDisplay } from './PricingDisplay';

import { CheckCircle, Wrench } from 'lucide-react';
export interface ServiceListing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priceType: 'FIXED' | 'HOURLY' | 'QUOTE' | 'FREE';
  price?: number;
  currency: string;
  serviceAreas: string[];
  images: string[];
  verified: boolean;
  rating: number;
  reviewCount: number;
  provider?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
  isPublished: boolean;
  slug?: string;
  createdAt: string;
}

interface ServiceCardProps {
  service: ServiceListing;
  onInquiry?: (serviceId: string) => void;
}

export function ServiceCard({ service, onInquiry }: ServiceCardProps) {
  const [imageError, setImageError] = useState(false);

  const getServiceType = () => {
    const email = service.provider?.email || '';
    if (email.includes('hoa') || email.includes('admin')) {
      return 'COMMUNITY';
    }
    if (service.verified && email.includes('@')) {
      return 'THIRD_PARTY';
    }
    return 'MEMBER';
  };

  const handleInquiry = () => {
    if (onInquiry) {
      onInquiry(service.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Service  */}
      <div className="relative h-48 bg-gray-200">
        {service.images?.[0] && !imageError ? (
          <Image
            src={service.images[0]}
            alt={service.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
            <div className="text-center">
              <Wrench className="text-3xl text-indigo-400 mb-2" />
              <p className="text-sm text-indigo-600">Service </p>
            </div>
          </div>
        )}

        {/* Service Type Badge */}
        <div className="absolute top-3 left-3">
          <ServiceTypeBadge type={getServiceType()} />
        </div>

        {/* Verified Badge */}
        {service.verified && (
          <div className="absolute top-3 right-3">
            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <CheckCircle />
              <span>Verified</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Title and Rating */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">
            {service.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ReviewStars rating={service.rating} size="sm" />
            <span className="text-sm text-gray-600">({service.reviewCount})</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{service.description}</p>

        {/* Categories */}
        <div className="flex flex-wrap gap-1 mb-3">
          <CategoryBadge category={service.category} />
          {service.subcategory && (
            <CategoryBadge category={service.subcategory} variant="secondary" />
          )}
        </div>

        {/* Provider Info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            {service.provider?.avatar ? (
              <Image
                src={service.provider.avatar}
                alt={service.provider.name || 'Provider'}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-indigo-600">
                {(service.provider?.name || 'P').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {service.provider?.name || 'Provider'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {service.serviceAreas?.[0] || 'Local Area'}
            </p>
          </div>
        </div>

        {/* Pricing and Actions */}
        <div className="flex items-center justify-between">
          <PricingDisplay
            priceType={service.priceType}
            price={service.price}
            currency={service.currency}
          />

          <div className="flex gap-2">
            <Link
              href={`/services/${service.id}`}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
            >
              View
            </Link>
            <button
              onClick={handleInquiry}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
            >
              Inquire
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

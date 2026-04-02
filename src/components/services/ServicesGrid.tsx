'use client';

import { ServiceCard, ServiceListing } from './ServiceCard';

interface ServicesGridProps {
  services: ServiceListing[];
  viewMode?: 'grid' | 'list';
  onInquiry?: (serviceId: string) => void;
}

export function ServicesGrid({ services, viewMode = 'grid', onInquiry }: ServicesGridProps) {
  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <i className="fas fa-tools text-6xl text-gray-300"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
        <p className="text-gray-600">
          Try adjusting your search criteria or check back later for new services.
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {services.map(service => (
          <div key={service.id} className="bg-white rounded-lg shadow-md p-4">
            <ServiceCard service={service} onInquiry={onInquiry} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map(service => (
        <ServiceCard key={service.id} service={service} onInquiry={onInquiry} />
      ))}
    </div>
  );
}

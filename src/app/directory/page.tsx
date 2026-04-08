'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DirectoryGrid } from '@/components/directory';
import { ServicesGrid } from '@/components/services';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { usePageLoading } from '@/hooks/usePageLoading';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useResidentFilter } from '@/hooks/useResidentFilter';
import { useServiceFilter } from '@/hooks/useServiceFilter';
import { STREETS } from '@/lib/constants';

export default function DirectoryPage() {
  const { t } = useTranslation(['common', 'directory']);
  const [activeTab, setActiveTab] = useState<'residents' | 'services'>('residents');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use hook for residents (same filters as home page)
  const {
    residents,
    loading: residentsLoading,
    searchQuery: residentsSearch,
    filterType,
    filterStreet,
    page: residentsPage,
    total: residentsTotal,
    limit: residentsLimit,
    viewMode,
    setSearchQuery: setResidentsSearch,
    setFilterType,
    setFilterStreet,
    setPage: setResidentsPage,
    setViewMode,
    filteredCount: residentsFilteredCount,
  } = useResidentFilter({ defaultLimit: 12 });

  // Use hook for services (alias viewMode to avoid conflict)
  const {
    services,
    loading: servicesLoading,
    searchQuery: servicesSearch,
    category,
    serviceType,
    verifiedOnly,
    page: servicesPage,
    total: servicesTotal,
    limit: servicesLimit,
    viewMode: servicesViewMode,
    setSearchQuery: setServicesSearch,
    setCategory: setServiceCategory,
    setServiceType: setServiceTypeFilter,
    setVerifiedOnly,
    setPage: setServicesPage,
    setViewMode: setServicesViewMode,
  } = useServiceFilter({ defaultLimit: 12 });

  const loading = activeTab === 'residents' ? residentsLoading : servicesLoading;

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Directory', href: '/directory' },
    ],
    { additionalLoading: loading }
  );

  if (!isReady || !mounted) {
    return LoadingComponent;
  }

  const handleServiceInquiry = (serviceId: string) => {
    // TODO: Implement service inquiry modal or redirect to service detail page
    console.log('Inquiring about service:', serviceId);
  };

  const renderTabContent = () => {
    if (activeTab === 'residents') {
      return (
        <>
          {/* Residents Search and Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={residentsSearch}
              onChange={e => setResidentsSearch(e.target.value)}
              className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            />

            <div className="flex flex-wrap items-center gap-4">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-soralia-primary"
              >
                <option>All Residents</option>
                <option>Board Members</option>
                <option>Committee Members</option>
                <option>Renters</option>
                <option>Owners</option>
              </select>

              <select
                value={filterStreet}
                onChange={e => setFilterStreet(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-soralia-primary"
              >
                <option>All Streets</option>
                {STREETS.map(street => (
                  <option key={street}>{street}</option>
                ))}
              </select>
            </div>
          </div>

          {residentsLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading residents...</p>
            </div>
          ) : (
            <DirectoryGrid residents={residents} viewMode={viewMode} />
          )}

          {residentsTotal > residentsLimit && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setResidentsPage(p => Math.max(1, p - 1))}
                disabled={residentsPage === 1}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {residentsPage} of {Math.ceil(residentsTotal / residentsLimit)}
              </span>
              <button
                onClick={() => setResidentsPage(p => p + 1)}
                disabled={residentsPage >= Math.ceil(residentsTotal / residentsLimit)}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        {/* Services Search and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search services..."
            value={servicesSearch}
            onChange={e => setServicesSearch(e.target.value)}
            className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          />

          <div className="flex flex-wrap items-center gap-4">
            <select
              value={category}
              onChange={e => setServiceCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            >
              <option value="ALL">All Categories</option>
              <option value="GARDENING">Gardening</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="CLEANING">Cleaning</option>
              <option value="SECURITY">Security</option>
              <option value="PEST_CONTROL">Pest Control</option>
              <option value="APPLIANCE_REPAIR">Appliance Repair</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={serviceType}
              onChange={e => setServiceTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            >
              <option value="ALL">All Types</option>
              <option value="COMMUNITY">Community Services</option>
              <option value="MEMBER">Member Services</option>
              <option value="THIRD_PARTY">Trusted Providers</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={e => setVerifiedOnly(e.target.checked)}
                className="rounded border-gray-300 text-soralia-primary focus:ring-soralia-primary"
              />
              <span className="text-sm text-gray-700">Verified Only</span>
            </label>
          </div>
        </div>

        {servicesLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading services...</p>
          </div>
        ) : (
          <ServicesGrid
            services={services}
            viewMode={servicesViewMode}
            onInquiry={handleServiceInquiry}
          />
        )}

        {servicesTotal > servicesLimit && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setServicesPage(p => Math.max(1, p - 1))}
              disabled={servicesPage === 1}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {servicesPage} of {Math.ceil(servicesTotal / servicesLimit)}
            </span>
            <button
              onClick={() => setServicesPage(p => p + 1)}
              disabled={servicesPage >= Math.ceil(servicesTotal / servicesLimit)}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.directory') }]}
          />
          <h1 className="text-4xl font-bold text-soralia-primary mb-8">{t('directory:title')}</h1>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-8">
            <button
              onClick={() => setActiveTab('residents')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'residents'
                  ? 'border-soralia-primary text-soralia-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-users mr-2"></i>
              Residents
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'services'
                  ? 'border-soralia-primary text-soralia-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-tools mr-2"></i>
              Services
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">View:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${
                  viewMode === 'grid'
                    ? 'bg-soralia-primary text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                aria-label="Grid view"
              >
                <i className="fas fa-th-large" aria-hidden="true"></i>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${
                  viewMode === 'list'
                    ? 'bg-soralia-primary text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                aria-label="List view"
              >
                <i className="fas fa-list" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          {renderTabContent()}
        </div>
      </main>
    </ErrorBoundary>
  );
}

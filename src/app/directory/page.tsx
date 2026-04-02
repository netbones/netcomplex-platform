'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DirectoryGrid } from '@/components/directory';
import { ServicesGrid } from '@/components/services';
import { type Resident } from '@/components/shared';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { STREETS } from '@/lib/constants';
import { usePageLoading } from '@/hooks/usePageLoading';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ServiceListing } from '@/components/services/ServiceCard';

export default function DirectoryPage() {
  const { t } = useTranslation(['common', 'directory']);
  const [activeTab, setActiveTab] = useState<'residents' | 'services'>('residents');

  // Residents state
  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentsSearch, setResidentsSearch] = useState('');
  const [residentsPage, setResidentsPage] = useState(1);
  const [residentsTotal, setResidentsTotal] = useState(0);
  const [filterType, setFilterType] = useState('All Residents');
  const [filterStreet, setFilterStreet] = useState('All Streets');

  // Services state
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesSearch, setServicesSearch] = useState('');
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [serviceCategory, setServiceCategory] = useState('ALL');
  const [serviceType, setServiceType] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const limit = 12; // Increased for services

  const loading = activeTab === 'residents' ? residentsLoading : servicesLoading;

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Directory', href: '/directory' },
    ],
    { additionalLoading: loading }
  );

  // Fetch residents
  useEffect(() => {
    if (activeTab !== 'residents') return;

    async function fetchResidents() {
      try {
        setResidentsLoading(true);
        const params = new URLSearchParams();
        if (residentsSearch) params.set('search', residentsSearch);
        if (filterStreet !== 'All Streets') params.set('street', filterStreet);
        params.set('page', String(residentsPage));
        params.set('limit', String(limit));

        if (filterType !== 'All Residents') {
          const filterValue = filterType.replace(' Members', '').replace('s', '');
          if (filterValue === 'Board') {
            params.set('role', 'BOARD');
          } else if (filterValue === 'Committee') {
            params.set('role', 'COMMITTEE');
          } else if (filterValue === 'Owner') {
            params.set('residentType', 'OWNER');
          } else if (filterValue === 'Renter') {
            params.set('residentType', 'RENTER');
          }
        }

        const res = await fetch(`/api/users?${params}`);
        const data = await res.json();
        if (data.users) {
          setResidents(data.users);
          setResidentsTotal(data.total || 0);
        } else if (Array.isArray(data)) {
          setResidents(data);
          setResidentsTotal(data.length);
        } else {
          setResidents([]);
        }
      } catch (error) {
        console.error('Failed to fetch residents:', error);
      } finally {
        setResidentsLoading(false);
      }
    }

    const debounce = setTimeout(fetchResidents, residentsSearch ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [activeTab, residentsSearch, filterStreet, filterType, residentsPage]);

  // Fetch services
  useEffect(() => {
    if (activeTab !== 'services') return;

    async function fetchServices() {
      try {
        setServicesLoading(true);
        const params = new URLSearchParams();
        if (servicesSearch) params.set('search', servicesSearch);
        if (serviceCategory !== 'ALL') params.set('category', serviceCategory);
        if (verifiedOnly) params.set('verified', 'true');
        params.set('page', String(servicesPage));
        params.set('limit', String(limit));

        const res = await fetch(`/api/community-services/listings?${params}`);
        const data = await res.json();
        setServices(data.listings || []);
        setServicesTotal(data.pagination?.total || 0);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setServicesLoading(false);
      }
    }

    const debounce = setTimeout(fetchServices, servicesSearch ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [activeTab, servicesSearch, serviceCategory, verifiedOnly, servicesPage]);

  if (!isReady) {
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

          {residentsTotal > limit && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setResidentsPage(p => Math.max(1, p - 1))}
                disabled={residentsPage === 1}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {residentsPage} of {Math.ceil(residentsTotal / limit)}
              </span>
              <button
                onClick={() => setResidentsPage(p => p + 1)}
                disabled={residentsPage >= Math.ceil(residentsTotal / limit)}
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
              value={serviceCategory}
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
              onChange={e => setServiceType(e.target.value)}
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
          <ServicesGrid services={services} viewMode={viewMode} onInquiry={handleServiceInquiry} />
        )}

        {servicesTotal > limit && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setServicesPage(p => Math.max(1, p - 1))}
              disabled={servicesPage === 1}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {servicesPage} of {Math.ceil(servicesTotal / limit)}
            </span>
            <button
              onClick={() => setServicesPage(p => p + 1)}
              disabled={servicesPage >= Math.ceil(servicesTotal / limit)}
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

'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@api/client';
import { ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { Plus, MessageSquare, Briefcase, Clock, ExternalLink } from 'lucide-react';

const log = createComponentLogger('MyServicesManager');

type Tab = 'listings' | 'inquiries' | 'requested';

interface ServiceListing {
  id: string;
  title: string;
  category: string;
  status: string;
  isPublished: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

interface ServiceInquiry {
  id: string;
  listingId: string;
  listingTitle?: string;
  description: string;
  status: string;
  inquirerName?: string;
  createdAt: string;
}

interface PersonalInquiry {
  id: string;
  listingId: string;
  listingTitle?: string;
  description: string;
  status: string;
  providerName?: string;
  providerResponse?: string;
  createdAt: string;
}

export function MyServicesManager() {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([]);
  const [personalInquiries, setPersonalInquiries] = useState<PersonalInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    priceType: 'FREE',
    price: '',
    serviceAreas: '',
    contactMethods: 'PLATFORM_MESSAGE',
  });

  const categories = [
    'TUTORING',
    'PET_CARE',
    'CHILDCARE',
    'TRANSPORT',
    'HEALTH_WELLNESS',
    'TECHNOLOGY',
    'CREATIVE_ARTS',
    'HOME_HELP',
    'LEGAL_FINANCIAL',
    'OTHER',
  ];

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchData();
  }, [session?.user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listingsRes, inquiriesRes, personalRes] = await Promise.all([
        fetch(`/api/community-services/listings?providerId=${session?.user?.id}&limit=50`),
        fetch(`/api/community-services/provider/inquiries/${session?.user?.id}`),
        fetch(`/api/community-services/inquiries?inquirerId=${session?.user?.id}`),
      ]);

      const listingsData = await listingsRes.json();
      const inquiriesData = await inquiriesRes.json();
      const personalData = await personalRes.json();

      setListings(listingsData?.data?.listings ?? []);
      setInquiries(inquiriesData?.data?.inquiries ?? []);
      setPersonalInquiries(personalData?.data?.inquiries ?? []);
    } catch (err) {
      log.error({}, 'Failed to fetch my services data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!formData.title.trim() || !formData.description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/community-services/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priceType: formData.priceType,
          price: formData.price ? formData.price.replace(/[^0-9.]/g, '') : null,
          serviceAreas: formData.serviceAreas
            ? formData.serviceAreas.split(',').map((s: string) => s.trim())
            : [],
          contactMethods: [formData.contactMethods],
        }),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          category: 'OTHER',
          priceType: 'FREE',
          price: '',
          serviceAreas: '',
          contactMethods: 'PLATFORM_MESSAGE',
        });
        fetchData();
      }
    } catch (err) {
      log.error({}, 'Failed to create listing', err);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Plus; count?: number }[] = [
    { id: 'listings', label: 'My Listings', icon: Briefcase, count: listings.length },
    {
      id: 'inquiries',
      label: 'Inquiries Received',
      icon: MessageSquare,
      count: inquiries.length,
    },
    { id: 'requested', label: 'Services Requested', icon: Clock, count: personalInquiries.length },
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="rounded-lg border border-gray-200 bg-white">
        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {(tab.count ?? 0) > 0 && (
                <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'listings' && (
            <ListingsTab
              listings={listings}
              showCreateForm={showCreateForm}
              setShowCreateForm={setShowCreateForm}
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              submitting={submitting}
              handleCreateListing={handleCreateListing}
            />
          )}
          {activeTab === 'inquiries' && <InquiriesTab inquiries={inquiries} />}
          {activeTab === 'requested' && <PersonalInquiriesTab inquiries={personalInquiries} />}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function ListingsTab({
  listings,
  showCreateForm,
  setShowCreateForm,
  formData,
  setFormData,
  categories,
  submitting,
  handleCreateListing,
}: {
  listings: ServiceListing[];
  showCreateForm: boolean;
  setShowCreateForm: (v: boolean) => void;
  formData: {
    title: string;
    description: string;
    category: string;
    priceType: string;
    price: string;
    serviceAreas: string;
    contactMethods: string;
  };
  setFormData: (data: typeof formData) => void;
  categories: string[];
  submitting: boolean;
  handleCreateListing: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-900">Your Service Listings</h3>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Service
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">New Service Listing</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Professional Plumbing Services"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your service..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Price Type</label>
                <select
                  value={formData.priceType}
                  onChange={e => setFormData({ ...formData, priceType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="FREE">Free</option>
                  <option value="FIXED">Fixed Price</option>
                  <option value="HOURLY">Hourly Rate</option>
                  <option value="QUOTE">Quote Required</option>
                </select>
              </div>
            </div>
            {formData.priceType !== 'FREE' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Price ({formData.priceType === 'HOURLY' ? 'per hour' : ''})
                </label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="e.g. 500 or R500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreateListing}
                disabled={submitting || !formData.title.trim() || !formData.description.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Listing'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {listings.length === 0 && !showCreateForm ? (
        <div className="text-center py-8 text-gray-500">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No service listings yet</p>
          <p className="text-xs mt-2">
            Create a service listing via the community services directory.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map(listing => (
            <Link
              key={listing.id}
              href={`/services/${listing.id}`}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-indigo-200 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                  {listing.title}
                </p>
                <p className="text-xs text-gray-500">
                  {listing.category.replace(/_/g, ' ')} &middot;{' '}
                  {listing.isPublished ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                {listing.rating > 0 && (
                  <span>
                    {'★'.repeat(Math.round(listing.rating))} ({listing.reviewCount})
                  </span>
                )}
                <span
                  className={`px-2 py-1 rounded-full ${
                    listing.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : listing.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {listing.status}
                </span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function InquiriesTab({ inquiries }: { inquiries: ServiceInquiry[] }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900">Inquiries About Your Services</h3>
      {inquiries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No inquiries received yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inquiry: ServiceInquiry) => (
            <div key={inquiry.id} className="p-3 rounded-lg border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {inquiry.inquirerName || 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{inquiry.description}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    inquiry.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : inquiry.status === 'RESPONDED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {inquiry.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonalInquiriesTab({ inquiries }: { inquiries: PersonalInquiry[] }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900">Services You Have Requested</h3>
      {inquiries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No services requested yet</p>
          <p className="text-xs mt-2">Browse the community services directory to find providers.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inquiry: PersonalInquiry) => (
            <div key={inquiry.id} className="p-3 rounded-lg border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {inquiry.listingTitle || 'Service'}
                    {inquiry.providerName && (
                      <span className="text-gray-500 font-normal">
                        {' '}
                        &middot; {inquiry.providerName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{inquiry.description}</p>
                  {inquiry.providerResponse && (
                    <p className="text-xs text-green-600 mt-1 bg-green-50 px-2 py-1 rounded">
                      Response: {inquiry.providerResponse}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    inquiry.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : inquiry.status === 'RESPONDED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {inquiry.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyServicesManager;

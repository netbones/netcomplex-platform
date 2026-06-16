'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authClient } from '@api/client';
import { ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { Plus, MessageSquare, Briefcase, Clock, ExternalLink } from 'lucide-react';

const log = createComponentLogger('MyServicesManager');

type Tab = 'listings' | 'inquiries' | 'requested';

interface ServiceListing {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  isPublished: boolean;
  priceType?: string;
  price?: string | number;
  serviceAreas?: string[];
  contactMethods?: string[];
  images?: string[];
  locale?: string;
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
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([]);
  const [personalInquiries, setPersonalInquiries] = useState<PersonalInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    priceType: 'FREE',
    price: '',
    serviceAreas: '',
    contactMethods: 'PLATFORM_MESSAGE',
    images: [] as string[],
    locale: 'en',
  });

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'af', label: 'Afrikaans' },
    { code: 'zu', label: 'isiZulu' },
    { code: 'xh', label: 'isiXhosa' },
  ];

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const body = await res.json();
      const url = body?.data?.url ?? body?.url;
      if (url) {
        setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
      }
    } catch (err) {
      log.error({}, 'Failed to upload image', err);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleCreateListing = async () => {
    if (!formData.title.trim() || !formData.description.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        locale: formData.locale,
        category: formData.category,
        priceType: formData.priceType,
        price: formData.price ? formData.price.replace(/[^0-9.]/g, '') : null,
        serviceAreas: formData.serviceAreas
          ? formData.serviceAreas.split(',').map((s: string) => s.trim())
          : [],
        contactMethods: [formData.contactMethods],
        images: formData.images,
      };

      const isEdit = !!editingId;
      const url = isEdit
        ? `/api/community-services/listings/${editingId}`
        : '/api/community-services/listings';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetForm();
        fetchData();
      }
    } catch (err) {
      log.error({}, editingId ? 'Failed to update listing' : 'Failed to create listing', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (listing: ServiceListing) => {
    setFormData({
      title: listing.title,
      description: listing.description || '',
      category: listing.category,
      priceType: listing.priceType || 'FREE',
      price: listing.price?.toString() || '',
      serviceAreas: (listing.serviceAreas || []).join(', '),
      contactMethods: listing.contactMethods?.[0] || 'PLATFORM_MESSAGE',
      images: listing.images || [],
      locale: listing.locale || 'en',
    });
    setEditingId(listing.id);
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'OTHER',
      priceType: 'FREE',
      price: '',
      serviceAreas: '',
      contactMethods: 'PLATFORM_MESSAGE',
      images: [],
      locale: 'en',
    });
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handlePublish = async (listingId: string, publish: boolean) => {
    setListings(prev =>
      prev.map(l =>
        l.id === listingId
          ? { ...l, isPublished: publish, status: publish ? 'ACTIVE' : 'DRAFT' }
          : l
      )
    );
    try {
      await fetch(`/api/community-services/listings/${listingId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });
      fetchData();
    } catch (err) {
      log.error({}, 'Failed to update publish status', err);
      fetchData();
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
              handlePublish={handlePublish}
              handleImageUpload={handleImageUpload}
              removeImage={removeImage}
              uploadingImage={uploadingImage}
              editingId={editingId}
              onEdit={handleEdit}
              onCancel={resetForm}
              languages={languages}
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
  handlePublish,
  handleImageUpload,
  removeImage,
  uploadingImage,
  editingId,
  onEdit,
  onCancel,
  languages,
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
    images: string[];
    locale: string;
  };
  setFormData: (data: {
    title: string;
    description: string;
    category: string;
    priceType: string;
    price: string;
    serviceAreas: string;
    contactMethods: string;
    images: string[];
    locale: string;
  }) => void;
  categories: string[];
  submitting: boolean;
  handleCreateListing: () => void;
  handlePublish: (listingId: string, publish: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  uploadingImage: boolean;
  editingId: string | null;
  onEdit: (listing: ServiceListing) => void;
  onCancel: () => void;
  languages: { code: string; label: string }[];
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
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {editingId ? 'Edit Service Listing' : 'New Service Listing'}
          </h4>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Listing Language
              </label>
              <select
                value={formData.locale}
                onChange={e => setFormData({ ...formData, locale: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.images.map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt={`Upload ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                {uploadingImage ? 'Uploading...' : '+ Add Image'}
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreateListing}
                disabled={submitting || !formData.title.trim() || !formData.description.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Saving...' : editingId ? 'Update Listing' : 'Create Listing'}
              </button>
              <button
                onClick={onCancel}
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
            <div
              key={listing.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 group"
            >
              <Link
                href={`/services/${listing.slug || listing.id}`}
                className="min-w-0 flex-1 flex items-center gap-3"
              >
                {listing.images?.[0] && (
                  <img
                    src={listing.images[0]}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover border shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                    {listing.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {listing.category.replace(/_/g, ' ')} &middot;{' '}
                    {listing.isPublished ? 'Published' : 'Draft'}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                {listing.isPublished ? (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      handlePublish(listing.id, false);
                    }}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      handlePublish(listing.id, true);
                    }}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Publish
                  </button>
                )}
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
                <Link
                  href={`/services/${listing.slug || listing.id}`}
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    onEdit(listing);
                  }}
                  className="ml-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                >
                  Edit
                </Link>
              </div>
            </div>
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

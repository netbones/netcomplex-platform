'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient, trpc } from '@api/client';
import Image from 'next/image';
import { ErrorBoundary } from '@shared/ui';
import { AgentWidget } from './AgentWidget';
import { CreateListingForm } from '@features/service';
import { useApiToast, usePremiumListings } from '@shared/lib/hooks';

import { Building2, Home, List, Plus, UserCircle } from 'lucide-react';
interface PortfolioHousehold {
  id: string;
  street: string;
  unit: string;
  homeImage: string | null;
  platformAddress: string;
  status: string;
  standardSeats: Array<{
    user: {
      name: string;
      email: string;
    };
  }>;
  profiles: Array<{
    displayName: string;
    householdRole: string;
    user?: {
      name: string;
    } | null;
  }>;
}

interface PremiumPortfolio {
  id: string;
  platformAddress: string;
  subscriptionTier: string;
  linkedHouseholds: PortfolioHousehold[];
}

export function PremiumPortfolioWidget() {
  const { data: session } = authClient.useSession();
  const { mutate: apiMutate } = useApiToast({
    component: 'PremiumPortfolioWidget',
  });
  const [upgrading, setUpgrading] = useState(false);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'agents' | 'listings'>('portfolio');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: premiumData, refetch: refetchListings } = usePremiumListings();
  const listings = premiumData?.listings ?? [];

  const utils = trpc.useUtils();
  const getMyPropertiesQuery = trpc.identity.getMyProperties.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });
  const getPortfolioQuery = trpc.marketplace.getPortfolio.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });
  const activateSeatMutation = trpc.marketplace.activatePremiumSeat.useMutation();

  const loading = getPortfolioQuery.isLoading;
  const portfolio =
    getPortfolioQuery.data?.data && 'portfolio' in getPortfolioQuery.data.data
      ? (getPortfolioQuery.data.data as unknown as { portfolio: PremiumPortfolio }).portfolio
      : null;

  const handleUpgradeToPortfolio = () => {
    setUpgrading(true);

    const promise = (async () => {
      const properties = getMyPropertiesQuery.data?.data ?? [];
      const householdIds = properties
        .map(p => p.activeHousehold?.id)
        .filter((id): id is string => !!id);

      if (householdIds.length < 2) {
        throw new Error('You need at least 2 properties to create a portfolio');
      }

      return activateSeatMutation.mutateAsync({ householdIds });
    })();

    apiMutate(promise, {
      loading: 'Creating portfolio...',
      success: 'Successfully upgraded to Premium Seat!',
      error: 'Upgrade failed',
      onSuccess: () => {
        utils.marketplace.getPortfolio.invalidate();
        setUpgrading(false);
      },
      onError: () => setUpgrading(false),
    });
  };

  const handleListingCreated = () => {
    refetchListings();
  };

  const handleListProperty = (_householdId: string) => {
    setShowCreateForm(true);
    // The form will fetch available households, but we could pass the householdId to pre-select it
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!portfolio) {
    return (
      <ErrorBoundary>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Premium Portfolio</h3>
              <p className="text-sm text-gray-600">Unified management for multiple properties</p>
            </div>
            <button
              onClick={handleUpgradeToPortfolio}
              disabled={upgrading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {upgrading ? 'Upgrading...' : 'Upgrade to Portfolio'}
            </button>
          </div>

          <div className="text-center py-8 text-gray-500">
            <Building2 className="text-4xl mb-4" />
            <h4 className="text-lg font-medium mb-2">Multi-Property Management</h4>
            <p className="text-sm mb-4">
              Manage all your properties from one unified dashboard. Combine multiple Standard Seats
              into one Premium Portfolio.
            </p>
            <button
              onClick={handleUpgradeToPortfolio}
              disabled={upgrading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {upgrading ? 'Setting up Portfolio...' : 'Create Premium Portfolio'}
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Premium Portfolio</h3>
            <p className="text-sm text-gray-600">
              {portfolio.linkedHouseholds.length} Properties • Agent Marketplace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
              Premium Seat
            </span>
            <span className="text-xs text-gray-500 font-mono">{portfolio.platformAddress}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'portfolio'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="mr-2" />
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'agents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCircle className="mr-2" />
            Agents
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'listings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="mr-2" />
            Listings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'portfolio' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolio.linkedHouseholds.map(household => (
                <div
                  key={household.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {household.homeImage ? (
                      <Image
                        src={household.homeImage}
                        alt={`${household.street} ${household.unit}`}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Home className="text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/unit/${household.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 block truncate"
                      >
                        {household.street} {household.unit}
                      </Link>
                      <p className="text-xs text-gray-500 font-mono truncate">
                        {household.platformAddress}
                      </p>
                    </div>
                  </div>

                  {/* Occupants Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-medium">
                        {household.standardSeats[0]?.user.name || 'Unknown'}
                      </span>
                    </div>

                    {household.profiles.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">Occupants:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {household.profiles.slice(0, 3).map(profile => (
                            <span
                              key={profile.displayName}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                            >
                              {profile.displayName}
                            </span>
                          ))}
                          {household.profiles.length > 3 && (
                            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded">
                              +{household.profiles.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/unit/${household.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Manage Property →
                      </Link>
                      <button
                        onClick={() => handleListProperty(household.id)}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        List for Sale
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Premium Portfolio Management</span>
                <span className="text-xs">Unified dashboard for all your properties</span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'agents' && <AgentWidget />}

        {activeTab === 'listings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Your Property Listings</h4>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
              >
                <Plus className="mr-2" />
                Create Listing
              </button>
            </div>

            {listings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <List className="text-4xl mb-4" />
                <p className="mb-4">No listings yet</p>
                <p className="text-sm mb-4">Create your first property listing to get started</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Your First Listing
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map(listing => (
                  <div
                    key={listing.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{listing.title}</h5>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            listing.status === 'ACTIVE' && listing.isPublished
                              ? 'bg-green-100 text-green-800'
                              : listing.status === 'DRAFT'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {listing.isPublished ? 'Published' : 'Draft'}
                        </span>
                        {listing.isFeatured && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="capitalize">{listing.listingType.toLowerCase()}</span>
                      {listing.price && (
                        <span className="font-medium text-green-600">
                          R{listing.price.toLocaleString()}
                        </span>
                      )}
                      <span>
                        {listing.street} {listing.unit}
                      </span>
                    </div>

                    {(listing as unknown as { assignedAgent: { name: string } | null })
                      .assignedAgent && (
                      <div className="text-sm text-gray-600 mb-3">
                        <UserCircle className="mr-1" />
                        Agent:{' '}
                        {
                          (listing as unknown as { assignedAgent: { name: string } | null })
                            .assignedAgent!.name
                        }
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                      >
                        Edit
                      </Link>
                      {!listing.isPublished && (
                        <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                          Publish
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showCreateForm && (
          <CreateListingForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={handleListingCreated}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

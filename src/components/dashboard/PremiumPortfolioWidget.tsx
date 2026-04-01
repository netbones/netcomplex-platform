'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AgentWidget } from './AgentWidget';
import { CreateListingForm } from './CreateListingForm';

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
    occupantType: string;
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
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const [portfolio, setPortfolio] = useState<PremiumPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'agents' | 'listings'>('portfolio');

  useEffect(() => {
    if (session?.user?.id) {
      fetchPortfolio();
    }
  }, [session?.user?.id]);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/premium/portfolio');
      const data = await response.json();

      if (data.hasPortfolio) {
        setPortfolio(data.portfolio);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToPortfolio = async () => {
    // Get all households owned by user
    try {
      setUpgrading(true);

      // First get user's households
      const userResponse = await fetch(`/api/users/${session?.user?.id}`);
      const userData = await userResponse.json();

      // Extract household IDs from standard seats
      const householdIds = userData.standardSeats?.map((seat: any) => seat.household.id) || [];

      if (householdIds.length < 2) {
        alert('You need at least 2 properties to create a portfolio');
        return;
      }

      const response = await fetch('/api/premium/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdIds }),
      });

      const data = await response.json();

      if (data.success) {
        setPortfolio(data.portfolio);
        alert('Successfully upgraded to Premium Seat with property portfolio!');
      } else {
        alert(data.error || 'Upgrade failed');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Upgrade failed');
    } finally {
      setUpgrading(false);
    }
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
            <i className="fas fa-building text-4xl mb-4"></i>
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
            <i className="fas fa-building mr-2"></i>
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
            <i className="fas fa-user-tie mr-2"></i>
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
            <i className="fas fa-list mr-2"></i>
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
                      <img
                        src={household.homeImage}
                        alt={`${household.street} ${household.unit}`}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-home text-gray-400"></i>
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
                      <button className="text-xs text-green-600 hover:text-green-800">
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
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
                Create Listing
              </button>
            </div>

            {/* This will be populated by the AgentWidget's listings functionality */}
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-list text-4xl mb-4"></i>
              <p className="mb-4">No listings yet</p>
              <p className="text-sm mb-4">Create your first property listing to get started</p>
              <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Create Your First Listing
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

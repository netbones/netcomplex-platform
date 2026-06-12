'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@api/client';
import { ErrorBoundary } from '@shared/ui';
import { useApiToast } from '@/shared/lib/hooks/useApiToast';

interface AgentProfile {
  id: string;
  agencyName?: string;
  specializations: string[];
  serviceAreas: string[];
  rating: number;
  reviewCount: number;
  commissionRate: number;
  isVerified: boolean;
  agent: {
    name: string;
    email: string;
  };
}

/** @property-consolidation-plan (44-03 findings)
 * This is a LISTING type, not a Property shape — it models property
 * listings/assignments in the agent domain, not real-estate properties.
 * Per C1 resolution: leave as-is. Do NOT consolidate with PropertySummaryDTO.
 * Last audit: 2026-06-08
 */
interface PropertyListing {
  id: string;
  title: string;
  listingType: string;
  price?: number;
  status: string;
  assignedAgent?: {
    name: string;
  };
}

export function AgentWidget() {
  const { t } = useTranslation('dashboard');
  const { data: session } = authClient.useSession();
  const { fetch: apiFetch, mutate: apiMutate } = useApiToast({ component: 'AgentWidget' });
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agents' | 'listings'>('agents');

  useEffect(() => {
    if (session?.user?.id) {
      fetchAgentData();
      fetchListings();
    }
  }, [session?.user?.id]);

  const fetchAgentData = () => {
    apiFetch(
      globalThis
        .fetch('/api/agents/marketplace')
        .then(res => res.json() as Promise<{ agents?: AgentProfile[] }>),
      {
        error: 'Failed to fetch agent data',
        onSuccess: (data: { agents?: AgentProfile[] }) => setAgents(data.agents || []),
      }
    );
  };

  const fetchListings = () => {
    apiFetch(
      globalThis
        .fetch('/api/premium/listings')
        .then(res => res.json() as Promise<{ listings?: PropertyListing[] }>),
      {
        error: 'Failed to fetch listings',
        onSuccess: (data: { listings?: PropertyListing[] }) => setListings(data.listings || []),
        onError: () => setLoading(false),
      }
    );
  };

  const connectWithAgent = (agentId: string) => {
    apiMutate(
      globalThis
        .fetch('/api/agents/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        })
        .then(res => res.json() as Promise<unknown>),
      {
        loading: 'Sending request...',
        success: 'Connection request sent!',
        error: 'Failed to connect with agent',
      }
    );
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

  return (
    <ErrorBoundary>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Agent Marketplace</h3>
            <p className="text-sm text-gray-600">Connect with property professionals</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'agents'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Find Agents
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'listings'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              My Listings
            </button>
          </div>
        </div>

        {activeTab === 'agents' ? (
          <div className="space-y-4">
            {agents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-user-tie text-4xl mb-4"></i>
                <p>No agents available in your area</p>
              </div>
            ) : (
              agents.slice(0, 3).map(agent => (
                <div
                  key={agent.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-user-tie text-indigo-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{agent.agent.name}</h4>
                        {agent.isVerified && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <i className="fas fa-check mr-1"></i>
                            Verified
                          </span>
                        )}
                      </div>
                      {agent.agencyName && (
                        <p className="text-sm text-gray-600">{agent.agencyName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <i
                              key={i}
                              className={`fas fa-star text-xs ${
                                i < Math.floor(agent.rating) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            ></i>
                          ))}
                          <span className="text-xs text-gray-600 ml-1">({agent.reviewCount})</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {agent.commissionRate}% commission
                        </span>
                      </div>
                    </div>
                  </div>

                  {agent.specializations.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-1">Specializations:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.specializations.slice(0, 3).map(spec => (
                          <span
                            key={spec}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => connectWithAgent(agent.id)}
                      className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                    >
                      Connect
                    </button>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))
            )}

            {agents.length > 3 && (
              <div className="text-center">
                <Link
                  href="/agents/marketplace"
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  View all {agents.length} agents →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {listings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-home text-4xl mb-4"></i>
                <p>No property listings yet</p>
                <button className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
                  Create Listing
                </button>
              </div>
            ) : (
              listings.map(listing => (
                <div
                  key={listing.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{listing.title}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        listing.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {listing.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="capitalize">{listing.listingType.toLowerCase()}</span>
                    {listing.price && (
                      <span className="font-medium">R{listing.price.toLocaleString()}</span>
                    )}
                  </div>

                  {listing.assignedAgent && (
                    <div className="text-sm text-gray-600">Agent: {listing.assignedAgent.name}</div>
                  )}

                  <div className="flex gap-2 mt-3">
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
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

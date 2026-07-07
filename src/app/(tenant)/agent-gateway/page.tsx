'use client';

import Link from 'next/link';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { DelegationWidget } from '@widgets/delegation';

export default function AgentGatewayPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Agent Gateway', href: '/agent-gateway' },
          ]}
        />

        <div className="flex items-center gap-3 mt-6 mb-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Gateway</h1>
            <p className="text-sm text-gray-500">
              Manage your property delegations, access tokens, and agent profiles
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ErrorBoundary>
              <DelegationWidget />
            </ErrorBoundary>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Access Tokens
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Manage your API tokens for automation and AI agent access
              </p>
              <a
                href="/agent-gateway/tokens"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View tokens
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </section>

            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Quick Links
              </h2>
              <div className="space-y-2">
                <Link
                  href="/dashboard/services/maintenance"
                  className="block text-sm text-gray-600 hover:text-indigo-600 py-1.5 px-2 rounded hover:bg-gray-50"
                >
                  Maintenance Dashboard
                </Link>
                <Link
                  href="/dashboard/services/my-services"
                  className="block text-sm text-gray-600 hover:text-indigo-600 py-1.5 px-2 rounded hover:bg-gray-50"
                >
                  My Services
                </Link>
                <a
                  href="/profile"
                  className="block text-sm text-gray-600 hover:text-indigo-600 py-1.5 px-2 rounded hover:bg-gray-50"
                >
                  Agent Profile
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

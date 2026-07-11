'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@api/client';
import { Eye, Building2 } from 'lucide-react';

export interface NullTenantLandingProps {
  loading?: boolean;
  showDemo?: boolean;
  isReturnVisit?: boolean;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 mb-4" />
      <div className="h-7 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-4/5 mb-6" />
      <div className="h-10 bg-gray-200 rounded w-40" />
    </div>
  );
}

export function NullTenantLanding({
  loading = false,
  showDemo = false,
  isReturnVisit = false,
}: NullTenantLandingProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/sign-in');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vellum">
        <div className="max-w-4xl mx-auto px-6 py-16">
          {/* Hero skeleton */}
          <div className="text-center mb-12">
            <div className="h-10 bg-gray-200 rounded w-72 mx-auto mb-4 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-96 mx-auto animate-pulse" />
          </div>
          {/* Card skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const heading = isReturnVisit
    ? 'Welcome back! Ready to create your community?'
    : 'Welcome to NetComplex';
  const subtext = 'Your account is verified. What would you like to do next?';

  return (
    <div className="min-h-screen bg-vellum">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-bark mb-4">{heading}</h1>
          <p className="text-lg text-slate-600">{subtext}</p>
        </div>

        {/* Cards grid */}
        <div
          className={`grid gap-6 ${
            showDemo ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'
          }`}
        >
          {/* Demo card — conditionally rendered behind feature flag (G2) */}
          {showDemo && (
            <div className="bg-white rounded-xl shadow-card border border-gold-vein/20 p-6 flex flex-col">
              <div className="w-12 h-12 rounded-full bg-lapis-azure/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-lapis-azure" />
              </div>
              <h2 className="text-3xl font-bold text-bark mb-3">Try a live demo</h2>
              <p className="text-base text-slate-600 mb-6 flex-1">
                Explore a read-only community to see how NetComplex works before creating your own.
              </p>
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3 border-2 border-lapis-deep text-lapis-deep rounded-lg font-medium hover:bg-lapis-deep/5 transition-colors"
              >
                Explore demo
              </button>
            </div>
          )}

          {/* Create Community card */}
          <div className="bg-white rounded-xl shadow-card border border-lapis-azure/30 p-6 flex flex-col">
            <div className="w-12 h-12 rounded-full bg-gold-vein/10 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-gold-vein" />
            </div>
            <h2 className="text-3xl font-bold text-bark mb-3">Create a community</h2>
            <p className="text-base text-slate-600 mb-6 flex-1">
              Set up your own community with a custom subdomain, branding, and features.
            </p>
            <button
              type="button"
              onClick={() => router.push('/create-community')}
              className="w-full sm:w-auto px-6 py-3 bg-gold-vein text-white rounded-lg font-medium hover:bg-gold-vein/90 transition-colors"
            >
              Create Community
            </button>
          </div>
        </div>

        {/* Sign-out link */}
        <div className="text-center mt-10">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

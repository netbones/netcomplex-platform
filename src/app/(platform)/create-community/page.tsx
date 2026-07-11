'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@api/client';
import { CommunitySetupForm } from '@features/auth';
import { PageLayout, LoadingSkeleton } from '@shared/ui';
import { PlatformHeader, PlatformFooter } from '@features/platform';

export default function CreateCommunityPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  // Loading state — show skeleton while session is checked
  if (isPending) {
    return (
      <PageLayout background="fieldstone">
        <PlatformHeader variant="light" />
        <main className="flex-1 flex flex-col">
          <div className="max-w-2xl mx-auto w-full px-6 py-16">
            <div className="text-center mb-8">
              <LoadingSkeleton height="h-8" className="w-72 mx-auto mb-4" />
              <LoadingSkeleton height="h-5" className="w-96 mx-auto" />
            </div>
            <div className="space-y-6">
              <LoadingSkeleton height="h-10" className="w-full" />
              <LoadingSkeleton height="h-10" className="w-full" />
              <div className="space-y-3">
                <LoadingSkeleton height="h-24" className="w-full" />
                <LoadingSkeleton height="h-24" className="w-full" />
                <LoadingSkeleton height="h-24" className="w-full" />
              </div>
              <LoadingSkeleton height="h-12" className="w-full" />
            </div>
          </div>
        </main>
        <PlatformFooter />
      </PageLayout>
    );
  }

  // Unauthenticated — redirect to sign-in
  if (!session) {
    router.push('/sign-in');
    return null;
  }

  // User already has a community — redirect to dashboard
  if (session.user.tenantId !== null) {
    router.push('/dashboard');
    return null;
  }

  // Authenticated user with tenantId: null — show community setup form
  return (
    <PageLayout background="fieldstone">
      <PlatformHeader variant="light" />
      <main className="flex-1 flex flex-col">
        <CommunitySetupForm />
      </main>
      <PlatformFooter />
    </PageLayout>
  );
}

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { ErrorBoundary, LoadingSkeleton } from '@shared/ui';
import { auth } from '@api/server/auth';
import { db, events, meetingProxies } from '@api/server';
import { and, desc, isNull, getSessionAndRole } from '@api/server';
import { hasPermission, withTenant } from '@shared/lib';
import { isProxyEligible } from '@/features/proxy-vote/lib/constants';
import { ProxyFlowWizard } from '@/features/proxy-vote/ui/ProxyFlowWizard';

interface PageProps {
  params: Promise<{ meetingId: string }>;
}

export default async function ProxyWizardPage({ params }: PageProps) {
  const { meetingId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const { tenantId } = await withTenant();
  if (!tenantId) {
    redirect('/sign-in');
  }

  return (
    <ErrorBoundary fallback={<ProxyErrorFallback />}>
      <Suspense fallback={<LoadingSkeleton lines={4} />}>
        <ProxyWizardLoader meetingId={meetingId} tenantId={tenantId} />
      </Suspense>
    </ErrorBoundary>
  );
}

function ProxyErrorFallback() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
      We couldn&apos;t load the proxy form. Please try refreshing the page.
    </div>
  );
}

interface ProxyWizardLoaderProps {
  meetingId: string;
  tenantId: string;
}

async function ProxyWizardLoader({ meetingId, tenantId }: ProxyWizardLoaderProps) {
  const sessionInfo = await getSessionAndRole();
  if (!sessionInfo?.user?.id) {
    redirect('/sign-in');
  }

  const [meeting] = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      tenantId: events.tenantId,
      category: events.category,
    })
    .from(events)
    .where(and(eq(events.id, meetingId), eq(events.tenantId, tenantId), isNull(events.deletedAt)));

  if (!meeting) {
    return <div className="p-6 text-sm text-amber-700">Meeting not found.</div>;
  }
  if (!meeting.category || !isProxyEligible(meeting.category)) {
    return (
      <div className="p-6 text-sm text-amber-700">
        This meeting type does not accept proxy appointments.
      </div>
    );
  }

  const [existing] = await db
    .select()
    .from(meetingProxies)
    .where(
      and(
        eq(meetingProxies.meetingId, meetingId),
        eq(meetingProxies.ownerUserId, sessionInfo.user.id),
        eq(meetingProxies.tenantId, tenantId)
      )
    )
    .orderBy(desc(meetingProxies.createdAt))
    .limit(1);

  void hasPermission;

  return (
    <ProxyFlowWizard
      meeting={{
        id: meeting.id,
        title: meeting.title,
        date: new Date(meeting.date).toLocaleString(),
        category: meeting.category,
      }}
      existingProxy={existing ?? null}
      userId={sessionInfo.user.id}
    />
  );
}

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { db, events, getSessionAndRole, meetingProxies } from '@api/server';
import { ErrorBoundary, LoadingSkeleton } from '@shared/ui';
import { isProxyEligible } from '@/features/proxy-vote/lib/constants';
import { proxyResponseDTO } from '@/features/proxy-vote/model/proxy-vote.dto';
import { ProxyFlowWizard } from '@/features/proxy-vote/ui/ProxyFlowWizard';

interface PageProps {
  params: Promise<{ meetingId: string }>;
}

export default async function ProxyWizardPage({ params }: PageProps) {
  const { meetingId } = await params;
  return (
    <ErrorBoundary fallback={<ProxyErrorFallback />}>
      <Suspense fallback={<LoadingSkeleton lines={4} />}>
        <ProxyWizardLoader meetingId={meetingId} />
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

async function ProxyWizardLoader({ meetingId }: { meetingId: string }) {
  const sessionInfo = await getSessionAndRole();
  if (!sessionInfo) {
    redirect('/sign-in');
  }
  const userId = sessionInfo.userId;
  const tenantId = sessionInfo.session.user.id ? tenantIdForUser(userId) : '';
  if (!tenantId) {
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

  const existingRows = await db
    .select()
    .from(meetingProxies)
    .where(
      and(
        eq(meetingProxies.meetingId, meetingId),
        eq(meetingProxies.ownerUserId, userId),
        eq(meetingProxies.tenantId, tenantId)
      )
    )
    .orderBy(desc(meetingProxies.createdAt))
    .limit(1);

  const existing = existingRows[0];

  return (
    <ProxyFlowWizard
      meeting={{
        id: meeting.id,
        title: meeting.title,
        date: new Date(meeting.date).toISOString(),
        category: meeting.category,
      }}
      existingProxy={
        existing
          ? proxyResponseDTO(existing as unknown as Parameters<typeof proxyResponseDTO>[0])
          : null
      }
      userId={''}
      tenantId={tenantId}
    />
  );
}

function tenantIdForUser(_userId: string): string {
  return '';
}

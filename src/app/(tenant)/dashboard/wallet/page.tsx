'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ErrorBoundary, LoadingSkeleton } from '@shared/ui';
import { useWallet } from '@entities/dwallet';
import { Info } from 'lucide-react';
import type { StreamConfig } from '@entities/dwallet';
import { useSafeTranslation } from '@shared/lib';

import { TABS, type TabKey } from './model/helpers';
import { PageHeader } from './ui/PageHeader';
import { TabBar } from './ui/TabBar';
import { OverviewTab } from './ui/OverviewTab';
import { ActivityTab } from './ui/ActivityTab';
import { ImpactTab } from './ui/ImpactTab';
import { ConsentsTab } from './ui/ConsentsTab';
import { PayoutsTab } from './ui/PayoutsTab';

function DWalletPageContent() {
  const { tx } = useSafeTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    wallet,
    consents,
    transactions,
    isLoading,
    error,
    updateConsent,
    isUpdatingConsent,
    requestPayout,
    isRequestingPayout,
  } = useWallet();

  const [streams, setStreams] = useState<StreamConfig[]>([]);

  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = TABS.includes(tabParam as TabKey) ? (tabParam as TabKey) : 'overview';

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      router.push(`/dashboard/wallet?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  const handleConsentToggle = useCallback(
    (streamKey: string, granted: boolean) => {
      updateConsent({ streamKey, granted });
    },
    [updateConsent]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadStreams() {
      try {
        const res = await fetch('/api/v1/tenant/dwallet/streams');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setStreams(Array.isArray(data) ? data : (data.data ?? []));
        }
      } catch {
        // Silently fail
      }
    }
    loadStreams();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading && !wallet) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PageHeader balance={undefined} isLoading />
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        <LoadingSkeleton className="space-y-4" />
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PageHeader balance={undefined} isLoading={false} />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            {tx('dwallet.couldNotLoad', 'Could not load dWallet')}
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            {tx('dwallet.refreshPage', 'Please refresh the page or try again later.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader balance={wallet?.balance} isLoading={false} />
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            wallet={wallet}
            consents={consents}
            transactions={transactions}
            streams={streams}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'impact' && <ImpactTab streams={streams} />}
        {activeTab === 'consents' && (
          <ConsentsTab
            consents={consents}
            isLoading={isLoading}
            isUpdating={isUpdatingConsent}
            onToggle={handleConsentToggle}
          />
        )}
        {activeTab === 'payouts' && (
          <PayoutsTab
            wallet={wallet}
            requestPayout={requestPayout}
            isRequestingPayout={isRequestingPayout}
          />
        )}
      </div>
    </div>
  );
}

export default function DWalletPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Could not load dWallet</h3>
            <p className="text-sm text-red-600 mb-4 max-w-md">
              Please refresh the page or try again later.
            </p>
          </div>
        </div>
      }
    >
      <DWalletPageContent />
    </ErrorBoundary>
  );
}

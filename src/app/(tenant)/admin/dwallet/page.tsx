'use client';

import { Breadcrumbs } from '@shared/ui';
import { useSafeTranslation } from '@shared/lib';
import { DWalletAdminWidget } from '@entities/dwallet';

export default function DWalletAdminPage() {
  const { tx } = useSafeTranslation('admin');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tx('nav.admin', 'Admin'), href: '/admin' },
          { label: tx('domains.dwallet', 'dWallet') },
        ]}
      />
      <div className="flex items-center gap-3 mb-6">
        <img src="/platform/wallet-blue.svg" alt="" className="w-8 h-8" />
        <h1 className="text-2xl font-bold text-gray-900">{tx('domains.dwallet', 'dWallet')}</h1>
      </div>
      <DWalletAdminWidget />
    </div>
  );
}

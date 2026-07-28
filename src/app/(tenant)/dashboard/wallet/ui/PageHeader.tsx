'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSafeTranslation } from '@shared/lib';
import { Download, MoreHorizontal, FileText, Shield } from 'lucide-react';
import { formatZAR } from '../model/helpers';

export function PageHeader({
  balance,
  isLoading,
}: {
  balance: string | undefined;
  isLoading: boolean;
}) {
  const { tx } = useSafeTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Image src="/platform/wallet-red.svg" alt="dWallet" width={28} height={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {tx('dwallet.myDwallet', 'My dWallet')}
            </h2>
            <p className="text-sm text-slate-500">
              {tx('dwallet.yourDataYourConsent', 'Your data, your consent, your rewards')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            {tx('dwallet.export', 'Export')}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label={tx('dwallet.moreOptions', 'More options')}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10 py-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  {tx('dwallet.downloadStatement', 'Download Annual Statement')}
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  {tx('dwallet.deleteMyData', 'Delete My Data')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 w-40 bg-slate-200 rounded mb-2" />
            <div className="h-5 w-64 bg-slate-100 rounded" />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="text-3xl font-semibold text-indigo-600">
              {balance ? formatZAR(balance) : 'R 0.00'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {tx('dwallet.availableValue', 'Available Value')}
            </p>
            <Image
              src="/platform/info/dwallet.svg"
              alt=""
              width={120}
              height={90}
              className="shrink-0 mt-3"
            />
          </div>
        )}
      </div>
    </div>
  );
}

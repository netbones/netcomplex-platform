'use client';

import { useSafeTranslation } from '@shared/lib';

export function ConsentToggle({
  streamKey,
  label,
  granted,
  isMaster = false,
  subtitle,
  dateLine,
  onToggle,
  isPending,
}: {
  streamKey: string;
  label: string;
  granted: boolean;
  isMaster?: boolean;
  subtitle?: string;
  dateLine?: string;
  onToggle: (streamKey: string, granted: boolean) => void;
  isPending: boolean;
}) {
  const { tx } = useSafeTranslation();
  return (
    <div
      className={isMaster ? 'py-4 border-b-2 border-indigo-100' : 'py-3 border-b border-slate-100'}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm ${isMaster ? 'font-semibold text-slate-800' : 'text-slate-700'}`}
          >
            {label}
          </span>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {dateLine && <p className="text-xs text-slate-400 mt-0.5">{dateLine}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={granted}
          aria-label={tx('dwallet.toggleConsent', 'Toggle {label} consent', { label })}
          disabled={isPending}
          onClick={() => onToggle(streamKey, !granted)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
            granted ? 'bg-indigo-600' : 'bg-slate-200'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
              granted ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

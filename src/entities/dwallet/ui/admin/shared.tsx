'use client';

import React from 'react';

export type TxFn = (key: string, fallback: string, options?: Record<string, unknown>) => string;

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

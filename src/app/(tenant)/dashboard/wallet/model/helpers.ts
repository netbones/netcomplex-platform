'use client';

import type { TransactionItem, PayoutRequestItem } from '@entities/dwallet';

export const TABS = ['overview', 'activity', 'impact', 'consents', 'payouts'] as const;
export type TabKey = (typeof TABS)[number];

export function formatZAR(amount: string | number): string {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getTypeBadge(type: TransactionItem['type']) {
  switch (type) {
    case 'CREDIT':
      return { label: 'Value Earned', className: 'bg-indigo-50 text-indigo-600' };
    case 'DEBIT':
      return { label: 'Value Used', className: 'bg-slate-100 text-slate-600' };
    case 'ROLLOVER':
      return { label: 'Value Rolled', className: 'bg-slate-50 text-slate-400' };
    case 'ADJUSTMENT':
      return { label: 'Adjustment', className: 'bg-gray-50 text-gray-400' };
    default:
      return { label: type, className: 'bg-slate-50 text-slate-500' };
  }
}

export function getPayoutStatusBadge(status: PayoutRequestItem['status']) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', className: 'bg-slate-100 text-slate-500' };
    case 'PROCESSING':
      return { label: 'Processing', className: 'bg-indigo-50 text-indigo-500' };
    case 'COMPLETED':
      return { label: 'Completed', className: 'bg-indigo-50 text-indigo-600' };
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-slate-100 text-slate-600' };
    case 'CANCELLED':
      return { label: 'Cancelled', className: 'bg-gray-50 text-gray-400' };
    default:
      return { label: status, className: 'bg-slate-50 text-slate-500' };
  }
}

const STREAM_LABEL_MAP: Record<string, string> = {
  survey_participation: 'dwallet.streamLabel_survey_participation',
  marketplace_activity: 'dwallet.streamLabel_marketplace_activity',
  agent_transactions: 'dwallet.streamLabel_agent_transactions',
  value_added_services: 'dwallet.streamLabel_value_added_services',
  service_provider_listings: 'dwallet.streamLabel_service_provider_listings',
  premium_placements: 'dwallet.streamLabel_premium_placements',
  agent_registrations: 'dwallet.streamLabel_agent_registrations',
  agent_premium_listings: 'dwallet.streamLabel_agent_premium_listings',
};

const STREAM_DESC_MAP: Record<string, string> = {
  survey_participation: 'dwallet.streamDesc_survey_participation',
  marketplace_activity: 'dwallet.streamDesc_marketplace_activity',
  agent_transactions: 'dwallet.streamDesc_agent_transactions',
  value_added_services: 'dwallet.streamDesc_value_added_services',
  service_provider_listings: 'dwallet.streamDesc_service_provider_listings',
  premium_placements: 'dwallet.streamDesc_premium_placements',
  agent_registrations: 'dwallet.streamDesc_agent_registrations',
  agent_premium_listings: 'dwallet.streamDesc_agent_premium_listings',
};

export function getStreamLabelKey(streamKey: string) {
  return STREAM_LABEL_MAP[streamKey] ?? '';
}

export function getStreamDescKey(streamKey: string) {
  return STREAM_DESC_MAP[streamKey] ?? '';
}

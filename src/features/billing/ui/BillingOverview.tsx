'use client';

import { useState } from 'react';
import { CreditCard, AlertTriangle, Calendar, Clock } from 'lucide-react';
import type { TenantBillingSnapshot } from '../model/types';
import { TIER_BADGE, SUBSCRIPTION_STATUS_COLOR } from '../model/display-config';

interface BillingOverviewProps {
  snapshot: TenantBillingSnapshot;
}

export function BillingOverview({ snapshot }: BillingOverviewProps) {
  const sub = snapshot.currentSubscription;
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const now = new Date();
  const trialEnd = sub?.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  const daysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (!sub) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active subscription</p>
          <p className="text-sm text-gray-400 mt-1">Select a plan below to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-6 h-6 text-[#4F46E5]" />
        <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
      </div>

      <div className="space-y-4">
        {/* Plan name + tier + status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold text-gray-900">{sub.planName ?? 'Unknown Plan'}</span>
          {sub.planTier && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_BADGE[sub.planTier] ?? TIER_BADGE.STANDARD}`}
            >
              {sub.planTier}
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SUBSCRIPTION_STATUS_COLOR[sub.status] ?? 'bg-gray-100 text-gray-800'}`}
          >
            {sub.status}
          </span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {sub.startDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Started: {new Date(sub.startDate).toLocaleDateString()}</span>
            </div>
          )}
          {sub.nextBillingDate && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Next billing: {new Date(sub.nextBillingDate).toLocaleDateString()}</span>
            </div>
          )}
          {sub.endDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Ends: {new Date(sub.endDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Trial info */}
        {sub.trialEndsAt && sub.status === 'TRIALING' && (
          <div className="rounded-md bg-blue-50 border border-blue-100 p-3">
            <p className="text-sm font-medium text-blue-800">
              Trial ends {trialEnd!.toLocaleDateString()}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </p>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <a
            href="#plan-selector"
            className="inline-flex items-center rounded-md bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors"
          >
            Change Plan
          </a>
          {sub.status === 'ACTIVE' && (
            <>
              {!showCancelConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="inline-flex items-center rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Cancel Subscription
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Are you sure?</span>
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Yes, cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Keep plan
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

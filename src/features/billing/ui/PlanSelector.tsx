'use client';

import { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { CheckoutButton } from './CheckoutButton';
import type { TenantBillingPlan } from '../model/types';
import { TIER_BADGE } from '../model/display-config';

interface PlanSelectorProps {
  plans: TenantBillingPlan[];
  currentPlanId?: string;
  onSelectPlan?: (planId: string) => void;
}

export function PlanSelector({ plans, currentPlanId, onSelectPlan }: PlanSelectorProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handleSelect = (planId: string) => {
    setSelectedPlanId(planId);
    onSelectPlan?.(planId);
  };

  if (plans.length === 0) {
    return (
      <div id="plan-selector" className="max-w-5xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        <p className="text-gray-500 text-sm">No plans available at this time.</p>
      </div>
    );
  }

  return (
    <div id="plan-selector" className="max-w-5xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => {
          const isCurrent = plan.id === currentPlanId;
          const isSelected = plan.id === selectedPlanId;

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border-2 p-6 transition-shadow hover:shadow-md ${
                plan.tier === 'PREMIUM'
                  ? 'border-blue-300 bg-blue-50/30'
                  : plan.tier === 'ENTERPRISE'
                    ? 'border-purple-300 bg-purple-50/30'
                    : 'border-gray-200 bg-white'
              }`}
            >
              {/* Best value badge */}
              {plan.tier === 'PREMIUM' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    <Star className="w-3 h-3" />
                    Best Value
                  </span>
                </div>
              )}

              {/* Plan name + tier */}
              <div className="mb-3">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TIER_BADGE[plan.tier] ?? TIER_BADGE.STANDARD}`}
                >
                  {plan.tier}
                </span>
                <h3 className="mt-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                {plan.description && (
                  <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                )}
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">R{plan.monthlyPrice}</span>
                <span className="text-sm text-gray-500">/mo</span>
                {plan.annualPrice > 0 && (
                  <div className="mt-1 text-sm text-green-600">
                    R{plan.annualPrice}/yr — Save{' '}
                    {Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)}%
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{plan.pageLimits.maxPages} pages</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{plan.seatLimits.maxAdminSeats} admin seats</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{plan.seatLimits.maxStandardSeats} standard seats</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{plan.aiQuota.toLocaleString()} AI tokens</span>
                </li>
                {plan.modulesIncluded.length > 0 &&
                  plan.modulesIncluded.map(mod => (
                    <li key={mod} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{mod}</span>
                    </li>
                  ))}
              </ul>

              {/* Action button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : plan.monthlyPrice <= 0 ? (
                <CheckoutButton
                  planId={plan.id}
                  planName={plan.name}
                  amount={0}
                  onSuccess={() => handleSelect(plan.id)}
                />
              ) : (
                <div>
                  {!isSelected ? (
                    <button
                      type="button"
                      onClick={() => handleSelect(plan.id)}
                      className="w-full rounded-md bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors"
                    >
                      Subscribe — R{plan.monthlyPrice}/mo
                    </button>
                  ) : (
                    <CheckoutButton
                      planId={plan.id}
                      planName={plan.name}
                      amount={plan.monthlyPrice}
                      onSuccess={() => handleSelect(plan.id)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

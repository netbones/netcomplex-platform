'use client';

import { ShieldCheck, Shield, Users, AlertTriangle } from 'lucide-react';
import { getStandingTier, getStandingTierConfig } from '@entities/merit';
import type { StandingTier } from '@entities/merit';

const ICON_MAP: Record<StandingTier, typeof ShieldCheck> = {
  GOLD: ShieldCheck,
  SILVER: Shield,
  BRONZE: Users,
  WATCHLIST: AlertTriangle,
  PROBATION: AlertTriangle,
};

function getPublicLabel(tier: StandingTier): string | null {
  const config = getStandingTierConfig(tier);
  return config.publicLabel;
}

export { getStandingTierConfig };

interface StandingBadgeProps {
  points: number | null | undefined;
  context?: 'public' | 'admin';
  size?: 'sm' | 'md';
}

export function StandingBadge({ points, context = 'public', size = 'sm' }: StandingBadgeProps) {
  if (points == null) return null;

  const tier = getStandingTier(points);
  const config = getStandingTierConfig(tier);

  // Hide negative tiers from public view
  if (context === 'public' && config.publicLabel === null) return null;

  const Icon = ICON_MAP[tier];
  const displayLabel =
    context === 'public' && config.publicLabel ? config.publicLabel : config.label;
  const sizeClasses = size === 'md' ? 'px-3 py-1 text-sm gap-2' : 'px-2 py-0.5 text-xs gap-1';
  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.colorClasses}`}
    >
      <Icon className={iconSize} aria-hidden="true" />
      {displayLabel}
    </span>
  );
}

export function getPublicStandingLabel(points: number | null | undefined): string | null {
  if (points == null) return null;
  const tier = getStandingTier(points);
  return getPublicLabel(tier);
}

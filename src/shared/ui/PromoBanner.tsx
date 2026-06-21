'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { PromoIllustration } from './PromoIllustration';

export interface PromoBannerProps {
  /** Helper text shown next to the illustration */
  message: string;
  /** CTA button label */
  ctaLabel: string;
  /** Called when the CTA button is clicked */
  onCtaClick: () => void;
  /**
   * Called when the user dismisses the banner. Wire this to a persisted
   * preference (e.g. user settings / dashboardLayout JSON) so the banner
   * doesn't reappear. Omit to render without a dismiss control.
   */
  onDismiss?: () => void;
  /** Swap in a different illustration; defaults to the stacked-cards mascot */
  illustration?: React.ReactNode;
  className?: string;
}

/**
 * Reusable promo / empty-state banner for dashboard customisation prompts.
 * Used on /dashboard and other surfaces to nudge users toward an
 * unconfigured or under-used feature.
 */
export function PromoBanner({
  message,
  ctaLabel,
  onCtaClick,
  onDismiss,
  illustration,
  className = '',
}: PromoBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="region"
      aria-label={message}
      className={`relative flex items-center justify-between gap-4 rounded-2xl bg-soralia-primary/10 px-6 py-4 sm:gap-6 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        {illustration ?? <PromoIllustration />}
        <p className="text-sm leading-snug text-slate-700 sm:text-base">{message}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onCtaClick}
          className="whitespace-nowrap rounded-lg bg-soralia-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-soralia-primary/90 focus:outline-none focus:ring-2 focus:ring-soralia-primary focus:ring-offset-2"
        >
          {ctaLabel}
        </button>

        {onDismiss !== undefined && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-soralia-primary focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

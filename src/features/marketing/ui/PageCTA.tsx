import Link from 'next/link';
import { cn } from '@shared/lib';

interface PageCTAProps {
  title: string;
  description: string;
  primaryAction: {
    href: string;
    text: string;
  };
  secondaryAction?: {
    href: string;
    text: string;
  };
  className?: string;
  background?: 'canopy' | 'fieldstone' | 'gradient' | 'lapis';
  showAttribution?: boolean;
}

/**
 * PageCTA provides full-width call-to-action sections
 * for page endings. Follows NetComplex design patterns.
 */
export function PageCTA({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  background = 'lapis',
  showAttribution = false,
}: PageCTAProps) {
  const backgroundClasses = {
    canopy: 'bg-canopy text-white',
    fieldstone: 'bg-fieldstone',
    gradient: 'bg-gradient-to-r from-canopy to-canopy-600 text-white',
    lapis: 'bg-lapis-deep text-white',
  };

  return (
    <section className={cn('py-16', backgroundClasses[background], className)}>
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">
          {title}
          {showAttribution && (
            <span className="block text-lg font-normal text-lapis-azure/70 mt-1">
              by <b>Net</b>bones Africa
            </span>
          )}
        </h2>
        <p className="text-lg md:text-xl mb-8 opacity-90">{description}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href={primaryAction.href}
            className="inline-flex items-center px-8 py-4 bg-gold-vein text-lapis-deep font-semibold rounded-lg hover:bg-gold-vein/90 transition-colors"
          >
            {primaryAction.text}
          </Link>
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="inline-flex items-center px-8 py-4 border border-lapis-azure/40 text-white font-semibold rounded-lg hover:border-lapis-azure hover:bg-lapis-azure/10 transition-colors"
            >
              {secondaryAction.text}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

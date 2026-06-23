'use client';

import { useSafeTranslation } from '@shared/lib';
import { Breadcrumbs } from '@shared/ui';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface PageLoadingSkeletonProps {
  breadcrumbs: BreadcrumbItem[];
  title?: string;
  contentHeight?: string;
  className?: string;
}

/**
 * Hook to check if i18n is ready (delegates to useSafeTranslation for hydration safety)
 * @param additionalLoading - Optional additional loading state to combine
 * @returns Object with ready state, additional loading flag, and tx() function for hydration-safe translations
 */
export function useI18nReady(additionalLoading = false) {
  const { isReady: i18nReady, tx } = useSafeTranslation();
  const isReady = i18nReady && !additionalLoading;

  return {
    isReady,
    additionalLoading,
    tx,
  };
}

/**
 * Standardized loading skeleton for pages with breadcrumbs
 */
export function PageLoadingSkeleton({
  breadcrumbs,
  _title = 'Loading...',
  contentHeight = 'h-64',
  className = 'max-w-6xl mx-auto px-4 py-8',
}: PageLoadingSkeletonProps) {
  return (
    <div className={className}>
      <Breadcrumbs items={breadcrumbs} />
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
        <div className={`${contentHeight} bg-gray-200 rounded`} />
      </div>
    </div>
  );
}

/**
 * Hook that provides both ready state and loading skeleton.
 * Also exposes tx() from useSafeTranslation for hydration-safe breadcrumb labels.
 */
export function usePageLoading(
  breadcrumbs: BreadcrumbItem[],
  options: {
    title?: string;
    contentHeight?: string;
    className?: string;
    additionalLoading?: boolean;
  } = {}
) {
  const { isReady, tx } = useI18nReady(options.additionalLoading);

  const LoadingComponent = !isReady ? (
    <PageLoadingSkeleton
      breadcrumbs={breadcrumbs}
      title={options.title}
      contentHeight={options.contentHeight}
      className={options.className}
    />
  ) : null;

  return {
    isReady,
    LoadingComponent,
    tx,
  };
}

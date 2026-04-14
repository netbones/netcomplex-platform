'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@shared/ui/Breadcrumbs';

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
 * Hook to check if i18n is ready and component is mounted
 * @param additionalLoading - Optional additional loading state to combine
 * @returns Object with ready state and loading component
 */
export function useI18nReady(additionalLoading = false) {
  const { ready } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isReady = mounted && ready && !additionalLoading;

  return {
    isReady,
    mounted,
    ready,
    additionalLoading,
  };
}

/**
 * Standardized loading skeleton for pages with breadcrumbs
 */
export function PageLoadingSkeleton({
  breadcrumbs,
  title = 'Loading...',
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
 * Hook that provides both ready state and loading skeleton
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
  const { isReady } = useI18nReady(options.additionalLoading);

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
  };
}

'use client';

import React, { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Reusable Error Boundary component that catches JavaScript errors anywhere in the component tree
 * and displays a fallback UI instead of crashing the whole application.
 *
 * Usage:
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * Or with custom fallback:
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
function ErrorFallback({ error }: { error?: Error }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center bg-red-50 border border-red-200 rounded-lg">
      <div className="text-red-600 mb-4">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        {t('error.somethingWentWrong', 'Something went wrong')}
      </h3>
      <p className="text-red-600 mb-4 max-w-md">
        {t(
          'error.tryRefreshing',
          'Please try refreshing the page or contact support if the problem persists.'
        )}
      </p>
      {process.env.NODE_ENV === 'development' && error && (
        <details className="text-left bg-white p-4 rounded border max-w-2xl w-full">
          <summary className="cursor-pointer font-medium text-red-800 mb-2">
            Error Details (Development Only)
          </summary>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        {t('error.refreshPage', 'Refresh Page')}
      </button>
    </div>
  );
}

/**
 * Hook version for React 18+ error boundaries (alternative approach)
 * Note: This requires React 18+ and a compatible error boundary implementation
 */
// export function useErrorBoundary() {
//   const [error, setError] = useState<Error | null>(null);
//
//   const resetError = useCallback(() => setError(null), []);
//
//   const captureError = useCallback((error: Error) => setError(error), []);
//
//   return { error, resetError, captureError };
// }

'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { logError, createComponentLogger } from '@/lib/logging';
import { authClient } from '@/lib/auth-client';

const log = createComponentLogger('useApiToast');

export interface UseApiToastOptions {
  component?: string;
  onError?: (error: Error) => void;
}

export interface ExecuteOptions<T> {
  loading?: string;
  success?: string;
  error?: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retry?: boolean;
  retryCount?: number;
  silent?: boolean;
  critical?: boolean;
  duration?: number;
}

export interface UseApiToastReturn {
  mutate: <T>(promise: Promise<T>, options: ExecuteOptions<T>) => Promise<T | undefined>;
  fetch: <T>(
    promise: Promise<T>,
    options: Omit<ExecuteOptions<T>, 'loading' | 'success'>
  ) => Promise<T | undefined>;
  background: <T>(
    promise: Promise<T>,
    options?: { silent?: boolean; critical?: boolean }
  ) => Promise<T | undefined>;
  cancel: () => void;
}

export function useApiToast(options?: UseApiToastOptions): UseApiToastReturn {
  const component = options?.component || 'UnknownComponent';

  const logToServer = useCallback(
    (operation: string, error: unknown, context?: Record<string, unknown>) => {
      const isDev = process.env.NODE_ENV === 'development';

      // Console log in dev mode
      if (isDev) {
        log.error({ operation }, `${operation} failed`, error);
      }

      // Log to server via logging utility
      logError(
        {
          component,
          operation,
          ...context,
        },
        `${operation} failed`,
        error
      );

      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    },
    [component, options]
  );

  const cancel = useCallback(() => {
    toast.dismiss();
  }, []);

  const executeWithRetry = useCallback(
    async <T>(
      promise: Promise<T>,
      operation: string,
      options: {
        retry?: boolean;
        retryCount?: number;
        silent?: boolean;
        critical?: boolean;
        onRetry?: () => void;
      }
    ): Promise<T | undefined> => {
      const { retry = true, retryCount = 3, silent = false, critical = false, onRetry } = options;
      let lastError: unknown;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          const data = await promise;
          return data;
        } catch (error) {
          lastError = error;

          // Log every attempt failure
          logToServer(operation, error, {
            attempt: attempt + 1,
            maxRetries: retryCount,
            silent,
            critical,
          });

          // If retries enabled and not last attempt, retry
          if (retry && attempt < retryCount) {
            onRetry?.();
            // Wait before retry (exponential backoff: 1s, 2s, 4s)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      // All retries exhausted
      return undefined;
    },
    [logToServer]
  );

  const mutate = useCallback(
    async <T>(promise: Promise<T>, options: ExecuteOptions<T>): Promise<T | undefined> => {
      const {
        loading = 'Loading...',
        success,
        error: errorMessage = 'Something went wrong',
        onSuccess,
        onError,
        retry = true,
        retryCount = 3,
        silent = false,
        critical = false,
        duration,
      } = options;

      const operation = 'mutate';

      const result = await toast.promise(
        executeWithRetry(promise, operation, { retry, retryCount, silent, critical }),
        {
          loading: silent ? undefined : loading,
          success: silent
            ? undefined
            : data => {
                onSuccess?.(data as T);
                return success || 'Done';
              },
          error: silent
            ? undefined
            : err => {
                onError?.(err instanceof Error ? err : new Error(String(err)));
                return {
                  message: errorMessage,
                  description: err instanceof Error ? err.message : String(err),
                  ...(retry && {
                    action: {
                      label: 'Retry',
                      onClick: () => mutate(promise, options),
                    },
                  }),
                };
              },
          ...(duration && { duration }),
        }
      );

      return result as T | undefined;
    },
    [executeWithRetry]
  );

  const fetch = useCallback(
    async <T>(
      promise: Promise<T>,
      options: Omit<ExecuteOptions<T>, 'loading' | 'success'>
    ): Promise<T | undefined> => {
      const {
        error: errorMessage = 'Something went wrong',
        onSuccess,
        onError,
        retry = true,
        retryCount = 3,
        silent = false,
        critical = false,
        duration,
      } = options;

      const operation = 'fetch';

      const result = await toast.promise(
        executeWithRetry(promise, operation, { retry, retryCount, silent, critical }),
        {
          loading: silent ? undefined : 'Loading...',
          success: silent
            ? undefined
            : data => {
                onSuccess?.(data as T);
                return 'Loaded';
              },
          error: silent
            ? undefined
            : err => {
                onError?.(err instanceof Error ? err : new Error(String(err)));
                return {
                  message: errorMessage,
                  description: err instanceof Error ? err.message : String(err),
                  ...(retry && {
                    action: {
                      label: 'Retry',
                      onClick: () => fetch(promise, options),
                    },
                  }),
                };
              },
          ...(duration && { duration }),
        }
      );

      return result as T | undefined;
    },
    [executeWithRetry]
  );

  const background = useCallback(
    async <T>(
      promise: Promise<T>,
      options?: { silent?: boolean; critical?: boolean }
    ): Promise<T | undefined> => {
      const { silent = true, critical = false } = options || {};
      const operation = 'background';

      const result = await executeWithRetry(promise, operation, {
        retry: false, // Background tasks typically don't retry automatically
        silent,
        critical,
      });

      return result;
    },
    [executeWithRetry]
  );

  return { mutate, fetch, background, cancel };
}

/**
 * Standalone utility function for one-off toast handling
 * Use this when you don't need the full hook (e.g., simple fetch calls)
 */
export function toastPromise<T>(
  promise: Promise<T>,
  options: {
    loading?: string;
    success?: string;
    error?: string;
    component?: string;
    operation?: string;
    retry?: boolean;
    retryCount?: number;
  } = {}
): Promise<T | undefined> {
  const {
    loading = 'Loading...',
    success,
    error: errorMessage = 'Something went wrong',
    component = 'UnknownComponent',
    operation = 'api-call',
    retry = true,
    retryCount = 3,
  } = options;

  // Wrapper to handle retries
  const executeWithRetry = async (): Promise<T | undefined> => {
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await promise;
      } catch (error) {
        // Log error
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
          log.error({ operation, attempt: attempt + 1 }, `${operation} failed`, error);
        }
        logError({ component, operation, attempt: attempt + 1 }, `${operation} failed`, error);

        if (retry && attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return undefined;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toast.promise(executeWithRetry(), {
    loading,
    success: success ? data => success : undefined,
    error: err => ({
      message: errorMessage,
      description: err instanceof Error ? err.message : String(err),
      ...(retry && {
        action: {
          label: 'Retry',
          onClick: () => toastPromise(promise, options),
        },
      }),
    }),
  }) as unknown as Promise<T | undefined>;
}

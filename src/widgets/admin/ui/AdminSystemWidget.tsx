'use client';

import { ErrorBoundary } from '@shared/ui';
import { useSystemHealth } from '@features/admin';
import {
  Database,
  Users,
  UserCheck,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const STATUS_STYLES = {
  connected: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  disconnected: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  healthy: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  warning: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  error: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
} as const;

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'connected':
    case 'healthy':
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5" />;
    case 'error':
    case 'disconnected':
      return <XCircle className="w-3.5 h-3.5" />;
    default:
      return null;
  }
}

export function AdminSystemWidget() {
  const { data: health, isLoading, error, refetch, isFetching } = useSystemHealth();

  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const apiStatus = error ? 'error' : 'healthy';
  const dbStatus = health?.db ?? 'disconnected';

  return (
    <ErrorBoundary>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Status</h3>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="Refresh health check"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              Health check failed — the API may be unreachable.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API Health */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                API Health
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${STATUS_STYLES[apiStatus]}`}
              >
                <StatusIcon status={apiStatus} />
                {apiStatus}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-400" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {error ? '—' : 'OK'}
              </p>
            </div>
          </div>

          {/* Database */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Database</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${STATUS_STYLES[dbStatus]}`}
              >
                <StatusIcon status={dbStatus} />
                {dbStatus}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-400" />
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">PostgreSQL</p>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Users
              </span>
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {health?.activeUsers ?? '—'}
            </p>
          </div>

          {/* Total Users */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Users
              </span>
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {health?.totalUsers ?? '—'}
            </p>
          </div>

          {/* Tenant */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tenant</span>
              <Server className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {health?.tenantName ?? '—'}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5" title={health?.tenantId}>
              {health?.tenantId ?? ''}
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

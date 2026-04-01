'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface SystemStatus {
  apiHealth: 'healthy' | 'warning' | 'error';
  databaseStatus: 'connected' | 'disconnected';
  uptime: string;
  lastBackup: string;
  activeUsers: number;
}

export function AdminSystemWidget() {
  const { t } = useTranslation('admin');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    apiHealth: 'healthy',
    databaseStatus: 'connected',
    uptime: '0d 0h 0m',
    lastBackup: 'Unknown',
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSystemStatus() {
      try {
        // Mock system status - in real app, this would call a health check API
        const mockStatus: SystemStatus = {
          apiHealth: 'healthy',
          databaseStatus: 'connected',
          uptime: '7d 14h 32m', // Mock uptime
          lastBackup: new Date(Date.now() - 86400000).toLocaleDateString(), // 1 day ago
          activeUsers: Math.floor(Math.random() * 20) + 5, // Mock active users
        };

        // Simulate API delay
        setTimeout(() => {
          setSystemStatus(mockStatus);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Failed to fetch system status:', error);
        setLoading(false);
      }
    }

    fetchSystemStatus();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'disconnected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'fa-check-circle';
      case 'warning':
        return 'fa-exclamation-triangle';
      case 'error':
      case 'disconnected':
        return 'fa-times-circle';
      default:
        return 'fa-question-circle';
    }
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">API Health</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemStatus.apiHealth)}`}
              >
                <i className={`fas ${getStatusIcon(systemStatus.apiHealth)} mr-1`}></i>
                {systemStatus.apiHealth}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">99.9%</p>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Database</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemStatus.databaseStatus)}`}
              >
                <i className={`fas ${getStatusIcon(systemStatus.databaseStatus)} mr-1`}></i>
                {systemStatus.databaseStatus}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">PostgreSQL</p>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Active Users</span>
              <i className="fas fa-users text-blue-600"></i>
            </div>
            <p className="text-2xl font-bold text-gray-900">{systemStatus.activeUsers}</p>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">System Uptime</span>
              <i className="fas fa-server text-green-600"></i>
            </div>
            <p className="text-lg font-semibold text-gray-900">{systemStatus.uptime}</p>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Last Backup</span>
              <i className="fas fa-shield-alt text-purple-600"></i>
            </div>
            <p className="text-sm font-semibold text-gray-900">{systemStatus.lastBackup}</p>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <i className="fas fa-tools text-orange-600"></i>
              <div>
                <p className="text-sm font-medium text-gray-600">Quick Actions</p>
                <div className="flex gap-2 mt-1">
                  <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                    Restart
                  </button>
                  <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                    Backup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

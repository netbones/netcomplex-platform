'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

import { AlertCircle, BarChart3, HelpCircle, Plus, Reply } from 'lucide-react';
const log = createComponentLogger('SurveysWidget');

export interface SurveyItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  _count?: { questions: number; responses: number };
  createdAt: string;
}

export function SurveysWidget() {
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSurveys() {
      try {
        const { data } = await apiGet<SurveyItem[]>('/api/surveys');
        setSurveys(data ?? []);
      } catch (err) {
        log.error({ operation: 'fetchSurveys' }, 'Failed to fetch surveys', err);
        setError('Failed to load surveys');
      } finally {
        setLoading(false);
      }
    }

    fetchSurveys();
  }, []);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiGet<SurveyItem[]>('/api/surveys');
      setSurveys(data ?? []);
    } catch (err) {
      log.error({ operation: 'retryFetch' }, 'Failed to retry fetch surveys', err);
      setError('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="text-center py-4">
          <AlertCircle className="text-2xl text-red-500 mb-2" />
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  if (surveys.length === 0) {
    return (
      <ErrorBoundary>
        <div className="text-center py-6">
          <BarChart3 className="text-3xl text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-3">No surveys yet</p>
          <Link
            href="/admin/surveys/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus />
            Create Survey
          </Link>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <ul className="space-y-3">
          {surveys.slice(0, 5).map(survey => (
            <li
              key={survey.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                <BarChart3 className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{survey.title}</p>
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${statusColors[survey.status] || 'bg-gray-100'}`}
                  >
                    {survey.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>
                    <HelpCircle className="mr-1" />
                    {survey._count?.questions ?? 0} questions
                  </span>
                  <span>
                    <Reply className="mr-1" />
                    {survey._count?.responses ?? 0} responses
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/surveys/${survey.id}`}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex-shrink-0"
              >
                View Results
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-3 border-t border-gray-200">
          <Link
            href="/admin/surveys"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            View All Surveys →
          </Link>
        </div>
      </div>
    </ErrorBoundary>
  );
}

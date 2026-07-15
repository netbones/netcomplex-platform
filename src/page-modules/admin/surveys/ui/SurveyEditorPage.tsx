'use client';

import React from 'react';
import Link from 'next/link';
import { ErrorBoundary, LoadingSpinner } from '@shared/ui';
import { SurveyEditor } from '@features/survey-builder';

import { AlertCircle, ChevronRight } from 'lucide-react';
interface SurveyEditorPageProps {
  surveyId: string;
}

export function SurveyEditorPage({ surveyId }: SurveyEditorPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <nav className="text-sm mb-4">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-indigo-600 hover:text-indigo-800">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="text-gray-400 text-xs mx-1" />
            </li>
            <li>
              <Link href="/admin" className="text-indigo-600 hover:text-indigo-800">
                Admin
              </Link>
            </li>
            <li>
              <ChevronRight className="text-gray-400 text-xs mx-1" />
            </li>
            <li>
              <Link href="/admin/surveys" className="text-indigo-600 hover:text-indigo-800">
                Surveys
              </Link>
            </li>
            <li>
              <ChevronRight className="text-gray-400 text-xs mx-1" />
            </li>
            <li className="text-gray-900 font-medium">{surveyId === 'new' ? 'New' : 'Edit'}</li>
          </ol>
        </nav>

        <ErrorBoundary
          fallback={
            <div className="text-center py-12">
              <AlertCircle className="text-3xl text-red-500 mb-4" />
              <p className="text-gray-600">Failed to load the survey editor.</p>
            </div>
          }
        >
          <React.Suspense
            fallback={
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <SurveyEditor surveyId={surveyId} />
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

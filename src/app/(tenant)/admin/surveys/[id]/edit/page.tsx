'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { ErrorBoundary, LoadingSpinner } from '@shared/ui';
import { SurveyEditor } from '@/components/surveys/builder/SurveyEditor';

interface EditSurveyPageProps {
  params: Promise<{ id: string }>;
}

export default function EditSurveyPage({ params }: EditSurveyPageProps) {
  const { id: surveyId } = use(params);

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
              <i className="fas fa-chevron-right text-gray-400 text-xs mx-1"></i>
            </li>
            <li>
              <Link href="/admin" className="text-indigo-600 hover:text-indigo-800">
                Admin
              </Link>
            </li>
            <li>
              <i className="fas fa-chevron-right text-gray-400 text-xs mx-1"></i>
            </li>
            <li>
              <Link href="/admin/surveys" className="text-indigo-600 hover:text-indigo-800">
                Surveys
              </Link>
            </li>
            <li>
              <i className="fas fa-chevron-right text-gray-400 text-xs mx-1"></i>
            </li>
            <li className="text-gray-900 font-medium">Edit</li>
          </ol>
        </nav>

        <ErrorBoundary
          fallback={
            <div className="text-center py-12">
              <i className="fas fa-exclamation-circle text-3xl text-red-500 mb-4"></i>
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

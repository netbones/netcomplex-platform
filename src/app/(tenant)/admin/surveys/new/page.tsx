'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs, LoadingSpinner } from '@shared/ui';
import { SurveyEditor } from '@/components/surveys/builder/SurveyEditor';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('new-survey-page');

export default function NewSurveyPage() {
  const router = useRouter();
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Untitled Survey',
        description: '',
        status: 'DRAFT',
      }),
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Failed to create survey: ${res.status}`);
        const body = await res.json();
        const survey = body.success ? body.data : body;
        if (!cancelled) {
          setSurveyId(survey.id);
          router.replace(`/admin/surveys/${survey.id}/edit`);
        }
      })
      .catch(err => {
        log.error({}, 'Failed to create survey', err);
        if (!cancelled) setError('Failed to create survey. Please try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Admin', href: '/admin' },
            { label: 'Surveys', href: '/admin/surveys' },
            { label: 'New Survey' },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!surveyId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Admin', href: '/admin' },
            { label: 'Surveys', href: '/admin/surveys' },
            { label: 'New Survey' },
          ]}
        />
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Surveys', href: '/admin/surveys' },
          { label: 'New Survey' },
        ]}
      />
      <SurveyEditor surveyId={surveyId} />
    </div>
  );
}

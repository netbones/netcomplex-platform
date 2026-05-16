'use client';

import { useEffect, useState } from 'react';
import { ErrorBoundary, usePageLoading } from '@shared/ui';

interface Competition {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  prizeInfo: string | null;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  entryCount: number;
  image: string | null;
}

function CompetitionContent() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Competition', href: '/competition' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    fetch('/api/competitions?upcoming=true')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch competitions');
        return res.json();
      })
      .then(data => {
        setCompetitions(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (!isReady) {
    return LoadingComponent;
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="text-center text-gray-500">
          <p>Unable to load competitions. Please try again later.</p>
        </div>
      </main>
    );
  }

  const activeCompetition = competitions.length > 0 ? competitions[0] : null;

  if (!activeCompetition) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="text-center">
          <span className="inline-block bg-gray-100 text-gray-600 text-sm font-semibold px-4 py-1 rounded-full mb-4">
            Competitions
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            No Active Competitions
          </h1>
          <p className="text-xl text-gray-600">
            There are no active competitions at the moment. Check back soon!
          </p>
        </div>
      </main>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-1 rounded-full mb-4">
          {activeCompetition.status}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {activeCompetition.title}
        </h1>
        {activeCompetition.description && (
          <p className="text-xl text-gray-600">{activeCompetition.description}</p>
        )}
      </div>

      {activeCompetition.image && (
        <div className="max-w-4xl mx-auto mb-12">
          <img
            src={activeCompetition.image}
            alt={activeCompetition.title}
            className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto mb-8">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Starts</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(activeCompetition.startDate)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Ends</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(activeCompetition.endDate)}
            </p>
          </div>
        </div>
      </div>

      {activeCompetition.prizeInfo && (
        <div className="max-w-3xl mx-auto mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Prizes</h2>
          <p className="text-gray-700 text-center whitespace-pre-wrap">
            {activeCompetition.prizeInfo}
          </p>
        </div>
      )}

      <div className="text-center mb-12">
        <button className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg">
          <i className="fas fa-camera mr-2"></i>
          Submit Your Entry!
        </button>
        <p className="text-gray-500 mt-2 text-sm">
          {activeCompetition.entryCount} {activeCompetition.entryCount === 1 ? 'entry' : 'entries'}{' '}
          so far
        </p>
      </div>

      {activeCompetition.rules && (
        <div className="mt-16 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Competition Rules</h2>
          <div className="max-w-2xl mx-auto text-gray-700 space-y-4 whitespace-pre-wrap">
            {activeCompetition.rules}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Questions? Contact the competition organizer through the admin panel.
        </p>
      </div>
    </main>
  );
}

export default function CompetitionPage() {
  return (
    <ErrorBoundary>
      <CompetitionContent />
    </ErrorBoundary>
  );
}

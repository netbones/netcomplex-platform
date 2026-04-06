'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  _count: { questions: number; responses: number };
  createdAt: string;
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/surveys')
      .then(res => res.json())
      .then(data => {
        setSurveys(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Surveys' },
        ]}
      />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Surveys & Polls</h1>
        <Link
          href="/admin/surveys/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Create Survey
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading surveys...</p>
      ) : surveys.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No surveys yet</p>
          <Link href="/admin/surveys/new" className="text-indigo-600 hover:underline">
            Create your first survey
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Responses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {surveys.map(survey => (
                <tr key={survey.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{survey.title}</div>
                    {survey.description && (
                      <div className="text-sm text-gray-500">{survey.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${statusColors[survey.status] || 'bg-gray-100'}`}
                    >
                      {survey.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{survey._count.questions}</td>
                  <td className="px-6 py-4 text-gray-500">{survey._count.responses}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/surveys/${survey.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

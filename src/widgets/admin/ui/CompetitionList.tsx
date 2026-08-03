'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import type { Competition } from './competition/types';
import { STATUS_COLORS, TYPE_BADGE_COLORS, TYPE_LABELS, formatDate } from './competition/types';
import { ParticipantsPanel } from './competition/ParticipantsPanel';
import { apiGet, apiDelete } from '@/shared/api/http-client';

export function CompetitionList() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Competition[]>('/api/competitions')
      .then(({ data }) => {
        setCompetitions(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/competitions/${id}`);
      setCompetitions(competitions.filter(c => c.id !== id));
      toast.success('Competition deleted');
    } catch {
      toast.error('Failed to delete competition');
    }
    setDeleteId(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading competitions...</div>;
  }

  if (competitions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No competitions yet. Create your first competition!
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-10 px-2" />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Start Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              End Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Entries
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {competitions.map(competition => (
            <Fragment key={competition.id}>
              <tr
                className={`hover:bg-gray-50 cursor-pointer ${expandedId === competition.id ? 'bg-indigo-50' : ''}`}
                onClick={() => setExpandedId(expandedId === competition.id ? null : competition.id)}
              >
                <td className="px-2 py-4">
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === competition.id ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">{competition.title}</div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${TYPE_BADGE_COLORS[competition.type] || 'bg-gray-100 text-gray-500'}`}
                  >
                    {TYPE_LABELS[competition.type] || competition.type}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {formatDate(competition.startDate)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {formatDate(competition.endDate)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[competition.status] || 'bg-gray-100 text-gray-500'}`}
                  >
                    {competition.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">{competition.entryCount}</td>
                <td className="px-4 py-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                  <Link
                    href={`/admin/competitions/${competition.id}`}
                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                  >
                    Edit
                  </Link>
                  {deleteId === competition.id ? (
                    <span className="inline-flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleDelete(competition.id)}
                        className="text-red-600 hover:text-red-900 text-xs font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeleteId(competition.id)}
                      className="text-red-600 hover:text-red-900 text-sm ml-2"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === competition.id && (
                <tr>
                  <td colSpan={8} className="bg-gray-50 border-b border-gray-200">
                    <ParticipantsPanel competition={competition} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

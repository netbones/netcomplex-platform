'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Competition {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  entryCount: number;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<Competition['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-800',
  ENDED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function CompetitionList() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/competitions')
      .then(res => res.json())
      .then(data => {
        setCompetitions(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/competitions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCompetitions(competitions.filter(c => c.id !== id));
    }
    setDeleteId(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading competitions...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entries
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {competitions.map(competition => (
              <tr key={competition.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{competition.title}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(competition.startDate).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(competition.endDate).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full ${statusColors[competition.status]}`}
                  >
                    {competition.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{competition.entryCount}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link
                    href={`/admin/competitions/${competition.id}`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <i className="fas fa-edit"></i>
                  </Link>
                  {deleteId === competition.id ? (
                    <div className="inline-flex items-center gap-1">
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
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(competition.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {competitions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No competitions yet. Create your first competition!
          </div>
        )}
      </div>
    </>
  );
}

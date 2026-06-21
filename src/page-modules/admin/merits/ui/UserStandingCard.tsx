'use client';

import { useState, useEffect } from 'react';
import { Shield, Award, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getStandingTier, type StandingTier } from '@entities/merit';

interface CommunityMerit {
  id: string;
  behaviorType: string;
  category: string;
  recognitionPoints: number;
  disciplinaryPoints: number;
  status: string;
  createdAt: string;
}

const TIER_BADGES: Record<StandingTier, { className: string; label: string }> = {
  GOLD: { className: 'bg-amber-100 text-amber-800', label: 'Gold' },
  SILVER: { className: 'bg-gray-200 text-gray-700', label: 'Silver' },
  BRONZE: { className: 'bg-emerald-100 text-emerald-800', label: 'Bronze' },
  WATCHLIST: { className: 'bg-yellow-100 text-yellow-800', label: 'Watchlist' },
  PROBATION: { className: 'bg-red-100 text-red-800', label: 'Probation' },
};

export function UserStandingCard() {
  const [recognition, setRecognition] = useState(0);
  const [disciplinary, setDisciplinary] = useState(0);
  const [records, setRecords] = useState<CommunityMerit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/merits?limit=100&userId=self')
      .then(res => res.json())
      .then(data => {
        const rows: CommunityMerit[] = data.data || [];
        setRecords(rows);
        const rec = rows
          .filter(r => r.status !== 'OVERTURNED')
          .reduce((sum, r) => sum + r.recognitionPoints, 0);
        const disc = rows
          .filter(r => r.status !== 'OVERTURNED')
          .reduce((sum, r) => sum + r.disciplinaryPoints, 0);
        setRecognition(rec);
        setDisciplinary(disc);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const overall = recognition - disciplinary;
  const tier = getStandingTier(overall);
  const tierConf = TIER_BADGES[tier];
  const infractionCount = records.filter(
    r => r.behaviorType === 'INFRACTION' && (r.status === 'ACTIVE' || r.status === 'UPHELD')
  ).length;
  const escalationStatus =
    infractionCount >= 5
      ? { text: '🔴 Suspension Recommended', className: 'text-red-700' }
      : infractionCount >= 3
        ? { text: '⚠ Review Flagged', className: 'text-amber-700' }
        : { text: 'No escalation flags', className: 'text-gray-500' };

  if (loading)
    return (
      <div className="p-6">
        <Shield className="animate-spin w-8 h-8 text-indigo-600" />
      </div>
    );

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/merits" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Resident Standing</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${tierConf.className}`}
          >
            <Shield className="w-4 h-4" />
            {tierConf.label}
          </span>
          <span className="text-3xl font-bold mt-2">{overall}</span>
          <span className="text-xs text-gray-500">Overall Standing</span>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <Award className="w-5 h-5 text-green-600" />
          <span className="text-2xl font-bold text-green-600 mt-1">+{recognition}</span>
          <span className="text-xs text-gray-500">Recognition Score</span>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-2xl font-bold text-red-600 mt-1">-{disciplinary}</span>
          <span className="text-xs text-gray-500">Disciplinary Score</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{infractionCount} active infractions</span>
          <span className={`text-sm ${escalationStatus.className}`}>{escalationStatus.text}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rec.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Disc.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b">
                <td className="px-4 py-3">{r.behaviorType}</td>
                <td className="px-4 py-3 text-gray-600">{r.category.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  {r.recognitionPoints > 0 ? `+${r.recognitionPoints}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {r.disciplinaryPoints > 0 ? `-${r.disciplinaryPoints}` : '—'}
                </td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

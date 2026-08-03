'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DisputeCaseDTO } from '../model/types';
import { ALL_DISPUTE_STATUSES, ALL_DISPUTE_CATEGORIES } from '../model/constants';
import { DisputeStatusBadge } from './DisputeStatusBadge';
import { DisputeCategoryBadge } from './DisputeCategoryBadge';
import { SeverityIndicator } from './SeverityIndicator';
import { LoadingSkeleton } from '@shared/ui';
import Link from 'next/link';
import { formatDate } from '@shared/lib';
import { apiGet, ApiClientError } from '@/shared/api/http-client';

/* ── Helpers ───────────────────────────────────────────── */

function getComplainantLabel(dispute: DisputeCaseDTO): string {
  return dispute.complainantName ?? 'Resident';
}

/* ── Component ─────────────────────────────────────────── */

export function DisputeListTable() {
  const [disputes, setDisputes] = useState<DisputeCaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<
    'createdAt' | 'title' | 'referenceNumber' | 'severity'
  >('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search) params.set('search', search);

      const { data } = await apiGet<DisputeCaseDTO[]>(`/api/disputes?${params}`);
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 403) {
        setError("You don't have permission to view disputes.");
      } else {
        setError('Failed to load disputes. Please try again.');
      }
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  /* ── Sort ───────────────────────────────────────────── */
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedDisputes = [...disputes].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'createdAt') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortField === 'referenceNumber') {
      cmp = a.referenceNumber.localeCompare(b.referenceNumber);
    } else if (sortField === 'severity') {
      const sevOrder: Record<string, number> = { MINOR: 0, MODERATE: 1, SERIOUS: 2, URGENT: 3 };
      cmp = (sevOrder[a.severity] ?? 0) - (sevOrder[b.severity] ?? 0);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  /* ── Render helpers ──────────────────────────────────── */
  const SortHeader = ({ field, label }: { field: typeof sortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
      onClick={() => handleSort(field)}
      role="columnheader"
      aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {sortField === field && <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );

  return (
    <div>
      {/* ── Filters Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or description..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          aria-label="Search disputes"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {ALL_DISPUTE_STATUSES.map(s => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {ALL_DISPUTE_CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <button
          onClick={fetchDisputes}
          className="px-4 py-2 bg-soralia-primary text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* ── Loading State ────────────────────────────────── */}
      {loading && (
        <div className="space-y-2" role="status" aria-label="Loading disputes">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border border-gray-200 rounded-lg">
              <LoadingSkeleton lines={3} height="h-4" />
            </div>
          ))}
        </div>
      )}

      {/* ── Error State ──────────────────────────────────── */}
      {!loading && error && (
        <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">{error}</p>
          <button
            onClick={fetchDisputes}
            className="mt-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm hover:bg-amber-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────── */}
      {!loading && !error && disputes.length === 0 && (
        <div className="p-12 text-center bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Disputes</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Disputes filed in your community will appear here. Use File a Dispute to begin the
            resolution process.
          </p>
        </div>
      )}

      {/* ── Table (md+) ──────────────────────────────────── */}
      {!loading && !error && disputes.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortHeader field="referenceNumber" label="Reference" />
                  <SortHeader field="title" label="Title" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <SortHeader field="severity" label="Severity" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Complainant
                  </th>
                  <SortHeader field="createdAt" label="Created" />
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedDisputes.map(dispute => (
                  <tr
                    key={dispute.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => window.location.assign(`/admin/disputes/${dispute.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-700">
                        {dispute.referenceNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900 line-clamp-1 max-w-xs">
                        {dispute.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DisputeCategoryBadge category={dispute.category} />
                    </td>
                    <td className="px-4 py-3">
                      <DisputeStatusBadge status={dispute.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SeverityIndicator severity={dispute.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{getComplainantLabel(dispute)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(dispute.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/disputes/${dispute.id}`}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label={`View dispute ${dispute.referenceNumber}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Card Stack (mobile) ───────────────────────── */}
          <div className="md:hidden space-y-3">
            {sortedDisputes.map(dispute => (
              <Link
                key={dispute.id}
                href={`/admin/disputes/${dispute.id}`}
                className="block p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-mono text-gray-700">{dispute.referenceNumber}</span>
                  <DisputeStatusBadge status={dispute.status} />
                </div>
                <h4 className="text-sm font-medium text-gray-900 line-clamp-1 mb-2">
                  {dispute.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <DisputeCategoryBadge category={dispute.category} />
                  <SeverityIndicator severity={dispute.severity} />
                  <span>·</span>
                  <span>{formatDate(dispute.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

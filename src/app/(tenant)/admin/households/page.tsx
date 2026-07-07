'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumbs } from '@shared/ui';

interface Household {
  id: string;
  propertyId: string;
  street: string;
  unit: string;
  homeImage: string | null;
  platformAddress: string;
  status: string;
  createdAt: string;
  occupantCount: number;
  primaryOwner: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function HouseholdsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchHouseholds();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, page]);

  const fetchHouseholds = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/households?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`
      );
      if (res.ok) {
        const body = await res.json();
        const data = body?.data ?? body;
        setHouseholds(data.households || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch households:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Households' }]} />

      <div className="flex items-center gap-3 mb-6">
        <Image src="/platform/households.svg" alt="" width={32} height={32} />
        <h1 className="text-2xl font-bold text-gray-900">Households</h1>
        <span className="text-sm text-gray-500 ml-auto">{total} households</span>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Search by street, unit, or owner..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Primary Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occupants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platform Address
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Loading households...
                </td>
              </tr>
            ) : households.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {search ? 'No households match your search' : 'No households found'}
                </td>
              </tr>
            ) : (
              households.map(household => (
                <tr key={household.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {household.homeImage ? (
                        <Image
                          src={household.homeImage}
                          alt={`${household.street} ${household.unit}`}
                          width={40}
                          height={40}
                          className="rounded-lg object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <i className="fas fa-home text-indigo-400"></i>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {household.street}, Unit {household.unit}
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                            household.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {household.status}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {household.primaryOwner ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {household.primaryOwner.name}
                        </div>
                        <div className="text-sm text-gray-500">{household.primaryOwner.email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No owner</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{household.occupantCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 font-mono">
                      {household.platformAddress}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/households/${household.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

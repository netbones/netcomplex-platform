'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DirectoryGrid } from '@/components/directory/DirectoryGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { STREETS } from '@/lib/constants';

interface Resident {
  id: string;
  name: string;
  email: string;
  street: string | null;
  unit: string | null;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  homeImage: string | null;
  isPublic: boolean;
  residentType?: 'OWNER' | 'RENTER';
  role?: string;
}

export default function DirectoryPage() {
  const [mounted, setMounted] = useState(false);
  const { t, ready } = useTranslation(['common', 'directory']);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 6;
  const [filterType, setFilterType] = useState('All Residents');
  const [filterStreet, setFilterStreet] = useState('All Streets');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchResidents() {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filterStreet !== 'All Streets') params.set('street', filterStreet);
        params.set('page', String(page));
        params.set('limit', String(limit));

        if (filterType !== 'All Residents') {
          const filterValue = filterType.replace(' Members', '').replace('s', '');
          if (filterValue === 'Board') {
            params.set('role', 'BOARD');
          } else if (filterValue === 'Committee') {
            params.set('role', 'COMMITTEE');
          } else if (filterValue === 'Owner') {
            params.set('residentType', 'OWNER');
          } else if (filterValue === 'Renter') {
            params.set('residentType', 'RENTER');
          }
        }

        const res = await fetch(`/api/users?${params}`);
        const data = await res.json();
        if (data.users) {
          setResidents(data.users);
          setTotal(data.total || 0);
        } else if (Array.isArray(data)) {
          setResidents(data);
          setTotal(data.length);
        } else {
          setResidents([]);
        }
      } catch (error) {
        console.error('Failed to fetch residents:', error);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchResidents, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [search, filterStreet, filterType, page]);

  if (!mounted || !ready) {
    return (
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-soralia-light">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.directory') }]} />
        <h1 className="text-4xl font-bold text-soralia-primary mb-8">{t('directory:title')}</h1>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          />

          <div className="flex flex-wrap items-center gap-4">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            >
              <option>All Residents</option>
              <option>Board Members</option>
              <option>Committee Members</option>
              <option>Renters</option>
              <option>Owners</option>
            </select>

            <select
              value={filterStreet}
              onChange={e => setFilterStreet(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            >
              <option>All Streets</option>
              {STREETS.map(street => (
                <option key={street}>{street}</option>
              ))}
            </select>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">View:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${
                  viewMode === 'grid'
                    ? 'bg-soralia-primary text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                aria-label="Grid view"
              >
                <i className="fas fa-th-large" aria-hidden="true"></i>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${
                  viewMode === 'list'
                    ? 'bg-soralia-primary text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                aria-label="List view"
              >
                <i className="fas fa-list" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading residents...</p>
          </div>
        ) : (
          <DirectoryGrid residents={residents} viewMode={viewMode} />
        )}

        {total > limit && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

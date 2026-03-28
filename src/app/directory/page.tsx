'use client';

import { useState, useEffect } from 'react';
import { DirectoryGrid } from '@/components/directory/DirectoryGrid';

interface Resident {
  id: string;
  name: string;
  email: string;
  street: string | null;
  unit: string | null;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  isPublic: boolean;
}

export default function DirectoryPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function fetchResidents() {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);

        const res = await fetch(`/api/users?${params}`);
        const data = await res.json();
        setResidents(data);
      } catch (error) {
        console.error('Failed to fetch residents:', error);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchResidents, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <main className="min-h-screen bg-soralia-light">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-soralia-primary mb-8">Community Directory</h1>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          />

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

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading residents...</p>
          </div>
        ) : (
          <DirectoryGrid residents={residents} viewMode={viewMode} />
        )}
      </div>
    </main>
  );
}

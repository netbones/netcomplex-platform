'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import {
  STREETS,
  CARD_HEADER_COLORS,
  CARD_ANIMATIONS,
  INTEREST_COLORS,
  RESIDENT_TYPES,
} from '@/lib/constants';
import type { ResidentType } from '@/lib/constants';

const CommunityMap = dynamic(
  () => import('@/components/ui/CommunityMap').then(mod => mod.CommunityMap),
  {
    ssr: false,
    loading: () => <div className="h-96 w-full bg-gray-100 rounded-lg animate-pulse" />,
  }
);

import { Carousel } from '@/components/ui/Carousel';

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
  residentType?: ResidentType;
  role?: string;
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { t, ready } = useTranslation('common');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Residents');
  const [filterStreet, setFilterStreet] = useState('All Streets');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 6;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchResidents() {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filterStreet !== 'All Streets') params.set('street', filterStreet);
        params.set('page', String(page));
        params.set('limit', String(limit));

        const res = await fetch(`/api/users?${params}`);
        const data = await res.json();
        if (data.users) {
          setResidents(data.users || []);
          setTotal(data.total || 0);
        } else if (Array.isArray(data)) {
          setResidents(data);
          setTotal(data.length);
        } else {
          setResidents([]);
        }
      } catch (error) {
        console.error('Failed to fetch residents:', error);
        setResidents([]);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchResidents, searchQuery ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [searchQuery, filterStreet, page]);

  if (!mounted || !ready) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const filteredResidents = residents.filter(r => {
    const address = [r.street, r.unit].filter(Boolean).join(', ');
    const interestList = Array.isArray(r.interests) ? r.interests : [];

    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interestList.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesType = true;
    if (filterType !== 'All Residents') {
      const filterValue = filterType.replace(' Members', '').replace('s', '');
      if (filterValue === 'Board') {
        matchesType = r.role === 'BOARD';
      } else if (filterValue === 'Committee') {
        matchesType = r.role === 'COMMITTEE';
      } else if (filterValue === 'Owner') {
        matchesType = r.residentType === 'OWNER';
      } else if (filterValue === 'Renter') {
        matchesType = r.residentType === 'RENTER';
      }
    }
    return matchesSearch && matchesType;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Carousel for For Sale / To Let / etc */}
      <div className="mb-8">
        <Carousel
          items={[
            {
              id: '1',
              image: '/carousel/1.jpg',
              title: 'For Sale',
              subtitle: '2 Bedroom Family Home',
              link: '#',
            },
            {
              id: '2',
              image: '/carousel/2.jpg',
              title: 'To Let',
              subtitle: 'Modern Lifestyle',
              link: '#',
            },
            {
              id: '3',
              image: '/carousel/3.jpg',
              title: 'Community',
              subtitle: 'Soralia Village Living',
              link: '#',
            },
            {
              id: '4',
              image: '/carousel/4.jpg',
              title: 'Events',
              subtitle: 'Join Our Community',
              link: '#',
            },
          ]}
        />
      </div>

      {/* Community Map */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-soralia-dark mb-6">{t('home.ourCommunity')}</h2>
        <div className="h-96 w-full bg-gray-100 rounded-lg mb-4">
          <CommunityMap />
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>{t('home.exploreMap')}</p>
          <p className="mt-2">
            {t('home.mapData')}{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              className="text-soralia-primary hover:underline"
            >
              OpenStreetMap
            </a>{' '}
            {t('home.mapContributors')}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-soralia-dark mb-6">
          {t('home.communityDirectory')}
        </h2>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400" aria-hidden="true"></i>
          </div>
          <button className="bg-soralia-primary text-white py-2 px-6 rounded-md hover:bg-indigo-700 transition">
            {t('home.search')}
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <label className="mr-2 text-sm text-gray-700">{t('home.filter')}:</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-soralia-primary"
            >
              <option>{t('home.allResidents')}</option>
              <option>{t('home.boardMembers')}</option>
              <option>{t('home.committeeMembers')}</option>
              <option>{t('home.renters')}</option>
              <option>{t('home.owners')}</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="mr-2 text-sm text-gray-700">{t('home.street')}:</label>
            <select
              value={filterStreet}
              onChange={e => setFilterStreet(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-soralia-primary"
            >
              <option>{t('home.allStreets')}</option>
              {STREETS.map(street => (
                <option key={street}>{street}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="mr-2 text-sm text-gray-700">{t('home.sortBy')}:</label>
            <select className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-soralia-primary">
              <option>{t('home.nameAZ')}</option>
              <option>{t('home.nameZA')}</option>
              <option>{t('home.street')}</option>
              <option>Unit Number</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Results */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-soralia-dark">
            {loading
              ? t('home.loading')
              : t('home.showingResidents', { count: filteredResidents.length })}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{t('home.view')}:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              <i className="fas fa-th-large" aria-hidden="true"></i>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              <i className="fas fa-list" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('home.loading')}</p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredResidents.map((resident, idx) => {
              const headerColor = CARD_HEADER_COLORS[idx % CARD_HEADER_COLORS.length];
              const avatarUrl =
                resident.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;
              const address = [resident.street, resident.unit].filter(Boolean).join(', ');
              const interestList = Array.isArray(resident.interests) ? resident.interests : [];

              return (
                <Link
                  key={resident.id}
                  href={`/resident/${resident.id}`}
                  className={`block bg-white rounded-lg shadow-md overflow-hidden hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer ${CARD_ANIMATIONS.transition} ${viewMode === 'list' ? 'flex' : ''}`}
                >
                  <div
                    className={`${headerColor} p-4 text-white ${viewMode === 'list' ? 'w-64 shrink-0' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 relative">
                        <Image
                          src={avatarUrl}
                          alt={resident.name}
                          fill
                          sizes="40px"
                          className="rounded-full bg-white/20"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{resident.name}</h3>
                        <p className="text-sm opacity-90">{address}</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`p-4 flex gap-4 ${viewMode === 'list' ? 'flex-1 items-center' : 'items-start'}`}
                  >
                    <div
                      className={resident.homeImage && viewMode === 'grid' ? 'flex-1' : 'flex-1'}
                    >
                      <div className="flex items-center mb-2">
                        <i
                          className="fas fa-home text-soralia-secondary mr-2"
                          aria-hidden="true"
                        ></i>
                        <span className="text-sm text-gray-600">
                          {resident.residentType === RESIDENT_TYPES.OWNER
                            ? t('home.owner')
                            : resident.residentType === RESIDENT_TYPES.RENTER
                              ? t('home.renter')
                              : resident.role || t('home.resident')}
                        </span>
                      </div>
                      {resident.isPublic && (
                        <>
                          <div className="flex items-center mb-2">
                            <i
                              className="fas fa-envelope text-soralia-secondary mr-2"
                              aria-hidden="true"
                            ></i>
                            <span className="text-sm text-gray-600">{resident.email}</span>
                          </div>
                          {resident.phone && (
                            <div className="flex items-center mb-2">
                              <i
                                className="fas fa-phone text-soralia-secondary mr-2"
                                aria-hidden="true"
                              ></i>
                              <span className="text-sm text-gray-600">{resident.phone}</span>
                            </div>
                          )}
                        </>
                      )}
                      {interestList.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {interestList.map((interest, interestIdx) => (
                            <span
                              key={`${idx}-${interestIdx}`}
                              className={`text-xs text-white px-2 py-1 rounded-full ${INTEREST_COLORS[interest] || 'bg-gray-500'}`}
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {resident.homeImage && viewMode === 'grid' && (
                      <div className="w-20 h-20 flex-shrink-0 relative">
                        <Image
                          src={resident.homeImage}
                          alt={`${resident.name}'s home`}
                          fill
                          sizes="80px"
                          className="object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {total > limit && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('home.previous')}
            </button>
            <span className="text-sm text-gray-600">
              {t('home.page', { current: page, total: Math.ceil(total / limit) })}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('home.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

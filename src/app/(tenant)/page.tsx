'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { Carousel, Pagination } from '@shared/ui';
import { STREETS, CARD_HEADER_COLORS } from '@shared/lib';
import { useResidentFilter } from '@/hooks/useResidentFilter';

const CommunityMap = dynamic(() => import('@shared/ui').then(mod => mod.CommunityMap), {
  ssr: false,
  loading: () => <div className="h-96 w-full bg-gray-100 rounded-lg animate-pulse" />,
});

import { UnifiedResidentCard, type Resident } from '@/components/shared/UnifiedResidentCard';

export default function HomePage() {
  const { t, ready } = useTranslation('common');
  const [mounted, setMounted] = useState(false);

  const {
    residents,
    loading,
    searchQuery,
    filterType,
    filterStreet,
    page,
    total,
    viewMode,
    setSearchQuery,
    setFilterType,
    setFilterStreet,
    setPage,
    setViewMode,
    filteredCount,
  } = useResidentFilter({ defaultLimit: 6 });

  const limit = 6;

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const street = r.standardSeats?.[0]?.household?.street || r.soloSeat?.household?.street || '';
    const unit = r.standardSeats?.[0]?.household?.unit || r.soloSeat?.household?.unit || '';
    const address = [street, unit].filter(Boolean).join(', ');
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
        matchesType = r.standardSeats?.some(seat => seat.isPrimaryOwner) || false;
      } else if (filterValue === 'Renter') {
        // Use residencyType from profiles to identify renters
        matchesType = r.profiles?.some(p => p.residencyType === 'RENTER') || false;
      }
    }
    return matchesSearch && matchesType;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Carousel for For Sale / To Let / etc */}
      <div className="relative mb-8">
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
              : residents.length > 0
                ? t('home.showingResidents', {
                    count: residents.length,
                    total: filteredCount,
                  })
                : t('home.noResidents', { defaultValue: 'No residents found' })}
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

              return (
                <UnifiedResidentCard
                  key={resident.id}
                  resident={resident}
                  viewMode={viewMode}
                  headerColor={headerColor}
                  avatarUrl={avatarUrl}
                  isChatVisible={false}
                  index={idx}
                />
              );
            })}
          </div>
        )}

        {total > limit && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={setPage}
            className="mt-6"
          />
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { STREETS, INTEREST_CATEGORIES } from '@/lib/constants';

const CommunityMap = dynamic(
  () => import('@/components/ui/CommunityMap').then(mod => mod.CommunityMap),
  {
    ssr: false,
    loading: () => <div className="h-96 w-full bg-gray-100 rounded-lg animate-pulse" />,
  }
);

interface Resident {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  resident_type: string;
  interests: string;
}

const residents: Resident[] = [
  {
    id: 1,
    name: 'John Smith',
    address: '12 Pagoda Rd, Unit 1',
    phone: '+27 82 123 4567',
    email: 'john@example.com',
    resident_type: 'Owner',
    interests: 'Gardening, Tennis',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    address: '15 Wild Almond Rd',
    phone: '+27 82 234 5678',
    email: 'sarah@example.com',
    resident_type: 'Owner',
    interests: 'Book Club, Swimming',
  },
  {
    id: 3,
    name: 'Mike Williams',
    address: '8 Silkypuff Street',
    phone: '+27 82 345 6789',
    email: 'mike@example.com',
    resident_type: 'Board',
    interests: 'Conservation, Hiking',
  },
  {
    id: 4,
    name: 'Emily Brown',
    address: '22 Beechwood Rd, Unit 3',
    phone: '+27 82 456 7890',
    email: 'emily@example.com',
    resident_type: 'Renter',
    interests: 'Yoga, Photography',
  },
  {
    id: 5,
    name: 'David Lee',
    address: '5 Sugarbrush Rd',
    phone: '+27 82 567 8901',
    email: 'david@example.com',
    resident_type: 'Owner',
    interests: 'Chess, Cooking',
  },
  {
    id: 6,
    name: 'Lisa Chen',
    address: '18 Conebrush Rd, Unit 2',
    phone: '+27 82 678 9012',
    email: 'lisa@example.com',
    resident_type: 'Committee',
    interests: 'Art, Music',
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Residents');
  const [filterStreet, setFilterStreet] = useState('All Streets');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredResidents = residents.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.interests.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === 'All Residents' || r.resident_type === filterType.replace(' Members', '');
    const matchesStreet = filterStreet === 'All Streets' || r.address.includes(filterStreet);
    return matchesSearch && matchesType && matchesStreet;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Community Map */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-soralia-dark mb-6">Our Community</h2>
        <div className="h-96 w-full bg-gray-100 rounded-lg mb-4">
          <CommunityMap />
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Explore our beautiful neighborhood. Click on streets to see residents.</p>
          <p className="mt-2">
            Map data ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              className="text-soralia-primary hover:underline"
            >
              OpenStreetMap
            </a>{' '}
            contributors
          </p>
        </div>
      </div>

      {/* Dashboard Promo */}
      <div className="bg-gradient-to-r from-soralia-primary to-soralia-secondary rounded-lg shadow-md p-8 mb-8 text-white">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">Resident Dashboard</h2>
          <p className="text-lg opacity-90">Experience our comprehensive resident portal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-tachometer-alt text-2xl" aria-hidden="true"></i>
            </div>
            <h3 className="font-semibold mb-2">Real-time Updates</h3>
            <p className="text-sm opacity-90">
              Get instant notifications about community events, maintenance, and announcements
            </p>
          </div>
          <div className="text-center">
            <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-tools text-2xl" aria-hidden="true"></i>
            </div>
            <h3 className="font-semibold mb-2">Maintenance Requests</h3>
            <p className="text-sm opacity-90">
              Submit and track maintenance requests with photo uploads and status updates
            </p>
          </div>
          <div className="text-center">
            <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-calendar-check text-2xl" aria-hidden="true"></i>
            </div>
            <h3 className="font-semibold mb-2">Facility Booking</h3>
            <p className="text-sm opacity-90">
              Reserve community spaces, view availability, and manage your bookings
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-block bg-white text-indigo-600 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            <i className="fas fa-external-link-alt mr-2" aria-hidden="true"></i>
            View Dashboard
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-soralia-dark mb-6">Community Directory</h2>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search by name, address, or interests..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400" aria-hidden="true"></i>
          </div>
          <button className="bg-soralia-primary text-white py-2 px-6 rounded-md hover:bg-indigo-700 transition">
            Search
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <label className="mr-2 text-sm text-gray-700">Filter:</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-soralia-primary"
            >
              <option>All Residents</option>
              <option>Board Members</option>
              <option>Committee Members</option>
              <option>Renters</option>
              <option>Owners</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="mr-2 text-sm text-gray-700">Street:</label>
            <select
              value={filterStreet}
              onChange={e => setFilterStreet(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-soralia-primary"
            >
              <option>All Streets</option>
              {STREETS.map(street => (
                <option key={street}>{street}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="mr-2 text-sm text-gray-700">Sort by:</label>
            <select className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-soralia-primary">
              <option>Name (A-Z)</option>
              <option>Name (Z-A)</option>
              <option>Street</option>
              <option>Unit Number</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Results */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-soralia-dark">
            Showing {filteredResidents.length} residents
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
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

        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredResidents.map(resident => {
            const headerColors = [
              'bg-soralia-primary',
              'bg-blue-500',
              'bg-green-500',
              'bg-purple-500',
              'bg-orange-500',
            ];
            const colorIndex = resident.id % headerColors.length;
            const headerColor = headerColors[colorIndex];

            return (
              <div
                key={resident.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${viewMode === 'list' ? 'flex' : ''}`}
              >
                <div
                  className={`${headerColor} p-4 text-white ${viewMode === 'list' ? 'w-64 shrink-0' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`}
                      alt={resident.name}
                      className="w-10 h-10 rounded-full bg-white/20"
                    />
                    <div>
                      <h3 className="font-bold text-lg">{resident.name}</h3>
                      <p className="text-sm opacity-90">{resident.address}</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 ${viewMode === 'list' ? 'flex-1 flex items-center gap-8' : ''}`}
                >
                  <div>
                    <div className="flex items-center mb-2">
                      <i className="fas fa-phone text-soralia-secondary mr-2"></i>
                      <span className="text-sm text-gray-600">{resident.phone}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <i className="fas fa-envelope text-soralia-secondary mr-2"></i>
                      <span className="text-sm text-gray-600">{resident.email}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <i className="fas fa-home text-soralia-secondary mr-2"></i>
                      <span className="text-sm text-gray-600">
                        {resident.resident_type === 'Board'
                          ? 'HOA Board'
                          : resident.resident_type === 'Committee'
                            ? 'Committee'
                            : resident.resident_type === 'Owner'
                              ? 'Owner'
                              : 'Renter'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {resident.interests.split(', ').map((interest, idx) => (
                      <span
                        key={idx}
                        className={`text-xs text-white px-2 py-1 rounded-full ${
                          interest === 'Gardening'
                            ? 'bg-green-500'
                            : interest === 'Conservation'
                              ? 'bg-green-600'
                              : interest === 'Tennis'
                                ? 'bg-blue-500'
                                : interest === 'Swimming'
                                  ? 'bg-blue-600'
                                  : interest === 'Book Club'
                                    ? 'bg-purple-500'
                                    : 'bg-gray-500'
                        }`}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

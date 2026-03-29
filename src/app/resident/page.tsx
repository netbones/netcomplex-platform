'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { Bookshelf } from '@/components/ui/Bookshelf';

const interestOptions = [
  { id: 'gardening', label: 'Gardening', color: 'bg-green-500' },
  { id: 'fitness', label: 'Fitness', color: 'bg-blue-500' },
  { id: 'book-club', label: 'Book Club', color: 'bg-purple-500' },
  { id: 'cooking', label: 'Cooking', color: 'bg-orange-500' },
  { id: 'photography', label: 'Photography', color: 'bg-pink-500' },
  { id: 'volunteering', label: 'Volunteering', color: 'bg-red-500' },
];

export default function ResidentPage() {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/users/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  const user = {
    name: session.user.name || session.user.email?.split('@')[0] || 'User',
    address: userData ? `${userData.street || ''}${userData.unit ? `, ${userData.unit}` : ''}` : '',
    memberSince: userData?.createdAt
      ? new Date(userData.createdAt).getFullYear()
      : new Date().getFullYear(),
    interests: userData?.interests || [],
    avatar: session.user.image || userData?.avatar || null,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-8 mb-8 flex items-center space-x-6">
        <div className="w-32 h-32 rounded-full border-4 border-indigo-600 bg-indigo-100 flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-indigo-600">
              {user.name
                .split(' ')
                .map((n: string) => n[0])
                .join('')}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-xl text-gray-600">{user.address}</p>
          <p className="text-gray-500 mt-2">
            {t('memberSince', 'Member since')} {user.memberSince}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t('myInterests', 'My Interests')}
        </h2>
        <div className="flex flex-wrap gap-4">
          {user.interests.length > 0 ? (
            user.interests.map((interest: string) => {
              const option = interestOptions.find(o => o.id === interest);
              return option ? (
                <span
                  key={interest}
                  className={`${option.color} text-white text-lg px-4 py-2 rounded-full`}
                >
                  {option.label}
                </span>
              ) : (
                <span
                  key={interest}
                  className="bg-gray-500 text-white text-lg px-4 py-2 rounded-full"
                >
                  {interest}
                </span>
              );
            })
          ) : (
            <p className="text-gray-500">{t('noInterests', 'No interests added yet.')}</p>
          )}
        </div>
        <button className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium">
          <i className="fas fa-edit mr-2"></i>
          {t('editInterests', 'Edit Interests')}
        </button>
      </div>

      <Bookshelf userId={session.user.id} editable={true} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t('quickActions', 'Quick Actions')}
          </h2>
          <div className="space-y-4">
            <a
              href="/admin/content/new"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-pen text-indigo-600 text-xl w-8"></i>
              <div>
                <p className="font-semibold">{t('createContent', 'Create Content')}</p>
                <p className="text-sm text-gray-600">
                  {t('writePost', 'Write a blog post or article')}
                </p>
              </div>
            </a>
            <a
              href="/maintenance"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-tools text-indigo-600 text-xl w-8"></i>
              <div>
                <p className="font-semibold">{t('submitRequest', 'Submit Maintenance Request')}</p>
                <p className="text-sm text-gray-600">
                  {t('reportIssue', 'Report an issue or request repair')}
                </p>
              </div>
            </a>
            <a
              href="/bookings"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-calendar-alt text-indigo-600 text-xl w-8"></i>
              <div>
                <p className="font-semibold">{t('bookArea', 'Book Common Area')}</p>
                <p className="text-sm text-gray-600">
                  {t('reservePool', 'Reserve pool, gym, or community center')}
                </p>
              </div>
            </a>
            <a
              href="/messages"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-comments text-indigo-600 text-xl w-8"></i>
              <div>
                <p className="font-semibold">{t('messageNeighbors', 'Message Neighbors')}</p>
                <p className="text-sm text-gray-600">
                  {t('chatResidents', 'Chat with fellow residents')}
                </p>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t('recentActivity', 'Recent Activity')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center p-4 border-l-4 border-green-500 bg-gray-50 rounded-lg">
              <i className="fas fa-calendar-check text-green-600 w-8"></i>
              <div>
                <p className="font-semibold">{t('poolBooking', 'Pool Booking Confirmed')}</p>
                <p className="text-sm text-gray-600">April 5, 2024 - 2:00 PM</p>
              </div>
            </div>
            <div className="flex items-center p-4 border-l-4 border-blue-500 bg-gray-50 rounded-lg">
              <i className="fas fa-tools text-blue-600 w-8"></i>
              <div>
                <p className="font-semibold">
                  {t('maintenanceSubmitted', 'Maintenance Request Submitted')}
                </p>
                <p className="text-sm text-gray-600">Leaking faucet - In Progress</p>
              </div>
            </div>
            <div className="flex items-center p-4 border-l-4 border-purple-500 bg-gray-50 rounded-lg">
              <i className="fas fa-envelope text-purple-600 w-8"></i>
              <div>
                <p className="font-semibold">{t('newMessage', 'New Message Received')}</p>
                <p className="text-sm text-gray-600">From: Sarah Mitchell</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

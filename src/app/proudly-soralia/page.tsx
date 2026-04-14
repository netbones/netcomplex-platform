'use client';

import { useState, useEffect } from 'react';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('proudly-soralia-page');

const values = [
  {
    icon: 'fa-handshake',
    title: 'Community Spirit',
    desc: 'Fostering mutual respect and support among all residents.',
    color: 'text-indigo-600',
  },
  {
    icon: 'fa-leaf',
    title: 'Sustainability',
    desc: 'Committed to preserving our natural environment and promoting eco-friendly living.',
    color: 'text-green-600',
  },
  {
    icon: 'fa-shield-alt',
    title: 'Safety & Well-being',
    desc: 'Ensuring a secure and healthy environment for every family.',
    color: 'text-red-600',
  },
];

const defaultStats = [
  { key: 'homes', value: '180', label: 'Homes' },
  { key: 'years', value: '15+', label: 'Years of Community' },
  { key: 'birdSpecies', value: '47', label: 'Bird Species' },
  { key: 'nativePlants', value: '150+', label: 'Native Plants' },
];

const testimonials = [
  {
    name: 'The Williams Family',
    text: 'We have lived in Soralia Village for 8 years and it still feels like a vacation every day. The community is wonderful!',
    icon: 'fa-user',
  },
  {
    name: 'David & Michael',
    text: 'The gardening club has been amazing. We have learned so much about indigenous plants and made great friends.',
    icon: 'fa-user-friends',
  },
  {
    name: 'The Ngubane Family',
    text: 'The security and maintenance teams are exceptional. We never have to worry about anything except enjoying our home.',
    icon: 'fa-users',
  },
];

export default function ProudlySoraliaPage() {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats([
            { key: 'homes', value: String(data.homes || 180), label: 'Homes' },
            { key: 'years', value: String(data.years || '15+'), label: 'Years of Community' },
            { key: 'birdSpecies', value: String(data.birdSpecies || 47), label: 'Bird Species' },
            {
              key: 'nativePlants',
              value: String(data.nativePlants || '150+'),
              label: 'Native Plants',
            },
          ]);
        }
      } catch (error) {
        log.error({}, 'Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gradient-to-r from-indigo-600 to-green-600 rounded-lg shadow-lg p-8 mb-8 text-white text-center">
        <h1 className="text-5xl font-bold mb-4">Proudly Soralia!</h1>
        <p className="text-xl opacity-90 max-w-3xl mx-auto">
          Celebrating our vibrant community, shared values, and the beautiful place we call home.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map(value => (
            <div key={value.title} className="text-center p-4">
              <i className={`fas ${value.icon} text-5xl ${value.color} mb-4`}></i>
              <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
              <p className="text-gray-700">{value.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Our Community in Numbers
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(stat => (
            <div key={stat.key} className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                {loading ? '...' : stat.value}
              </div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Resident Stories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map(t => (
            <div key={t.name} className="text-center p-4">
              <i className={`fas ${t.icon} text-4xl text-indigo-600 mb-4`}></i>
              <p className="text-gray-700 mb-4 italic">"{t.text}"</p>
              <p className="font-semibold text-gray-900">- {t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

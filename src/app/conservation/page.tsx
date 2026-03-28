'use client';

import { useState } from 'react';

const conservationStats = [
  { icon: 'fa-leaf', title: 'Endemic Flora', desc: 'Over 150 indigenous plant species' },
  { icon: 'fa-water', title: 'Wetland Ecosystem', desc: 'Critical habitat for local wildlife' },
  {
    icon: 'fa-shield-alt',
    title: 'Protected Status',
    desc: 'Officially designated conservation area',
  },
];

const newsArticles = [
  {
    featured: true,
    date: 'March 15, 2024',
    title: 'Successful Alien Plant Removal Initiative',
    desc: 'Our community volunteers removed over 500 invasive alien plants from the wetland area this month, including Port Jackson willows and Australian acacias.',
    volunteers: 25,
  },
  {
    featured: false,
    date: 'February 28, 2024',
    title: 'New Bird Species Spotted in Reserve',
    desc: 'A rare African palm swift has been spotted in our conservation area, marking the 47th bird species recorded in Soralia Nature Reserve.',
    volunteers: 0,
  },
  {
    featured: false,
    date: 'February 10, 2024',
    title: 'Water Quality Monitoring Results',
    desc: 'Latest water quality tests show significant improvement in wetland health following our drainage restoration project.',
    volunteers: 0,
  },
];

const initiatives = [
  {
    icon: 'fa-seedling',
    title: 'Invasive Species Removal',
    desc: 'Regular removal of alien plant species to protect native biodiversity',
  },
  {
    icon: 'fa-tint',
    title: 'Wetland Restoration',
    desc: 'Ongoing efforts to restore natural water flow and habitat',
  },
  {
    icon: 'fa-binoculars',
    title: 'Wildlife Monitoring',
    desc: 'Citizen science programs tracking local wildlife populations',
  },
  {
    icon: 'fa-graduation-cap',
    title: 'Education & Outreach',
    desc: 'Community workshops on conservation and environmental stewardship',
  },
];

const flora = [
  'Silver Cachepis (CaCHEpis sericea)',
  'Fynbos Conebush (Leucadendron spp.)',
  'Scented Pelargonium (Pelargonium capitatum)',
  'Strandveld Pumpkin (Cucumis humilis)',
  'Blushing Bride (Serruria florida)',
];

const wildlife = [
  'Cape ghost frog (Endangered)',
  'African palm swift',
  'Southern purpleunted sunbird',
  'Common padloper tortoise',
  'Leopard toad (Endangered)',
];

const volunteerOpportunities = [
  {
    title: 'Monthly Workdays',
    desc: 'Join us every first Saturday for conservation activities',
    time: '9:00 AM - 12:00 PM',
  },
  {
    title: 'Bird Watching Tours',
    desc: 'Guided tours through the reserve with expert ornithologists',
    time: 'Every Sunday',
  },
  {
    title: 'Junior Rangers',
    desc: 'Educational program for children ages 8-14',
    time: 'School holidays',
  },
];

export default function ConservationPage() {
  const [activeTab, setActiveTab] = useState('news');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="relative bg-gradient-to-r from-green-600 to-emerald-700 rounded-lg shadow-lg p-8 mb-8 text-white overflow-hidden">
        <img
          src="/conservation.webp"
          alt="Soralia Village Conservation Area"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative z-10">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold mb-4">Soralia Nature Reserve</h1>
            <p className="text-xl opacity-90">
              Preserving our unique South African Strandveld Wetland heritage for future generations
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {conservationStats.map(stat => (
              <div key={stat.title} className="bg-white bg-opacity-20 rounded-lg p-4">
                <i className={`fas ${stat.icon} text-3xl mb-2`}></i>
                <h3 className="font-semibold mb-1">{stat.title}</h3>
                <p className="text-sm opacity-90">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          <i className="fas fa-newspaper text-green-600 mr-3"></i>
          Conservation News & Updates
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {newsArticles.map(article => (
            <div
              key={article.title}
              className={`rounded-lg p-6 border ${article.featured ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center mb-4">
                {article.featured && (
                  <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full mr-3">
                    FEATURED
                  </span>
                )}
                <span className="text-sm text-gray-500">{article.date}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{article.title}</h3>
              <p className="text-gray-700 mb-4">{article.desc}</p>
              {article.volunteers > 0 && (
                <div className="flex items-center text-green-600 font-medium">
                  <i className="fas fa-users mr-2"></i>
                  <span>{article.volunteers} volunteers participated</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          <i className="fas fa-hands-helping text-green-600 mr-3"></i>
          Conservation Initiatives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {initiatives.map(initiative => (
            <div
              key={initiative.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <i className={`fas ${initiative.icon} text-green-600 text-2xl mb-4`}></i>
              <h3 className="text-lg font-semibold mb-2">{initiative.title}</h3>
              <p className="text-gray-600 text-sm">{initiative.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            <i className="fas fa-leaf text-green-600 mr-3"></i>
            Native Flora
          </h2>
          <ul className="space-y-3">
            {flora.map(item => (
              <li key={item} className="flex items-center">
                <i className="fas fa-check-circle text-green-500 mr-3"></i>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            <i className="fas fa-paw text-green-600 mr-3"></i>
            Wildlife
          </h2>
          <ul className="space-y-3">
            {wildlife.map(item => (
              <li key={item} className="flex items-center">
                <i className="fas fa-check-circle text-green-500 mr-3"></i>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          <i className="fas fa-user-plus text-green-600 mr-3"></i>
          Get Involved
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {volunteerOpportunities.map(opp => (
            <div
              key={opp.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2">{opp.title}</h3>
              <p className="text-gray-600 text-sm mb-2">{opp.desc}</p>
              <p className="text-green-600 font-medium text-sm">{opp.time}</p>
              <button className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                Sign Up
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

const quickLinks = [
  {
    icon: 'fa-file-alt',
    title: 'Documents',
    desc: 'HOA bylaws, forms, and official documents',
    color: 'text-blue-600',
    href: '#documents',
  },
  {
    icon: 'fa-calendar-alt',
    title: 'Events',
    desc: 'Community events and meeting schedules',
    color: 'text-green-600',
    href: '#events',
  },
  {
    icon: 'fa-book',
    title: 'Guidelines',
    desc: 'Community rules and living guidelines',
    color: 'text-purple-600',
    href: '#guidelines',
  },
  {
    icon: 'fa-phone',
    title: 'Contacts',
    desc: 'Important phone numbers and contacts',
    color: 'text-red-600',
    href: '#contacts',
  },
];

const documents = [
  { icon: 'fa-gavel', title: 'HOA Bylaws', desc: 'Official community bylaws and regulations' },
  { icon: 'fa-home', title: 'CC&Rs', desc: 'Covenants, Conditions & Restrictions' },
  { icon: 'fa-file-contract', title: 'Governing Docs', desc: 'All community governing documents' },
  {
    icon: 'fa-file-invoice-dollar',
    title: 'Financial Reports',
    desc: 'Annual budgets and financial statements',
  },
  {
    icon: 'fa-paint-roller',
    title: 'Architectural Guidelines',
    desc: 'Home improvement and renovation rules',
  },
  {
    icon: 'fa-user-shield',
    title: 'Privacy Policy',
    desc: 'Community privacy policies and procedures',
  },
];

const events = [
  {
    icon: 'fa-users',
    title: 'Monthly Board Meeting',
    date: 'First Tuesday of each month',
    time: '7:00 PM',
  },
  {
    icon: 'fa-calendar-check',
    title: 'Annual General Meeting',
    date: 'Once per year',
    time: '6:00 PM',
  },
  { icon: 'fa-broom', title: 'Community Cleanup Day', date: 'Quarterly', time: '9:00 AM' },
  { icon: 'fa-tree', title: 'Landscaping Day', date: 'Twice per year', time: '8:00 AM' },
];

const guidelines = [
  {
    icon: 'fa-paint-brush',
    title: 'Exterior Appearance',
    desc: 'Guidelines for home exteriors, paint colors, and landscaping',
  },
  {
    icon: 'fa-paw',
    title: 'Pet Policy',
    desc: 'Rules and regulations regarding pets in the community',
  },
  {
    icon: 'fa-parking',
    title: 'Parking Guidelines',
    desc: 'Parking rules, visitor parking, and vehicle restrictions',
  },
  { icon: 'fa-volume-off', title: 'Noise Policy', desc: 'Quiet hours and noise guidelines' },
  {
    icon: 'fa-swimming-pool',
    title: 'Amenity Rules',
    desc: 'Pool, gym, and common area usage rules',
  },
  {
    icon: 'fa-recycle',
    title: 'Waste & Recycling',
    desc: 'Waste disposal and recycling guidelines',
  },
];

const contacts = [
  {
    icon: 'fa-building',
    title: 'Management Office',
    phone: '+27 21 555-MGMT',
    email: 'management@soralia.org',
  },
  {
    icon: 'fa-shield-alt',
    title: 'Security',
    phone: '+27 21 555-SAFE',
    email: 'security@soralia.org',
  },
  {
    icon: 'fa-tools',
    title: 'Maintenance',
    phone: '+27 21 555-FIXIT',
    email: 'maintenance@soralia.org',
  },
  {
    icon: 'fa-envelope',
    title: 'General Inquiries',
    phone: '+27 21 555-INFO',
    email: 'info@soralia.org',
  },
];

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('documents');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Community Resources</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Essential information, documents, and resources to help you make the most of community
          living
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {quickLinks.map(link => (
          <a
            key={link.title}
            href={link.href}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-center"
          >
            <i className={`fas ${link.icon} text-4xl ${link.color} mb-4`}></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{link.title}</h3>
            <p className="text-gray-600 text-sm">{link.desc}</p>
          </a>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Community Campaigns</h2>
        <p className="text-gray-700 mb-6">
          Explore our ongoing initiatives and discover how we're building a stronger, more vibrant
          Soralia Village together.
        </p>
        <a
          href="/proudly-soralia"
          className="inline-block bg-indigo-600 text-white py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          <i className="fas fa-heart mr-2"></i>Proudly Soralia Campaign
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-12" id="documents">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          <i className="fas fa-file-alt text-blue-600 mr-3"></i>
          Important Documents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(doc => (
            <div
              key={doc.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <i className={`fas ${doc.icon} text-blue-600 text-2xl mr-3`}></i>
                <h3 className="text-lg font-semibold">{doc.title}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{doc.desc}</p>
              <div className="flex space-x-2">
                <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors">
                  <i className="fas fa-download mr-1"></i>Download
                </button>
                <button className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-300 transition-colors">
                  <i className="fas fa-eye mr-1"></i>View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-12" id="events">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          <i className="fas fa-calendar-alt text-green-600 mr-3"></i>
          Community Events & Meetings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map(event => (
            <div
              key={event.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <i className={`fas ${event.icon} text-green-600 text-2xl mr-3`}></i>
                <h3 className="text-lg font-semibold">{event.title}</h3>
              </div>
              <p className="text-gray-600 text-sm">{event.date}</p>
              <p className="text-gray-500 text-sm">{event.time}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-12" id="guidelines">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          <i className="fas fa-book text-purple-600 mr-3"></i>
          Community Guidelines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guidelines.map(guideline => (
            <div
              key={guideline.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <i className={`fas ${guideline.icon} text-purple-600 text-2xl mr-3`}></i>
                <h3 className="text-lg font-semibold">{guideline.title}</h3>
              </div>
              <p className="text-gray-600 text-sm">{guideline.desc}</p>
              <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2">
                Read More →
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8" id="contacts">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          <i className="fas fa-phone text-red-600 mr-3"></i>
          Important Contacts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contacts.map(contact => (
            <div
              key={contact.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <i className={`fas ${contact.icon} text-red-600 text-2xl mr-3`}></i>
                <h3 className="text-lg font-semibold">{contact.title}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-1">{contact.phone}</p>
              <p className="text-gray-500 text-sm">{contact.email}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

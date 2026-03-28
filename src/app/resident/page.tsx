'use client';

import { useState } from 'react';

const sampleBooks = [
  { title: 'The Midnight Library', author: 'Matt Haig' },
  { title: 'Project Hail Mary', author: 'Andy Weir' },
  { title: 'Klara and the Sun', author: 'Kazuo Ishiguro' },
  { title: 'The Four Winds', author: 'Kristin Hannah' },
];

const interestOptions = [
  { id: 'gardening', label: 'Gardening', color: 'bg-green-500' },
  { id: 'fitness', label: 'Fitness', color: 'bg-blue-500' },
  { id: 'book-club', label: 'Book Club', color: 'bg-purple-500' },
  { id: 'cooking', label: 'Cooking', color: 'bg-orange-500' },
  { id: 'photography', label: 'Photography', color: 'bg-pink-500' },
  { id: 'volunteering', label: 'Volunteering', color: 'bg-red-500' },
];

export default function ResidentPage() {
  const [user] = useState({
    name: 'John Smith',
    address: '123 Pagoda Rd, Unit 4B',
    memberSince: '2018',
    interests: ['gardening', 'book-club', 'hoa'],
    avatar: null,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-8 mb-8 flex items-center space-x-6">
        <div className="w-32 h-32 rounded-full border-4 border-indigo-600 bg-indigo-100 flex items-center justify-center">
          <span className="text-4xl font-bold text-indigo-600">
            {user.name
              .split(' ')
              .map(n => n[0])
              .join('')}
          </span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-xl text-gray-600">{user.address}</p>
          <p className="text-gray-500 mt-2">Member since {user.memberSince}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Interests</h2>
        <div className="flex flex-wrap gap-4">
          {user.interests.map(interest => {
            const option = interestOptions.find(o => o.id === interest);
            return option ? (
              <span
                key={interest}
                className={`${option.color} text-white text-lg px-4 py-2 rounded-full`}
              >
                {option.label}
              </span>
            ) : null;
          })}
        </div>
        <button className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium">
          <i className="fas fa-edit mr-2"></i>Edit Interests
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Bookshelf</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sampleBooks.map(book => (
            <div key={book.title} className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-full h-40 bg-gray-200 rounded-md shadow-md mb-4 flex items-center justify-center">
                <i className="fas fa-book text-4xl text-gray-400"></i>
              </div>
              <h3 className="font-semibold">{book.title}</h3>
              <p className="text-gray-600 text-sm">{book.author}</p>
            </div>
          ))}
        </div>
        <button className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium">
          <i className="fas fa-plus mr-2"></i>Add Book
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <a
              href="/maintenance"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-tools text-indigo-600 text-xl w-8"></i>
              <div>
                <p className="font-semibold">Submit Maintenance Request</p>
                <p className="text-sm text-gray-600">Report an issue or request repair</p>
              </div>
            </a>
            <a
              href="/bookings"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-calendar-alt text-indigo-600 text-xl w-8"></i>
              <div>
                <p className="font-semibold">Book Common Area</p>
                <p className="text-sm text-gray-600">Reserve pool, gym, or community center</p>
              </div>
            </a>
            <a
              href="/messages"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-comments text-indigo-600 text-xl w-8"></i>
              <div>
                <p className="font-semibold">Message Neighbors</p>
                <p className="text-sm text-gray-600">Chat with fellow residents</p>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center p-4 border-l-4 border-green-500 bg-gray-50 rounded-lg">
              <i className="fas fa-calendar-check text-green-600 w-8"></i>
              <div>
                <p className="font-semibold">Pool Booking Confirmed</p>
                <p className="text-sm text-gray-600">April 5, 2024 - 2:00 PM</p>
              </div>
            </div>
            <div className="flex items-center p-4 border-l-4 border-blue-500 bg-gray-50 rounded-lg">
              <i className="fas fa-tools text-blue-600 w-8"></i>
              <div>
                <p className="font-semibold">Maintenance Request Submitted</p>
                <p className="text-sm text-gray-600">Leaking faucet - In Progress</p>
              </div>
            </div>
            <div className="flex items-center p-4 border-l-4 border-purple-500 bg-gray-50 rounded-lg">
              <i className="fas fa-envelope text-purple-600 w-8"></i>
              <div>
                <p className="font-semibold">New Message Received</p>
                <p className="text-sm text-gray-600">From: Sarah Mitchell</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

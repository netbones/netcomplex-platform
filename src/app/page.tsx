'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-soralia-light">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-soralia-primary mb-4">Welcome to Soralia Village</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <p className="text-lg mb-4">Community Portal for Soralia Village Residents</p>
          <div className="space-y-2">
            <Link href="/directory" className="block text-soralia-primary hover:underline">
              Resident Directory
            </Link>
            <Link href="/dashboard" className="block text-soralia-primary hover:underline">
              Dashboard
            </Link>
            <Link href="/maintenance" className="block text-soralia-primary hover:underline">
              Maintenance Requests
            </Link>
            <Link href="/bookings" className="block text-soralia-primary hover:underline">
              Facility Bookings
            </Link>
            <Link href="/messages" className="block text-soralia-primary hover:underline">
              Messages
            </Link>
            <Link href="/auth-handler" className="block text-soralia-primary hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

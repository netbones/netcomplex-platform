'use client';

import { useUser } from '@stackframe/stack';
import Link from 'next/link';

export default function HomePage() {
  const user = useUser({ or: 'return-null' });

  return (
    <main className="min-h-screen bg-soralia-light">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-soralia-primary mb-4">Welcome to Soralia Village</h1>

        {user ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-lg">Hi, {user.displayName}!</p>
            <Link href="/dashboard" className="text-soralia-primary hover:underline">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-lg mb-4">Please sign in to access the community portal.</p>
            <Link
              href="/auth-handler"
              className="inline-block bg-soralia-primary text-white px-6 py-2 rounded hover:bg-indigo-700"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

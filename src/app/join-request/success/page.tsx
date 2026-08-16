'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function JoinRequestSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
        <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Request submitted</h1>
        <p className="text-gray-600 mb-6">
          Your request is awaiting approval. You&apos;ll receive an email invitation once your
          community admin approves it.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

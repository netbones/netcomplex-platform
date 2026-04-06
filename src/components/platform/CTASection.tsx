'use client';

import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-20 bg-indigo-600">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Transform Your Community?
        </h2>
        <p className="text-xl text-indigo-100 mb-8">
          Join Home Owners Associations already using NetComplex.
        </p>
        <Link
          href="/signup"
          className="inline-block px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Get Started Free
        </Link>
      </div>
    </section>
  );
}

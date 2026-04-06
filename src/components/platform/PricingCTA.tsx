import Link from 'next/link';

export function PricingCTA() {
  return (
    <section className="py-20 bg-indigo-600">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Still have questions?</h2>
        <p className="text-xl text-indigo-100 mb-8">
          Our team is here to help you find the right plan for your community.
        </p>
        <Link
          href="/contact"
          className="inline-block px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Contact Sales
        </Link>
      </div>
    </section>
  );
}

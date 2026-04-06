'use client';

import { PrimaryCTA } from '@/components/ui/PrimaryCTA';
import { SectionLayout } from '@/components/layout/SectionLayout';

export function HeroSection() {
  return (
    <SectionLayout
      size="xl"
      background="transparent"
      className="relative bg-gradient-to-br from-lapis-deep via-lapis-mid to-lapis-deep text-white overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

      <div className="relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <p className="text-sm font-medium tracking-wider text-gold-vein mb-4 uppercase">
            Community Informatics Platform
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white tracking-tight">
            NetComplex
          </h1>
          <p className="text-2xl md:text-3xl font-light text-lapis-azure mb-8">
            Your complex, connected.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PrimaryCTA
              href="/signup"
              size="lg"
              className="bg-gold-vein text-lapis-deep hover:bg-gold-vein/90"
            >
              Start Free Trial
            </PrimaryCTA>
            <PrimaryCTA
              href="/pricing"
              variant="outline"
              size="lg"
              className="border-lapis-azure/40 text-white hover:border-lapis-azure hover:text-white"
            >
              View Pricing
            </PrimaryCTA>
          </div>
        </div>
      </div>
    </SectionLayout>
  );
}

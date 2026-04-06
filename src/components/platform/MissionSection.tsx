'use client';

import { SectionLayout } from '@/components/layout/SectionLayout';
import { Target, Lightbulb } from 'lucide-react';

export function MissionSection() {
  return (
    <SectionLayout size="xl" background="white" className="py-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Mission Card */}
          <div className="bg-gradient-to-br from-lapis-azure/10 to-lapis-deep/5 rounded-2xl p-8 md:p-10 shadow-lg border border-lapis-azure/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-lapis-deep rounded-xl">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-lapis-deep">Mission</h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-lapis-mid leading-relaxed">
              <p>
                NetComplex is not a management tool. We are an{' '}
                <span className="font-semibold text-lapis-deep">informatics platform</span> — a
                living network that gives homeowners associations and their residents a shared
                language, a common space, and the infrastructure to act together.
              </p>
              <p className="font-medium text-lapis-deep pt-2">
                Where other platforms manage properties, we activate communities.
              </p>
            </div>
          </div>

          {/* Core Belief Card */}
          <div className="bg-gradient-to-br from-vellum to-vellum-light rounded-2xl p-8 md:p-10 shadow-lg border border-lapis-azure/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gold-vein rounded-xl">
                <Lightbulb className="w-6 h-6 text-lapis-deep" />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-lapis-deep">Core belief</h3>
            </div>
            <p className="text-base md:text-lg text-lapis-mid leading-relaxed">
              A neighbourhood is not just an address. It is a{' '}
              <span className="font-semibold text-lapis-deep">
                network of relationships, resources, and shared stakes
              </span>
              . NetComplex makes that network visible, useful, and participatory.
            </p>
          </div>
        </div>
      </div>
    </SectionLayout>
  );
}

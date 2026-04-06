'use client';

import { SectionLayout } from '@/components/layout/SectionLayout';

export function MissionSection() {
  return (
    <SectionLayout size="xl" background="transparent" className="bg-lapis-deep text-white">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xl md:text-2xl leading-relaxed text-lapis-azure mb-8">
          NetComplex is not a management tool. We are an informatics platform — a living network
          that gives homeowners associations and their residents a shared language, a common space,
          and the infrastructure to act together. Where other platforms manage properties, we
          activate communities.
        </p>
        <div className="border-t border-lapis-azure/30 pt-8">
          <p className="text-lg font-medium text-gold-vein mb-2">Core belief</p>
          <p className="text-lg md:text-xl text-lapis-azure/80 italic">
            A neighbourhood is not just an address. It is a network of relationships, resources, and
            shared stakes. NetComplex makes that network visible, useful, and participatory.
          </p>
        </div>
      </div>
    </SectionLayout>
  );
}

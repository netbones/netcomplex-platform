'use client';

import { useSafeTranslation } from '@shared/lib';
import { SectionLayout } from '@shared/ui';

export function MissionSection() {
  const { tx, ready } = useSafeTranslation('platform');

  if (!ready) {
    return null;
  }
  return (
    <SectionLayout size="xl" background="white" className="py-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Mission Card */}
          <div className="group bg-gradient-to-br from-lapis-azure/10 to-lapis-deep/5 rounded-2xl p-8 md:p-10 shadow-lg border border-lapis-azure/20 hover:shadow-xl hover:border-lapis-azure/40 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-6">
              <img src="/platform/mission.svg" alt="" className="w-12 h-12 group-hover:scale-110 transition-transform duration-300" />
              <h2 className="text-3xl md:text-4xl font-bold text-lapis-deep">
                {tx('mission.title', 'Our Mission')}
              </h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-lapis-mid leading-relaxed">
              <p>{tx('mission.description', 'We connect communities through technology')}</p>
            </div>
          </div>

          {/* Core Belief Card */}
          <div className="group bg-gradient-to-br from-vellum to-vellum-light rounded-2xl p-8 md:p-10 shadow-lg border border-lapis-azure/20 hover:shadow-xl hover:border-lapis-azure/40 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-6">
              <img src="/platform/core.svg" alt="" className="w-12 h-12 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-3xl md:text-4xl font-bold text-lapis-deep">
                {tx('mission.coreBeliefTitle', 'Core Belief')}
              </h3>
            </div>
            <p className="text-base md:text-lg text-lapis-mid leading-relaxed">
              {tx('mission.coreBelief', 'Every community deserves great technology')}
            </p>
          </div>
        </div>
      </div>
    </SectionLayout>
  );
}

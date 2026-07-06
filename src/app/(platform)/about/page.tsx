'use client';

import { useSafeTranslation } from '@shared/lib';
import { PlatformFooter, PlatformHeader } from '@features/platform';

export default function AboutPage() {
  const { tx, ready } = useSafeTranslation('platform');

  return (
    <div className="min-h-screen bg-vellum">
      <PlatformHeader variant="light" />
      <main>
        {/* Hero */}
        <section className="bg-lapis-deep text-white py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {ready ? tx('about.title', 'About NetComplex') : 'About NetComplex'}
            </h1>
            <p className="text-xl text-lapis-azure/80 max-w-2xl mx-auto">
              {ready
                ? tx(
                    'about.subtitle',
                    'A community informatics platform built to connect neighbours, streamline operations, and enhance life in residential communities.'
                  )
                : ''}
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-lapis-deep mb-6">
                {ready ? tx('about.storyTitle', 'Our Story') : 'Our Story'}
              </h2>
              <div className="space-y-4 text-lg text-lapis-mid leading-relaxed">
                <p>
                  {ready
                    ? tx(
                        'about.storyP1',
                        'NetComplex was born from a simple observation: residential communities were being managed with spreadsheets, email notices, and disjointed, social-media tools. Residents had no central place to connect, communicate, or collaborate.'
                      )
                    : ''}
                </p>
                <p>
                  {ready
                    ? tx(
                        'about.storyP2',
                        'We built NetComplex to change that. What started as a solution for a single community in Cape Town has grown into a platform that serves residential complexes of all sizes across South Africa and the World.'
                      )
                    : ''}
                </p>
                <p>{ready ? tx('about.storyP3', '') : ''}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-lapis-deep text-center mb-12">
              {ready ? tx('about.valuesTitle', 'What We Believe') : 'What We Believe'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  titleKey: 'about.value1Title',
                  defaultTitle: 'Community First',
                  descKey: 'about.value1Desc',
                  defaultDesc:
                    'Every feature we build starts with the same question: does this empower households, liberate your neighbours and bring communities together?',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                      />
                    </svg>
                  ),
                },
                {
                  titleKey: 'about.value2Title',
                  defaultTitle: 'Modular Simplicity',
                  descKey: 'about.value2Desc',
                  defaultDesc:
                    "Powerful tools don't have to be complicated. We design for clarity and responsiveness so every resident can participate. Choose your modules, embrace your customisations.",
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                      />
                    </svg>
                  ),
                },
                {
                  titleKey: 'about.value3Title',
                  defaultTitle: 'Localisation First',
                  descKey: 'about.value3Desc',
                  defaultDesc:
                    'Built in South Africa for diverse African communities. We understand the unique linguistic dynamics of residential living on our continent and beyond.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                      />
                    </svg>
                  ),
                },
              ].map(value => (
                <div
                  key={value.titleKey}
                  className="text-center p-8 rounded-2xl bg-vellum hover:shadow-lg transition-shadow"
                >
                  <div className="w-16 h-16 bg-lapis-deep text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-lapis-deep mb-3">
                    {ready ? tx(value.titleKey, value.defaultTitle) : value.defaultTitle}
                  </h3>
                  <p className="text-lapis-mid">
                    {ready ? tx(value.descKey, value.defaultDesc) : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Built by */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-lapis-deep mb-6">
                {ready
                  ? tx('about.builtByTitle', 'Built by Netbones Africa')
                  : 'Built by Netbones Africa'}
              </h2>
              <p className="text-lg text-lapis-mid leading-relaxed mb-8">
                {ready ? tx('about.builtByDesc', '') : ''}
              </p>
              <a
                href="https://netbones.co.za"
                className="inline-flex items-center gap-2 text-lapis-azure hover:text-lapis-deep font-medium transition-colors"
              >
                {ready ? tx('about.builtByLink', 'Visit netbones.co.za') : 'Visit netbones.co.za'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-lapis-deep text-white py-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {ready
                ? tx('about.ctaTitle', 'Join the Communities Using NetComplex')
                : 'Join the Communities Using NetComplex'}
            </h2>
            <p className="text-xl text-lapis-azure/80 mb-8">
              {ready
                ? tx(
                    'about.ctaDesc',
                    'Start your 14-day free trial and see what a connected community looks like.'
                  )
                : ''}
            </p>
            <a
              href="/signup"
              className="inline-flex items-center px-8 py-3 text-lg font-semibold rounded-lg bg-gold-vein text-lapis-deep hover:bg-gold-vein/90 transition-colors"
            >
              {ready ? tx('cta.primaryAction', 'Start Free Trial') : 'Start Free Trial'}
            </a>
          </div>
        </section>
      </main>
      <PlatformFooter />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('conservation-page');

async function getContent(locale: string) {
  const response = await fetch(`/api/conservation?locale=${locale}`);
  if (!response.ok) {
    throw new Error('Failed to fetch conservation content');
  }
  return response.json();
}

type ContentItem = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  image?: string;
  category: string;
  tags: string[];
  published: boolean;
  featured: boolean;
  publishedAt?: string;
  author?: {
    name: string;
  };
};

export default function ConservationPage() {
  const { t: tCommon } = useTranslation('common');
  const { t, i18n } = useTranslation('conservation');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [conservationMode, setConservationMode] = useState<'default' | 'managed' | 'external'>(
    'default'
  );
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [managedUrl, setManagedUrl] = useState<string>('');
  const [managedContent, setManagedContent] = useState<ContentItem[]>([]);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Conservation', href: '/conservation' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    // Fetch conservation mode from flags
    async function fetchMode() {
      try {
        const res = await fetch('/api/flags?flag=conservation');
        const data = await res.json();
        if (data.value && ['default', 'managed', 'external'].includes(data.value)) {
          setConservationMode(data.value);
        }
      } catch (error) {
        log.error({}, 'Failed to fetch conservation mode', error);
      }
    }
    fetchMode();
  }, []);

  useEffect(() => {
    // Fetch external URL
    async function fetchExternalUrl() {
      try {
        const res = await fetch('/api/flags?flag=conservationExternalUrl');
        const data = await res.json();
        if (data.value) {
          setExternalUrl(data.value);
        }
      } catch (error) {
        log.error({}, 'Failed to fetch conservation external URL', error);
      }
    }

    // Fetch managed URL
    async function fetchManagedUrl() {
      try {
        const res = await fetch('/api/flags?flag=conservationManagedUrl');
        const data = await res.json();
        if (data.value) {
          setManagedUrl(data.value);
        }
      } catch (error) {
        log.error({}, 'Failed to fetch conservation managed URL', error);
      }
    }

    fetchExternalUrl();
    fetchManagedUrl();
  }, []);

  useEffect(() => {
    if (conservationMode === 'managed' && managedUrl) {
      fetch(managedUrl)
        .then(r => r.json())
        .then(body => {
          const items = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
          setManagedContent(items);
          setLoading(false);
        })
        .catch(error => {
          log.error({}, 'Failed to fetch managed conservation content', error);
          setManagedContent([]);
          setLoading(false);
        });
    } else if (conservationMode === 'managed') {
      // Managed mode without a URL — fall back to platform content
      getContent(i18n.language).then(body => {
        setManagedContent(body?.data ?? []);
        setLoading(false);
      });
    } else {
      // Default mode — fetch platform content for the articles section
      getContent(i18n.language).then(body => {
        setContent(body?.data ?? []);
        setLoading(false);
      });
    }
  }, [conservationMode, managedUrl]);

  // Render based on mode
  if (conservationMode === 'external' && externalUrl) {
    return (
      <ErrorBoundary>
        <div className="w-full h-[calc(100vh-100px)]">
          <iframe src={externalUrl} className="w-full h-full" title="Conservation Portal" />
        </div>
      </ErrorBoundary>
    );
  }

  if (!isReady) {
    return LoadingComponent;
  }

  const conservationStats = [
    { icon: 'fa-leaf', title: t('stats.endemicFlora'), desc: t('stats.endemicFloraDesc') },
    { icon: 'fa-water', title: t('stats.wetlandEcosystem'), desc: t('stats.wetlandEcosystemDesc') },
    {
      icon: 'fa-shield-alt',
      title: t('stats.protectedStatus'),
      desc: t('stats.protectedStatusDesc'),
    },
  ];

  const initiatives = [
    {
      icon: 'fa-seedling',
      title: t('initiatives.invasiveRemoval'),
      desc: t('initiatives.invasiveRemovalDesc'),
    },
    {
      icon: 'fa-tint',
      title: t('initiatives.wetlandRestoration'),
      desc: t('initiatives.wetlandRestorationDesc'),
    },
    {
      icon: 'fa-binoculars',
      title: t('initiatives.wildlifeMonitoring'),
      desc: t('initiatives.wildlifeMonitoringDesc'),
    },
    {
      icon: 'fa-graduation-cap',
      title: t('initiatives.education'),
      desc: t('initiatives.educationDesc'),
    },
  ];

  const flora = [
    'Silver Cachepis (CaCHEpis sericea)',
    'Fynbos Conebush (Leucadendron spp.)',
    'Scented Pelargonium (Pelargonium capitatum)',
    'Strandveld Pumpkin (Cucumis humilis)',
    'Blushing Bride (Serruria florida)',
  ];

  const wildlife = [
    'Cape ghost frog (Endangered)',
    'African palm swift',
    'Southern purpleunted sunbird',
    'Common padloper tortoise',
    'Leopard toad (Endangered)',
  ];

  const volunteerOpportunities = [
    {
      title: t('volunteer.monthlyWorkdays'),
      desc: t('volunteer.monthlyWorkdaysDesc'),
      time: '9:00 AM - 12:00 PM',
    },
    {
      title: t('volunteer.birdWatching'),
      desc: t('volunteer.birdWatchingDesc'),
      time: 'Every Sunday',
    },
    {
      title: t('volunteer.juniorRangers'),
      desc: t('volunteer.juniorRangersDesc'),
      time: 'School holidays',
    },
  ];

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: tCommon('nav.home'), href: '/' },
            { label: tCommon('nav.conservation') },
          ]}
        />
        <div className="rounded-lg shadow-lg mb-8 overflow-hidden">
          <img
            src="/conservation.webp"
            alt="Soralia Village Conservation Area"
            className="w-full h-64 object-cover"
          />
        </div>

        <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-lg shadow-lg p-8 mb-8 text-white text-center">
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="text-xl opacity-90 mb-6">{t('subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {conservationStats.map(stat => (
              <div key={stat.title} className="bg-white/20 rounded-lg p-4">
                <i className={`fas ${stat.icon} text-3xl mb-2`}></i>
                <h3 className="font-semibold mb-1">{stat.title}</h3>
                <p className="text-sm opacity-90">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            <i className="fas fa-seedling text-green-600 mr-3"></i>
            {conservationMode === 'managed' && managedUrl
              ? 'Managed Content'
              : t('initiatives.title')}
          </h2>
          {conservationMode === 'managed' && managedUrl ? (
            managedContent.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {managedContent.map((article: ContentItem) => (
                  <div
                    key={article.id ?? Math.random()}
                    className="rounded-lg p-6 border border-gray-200"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{article.title}</h3>
                    <p className="text-gray-700 mb-4">{article.content}</p>
                    {article.author?.name && (
                      <div className="flex items-center text-green-600 font-medium">
                        <i className="fas fa-user mr-2"></i>
                        <span>{article.author.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No content available from the managed CMS.{' '}
                <a
                  href={managedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Verify the CMS URL
                </a>
                .
              </p>
            )
          ) : conservationMode === 'managed' && !managedUrl ? (
            <p className="text-gray-500 text-center py-8">
              Managed content mode is enabled but no CMS URL has been configured. An administrator
              can set the CMS URL in Page Settings.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {content.map(article => (
                <div
                  key={article.id}
                  className={`rounded-lg p-6 border ${article.featured ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-center mb-4">
                    {article.featured && (
                      <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full mr-3">
                        FEATURED
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString('en-ZA', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{article.title}</h3>
                  <p className="text-gray-700 mb-4">{article.content}</p>
                  <div className="flex items-center text-green-600 font-medium">
                    <i className="fas fa-user mr-2"></i>
                    <span>{article.author?.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            <i className="fas fa-hands-helping text-green-600 mr-3"></i>
            {t('volunteer.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {initiatives.map(initiative => (
              <div
                key={initiative.title}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <i className={`fas ${initiative.icon} text-green-600 text-2xl mb-4`}></i>
                <h3 className="text-lg font-semibold mb-2">{initiative.title}</h3>
                <p className="text-gray-600 text-sm">{initiative.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              <i className="fas fa-leaf text-green-600 mr-3"></i>
              {t('flora.title')}
            </h2>
            <ul className="space-y-3">
              {flora.map(item => (
                <li key={item} className="flex items-center">
                  <i className="fas fa-check-circle text-green-500 mr-3"></i>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              <i className="fas fa-paw text-green-600 mr-3"></i>
              {t('wildlife.title')}
            </h2>
            <ul className="space-y-3">
              {wildlife.map(item => (
                <li key={item} className="flex items-center">
                  <i className="fas fa-check-circle text-green-500 mr-3"></i>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            <i className="fas fa-user-plus text-green-600 mr-3"></i>
            Get Involved
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {volunteerOpportunities.map(opp => (
              <div
                key={opp.title}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold mb-2">{opp.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{opp.desc}</p>
                <p className="text-green-600 font-medium text-sm">{opp.time}</p>
                <button className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                  Sign Up
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

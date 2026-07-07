'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import Image from 'next/image';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('campaign-page');

interface CampaignContent {
  id: string;
  title: Record<string, string>;
  content: Record<string, string>;
  excerpt: Record<string, string>;
  image: string | null;
  category: string;
  publishedAt: string | null;
  featured: boolean;
  priority: string;
  defaultLocale: string;
  author: {
    id: string;
    name: string | null;
    avatar: string | null;
  } | null;
}

interface CampaignData {
  config: {
    linkLabel: Record<string, string>;
    pageTitle: Record<string, string>;
    pageDescription: Record<string, string>;
    contentCategory: string;
  };
  content: CampaignContent[];
}

export default function CampaignPage() {
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignEnabled, setCampaignEnabled] = useState<boolean>(true);
  const { t, i18n } = useTranslation(['common', 'campaign']);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: t('nav.campaign') || 'Campaign', href: '/campaign' },
    ],
    { additionalLoading: loading }
  );

  // Check if campaign is enabled
  useEffect(() => {
    async function checkCampaignEnabled() {
      try {
        const res = await fetch('/api/flags?flag=campaign');
        const data = await res.json();
        setCampaignEnabled(data.value !== false);
      } catch (error) {
        log.error({}, 'Failed to check campaign status', error);
        setCampaignEnabled(true);
      }
    }
    checkCampaignEnabled();
  }, []);

  useEffect(() => {
    async function fetchCampaignData() {
      try {
        const res = await fetch('/api/campaign');
        const body = await res.json();
        setCampaignData(body.success ? body.data : body);
      } catch (error) {
        log.error({}, 'Failed to fetch campaign data', error);
      } finally {
        setLoading(false);
      }
    }

    if (campaignEnabled) {
      fetchCampaignData();
    } else {
      setLoading(false);
    }
  }, [campaignEnabled]);

  // Get localized content
  const getLocalizedContent = (field: Record<string, string> | null | undefined): string => {
    if (!field) return '';
    return field[i18n.language] || field.en || '';
  };

  const pageTitle = campaignData?.config?.pageTitle
    ? getLocalizedContent(campaignData.config.pageTitle)
    : t('nav.campaign');

  const pageDescription = campaignData?.config?.pageDescription
    ? getLocalizedContent(campaignData.config.pageDescription)
    : '';

  if (!isReady) {
    return LoadingComponent;
  }

  // Show "not available" if campaign is disabled
  if (!campaignEnabled) {
    return (
      <ErrorBoundary>
        <main className="min-h-screen bg-soralia-light">
          <div className="container mx-auto px-4 py-8">
            <Breadcrumbs
              items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.campaign') }]}
            />
            <div className="text-center py-12">
              <p className="text-gray-500">Campaign is not available for this community.</p>
            </div>
          </div>
        </main>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs items={[{ label: t('nav.home'), href: '/' }, { label: pageTitle }]} />

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/platform/campaigns.svg"
                alt=""
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <h1 className="text-4xl font-bold text-soralia-primary">{pageTitle}</h1>
            </div>
            {pageDescription && <p className="text-lg text-gray-600">{pageDescription}</p>}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading campaign content...</p>
            </div>
          ) : campaignData?.content && campaignData.content.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaignData.content.map(item => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow block relative"
                >
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={getLocalizedContent(item.title)}
                      fill
                      className="w-full h-48 object-cover"
                      unoptimized
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-soralia-dark mb-2">
                      {getLocalizedContent(item.title)}
                    </h3>
                    {item.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {getLocalizedContent(item.excerpt)}
                      </p>
                    )}
                    {item.author && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {item.author.avatar && (
                          <Image
                            src={item.author.avatar}
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                            unoptimized
                          />
                        )}
                        <span>{item.author.name}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No campaign content available yet.</p>
            </div>
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
}

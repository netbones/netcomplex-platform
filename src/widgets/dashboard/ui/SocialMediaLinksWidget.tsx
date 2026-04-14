'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/*
 * SOCIAL MEDIA LINKS WIDGET
 * ---------------------
 * Used by: SidebarWidgetBox (type: 'social-media')
 *
 * Displays user's social media links with inline editing.
 * Requires unique widgetId for localStorage key.
 * ---------------------
 */

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

interface SocialMediaLinksWidgetProps {
  widgetId: string;
}

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'Facebook', url: '', icon: 'fab fa-facebook' },
  { platform: 'Twitter', url: '', icon: 'fab fa-twitter' },
  { platform: 'Instagram', url: '', icon: 'fab fa-instagram' },
  { platform: 'LinkedIn', url: '', icon: 'fab fa-linkedin' },
];

export function SocialMediaLinksWidget({ widgetId }: SocialMediaLinksWidgetProps) {
  const { t } = useTranslation('dashboard');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`social-links-${widgetId}`);
    if (saved) {
      setSocialLinks(JSON.parse(saved));
    }
  }, [widgetId]);

  const updateLink = (platform: string, url: string) => {
    const updated = socialLinks.map(link => (link.platform === platform ? { ...link, url } : link));
    setSocialLinks(updated);
    localStorage.setItem(`social-links-${widgetId}`, JSON.stringify(updated));
  };

  const visibleLinks = socialLinks.filter(link => link.url.trim());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">{t('socialMedia', 'Social Media')}</h4>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          <i className={`fas fa-${isEditing ? 'check' : 'edit'}`}></i>
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {socialLinks.map(link => (
            <div key={link.platform} className="flex items-center gap-2">
              <i className={`${link.icon} text-gray-500 w-4`}></i>
              <input
                type="url"
                placeholder={`${link.platform} URL`}
                value={link.url}
                onChange={e => updateLink(link.platform, e.target.value)}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {visibleLinks.length === 0 ? (
            <p className="text-xs text-gray-500 italic">
              {t('noSocialLinks', 'No social links added')}
            </p>
          ) : (
            visibleLinks.map(link => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <i className={link.icon}></i>
                <span>{link.platform}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

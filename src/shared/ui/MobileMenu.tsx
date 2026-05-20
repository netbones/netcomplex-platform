'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { authClient } from '@api/auth-client';
import { useIsMounted } from 'usehooks-ts';
import { getBurgerSections, type NavItem } from '@/shared/lib/navigation-config';
import type { PlatformPageFlags } from '@entities/tenant/api/flags/platform-flags';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/shared/ui/Accordion';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  pageFlags: PlatformPageFlags | null;
  isAuthenticated: boolean;
  role: string | null;
}

export function MobileMenu({ isOpen, onClose, pageFlags, isAuthenticated, role }: MobileMenuProps) {
  const { t } = useTranslation('common');
  const isMounted = useIsMounted();

  if (!isOpen) return null;

  if (!isMounted() || !pageFlags) {
    return (
      <div className="mt-4 p-4 bg-soralia-primary border-t-4 border-white">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const sections = getBurgerSections(pageFlags, isAuthenticated, role);
  // Burger My Space excludes Settings (per governance: Settings in avatar dropdown only)
  const burgerWorkspace = sections.workspace.filter(item => item.href !== '/settings');

  const renderItem = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClose}
      className="block py-2 px-3 hover:bg-white/10 active:bg-white/10 focus:bg-white/10 rounded text-white"
    >
      {t(item.labelKey)}
    </Link>
  );

  const renderAdminItem = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClose}
      className="block py-2 px-3 hover:bg-white/10 active:bg-white/10 focus:bg-white/10 rounded text-gold-vein font-medium"
    >
      {item.adminLabelKey ? t(item.adminLabelKey) : t(item.labelKey)}
    </Link>
  );

  return (
    <div className="mt-4 p-4 bg-soralia-primary border-t-4 border-white">
      <nav className="space-y-2">
        <Accordion
          type="multiple"
          defaultValue={['explore', 'community', 'workspace', 'admin']}
          className="space-y-1"
        >
          <AccordionItem
            value="explore"
            className="mb-2 p-2 -mx-2 rounded-xl border border-white/5 bg-white/5"
          >
            <AccordionTrigger className="text-xs font-semibold !text-gold-vein opacity-80 hover:opacity-100 active:opacity-100 focus:opacity-100 uppercase tracking-wider mb-2 px-3 py-1">
              {t('nav.explore')}
            </AccordionTrigger>
            <AccordionContent>{sections.explore.map(item => renderItem(item))}</AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="community"
            className="my-2 p-2 -mx-2 bg-white/10 rounded-xl border border-white/10"
          >
            <AccordionTrigger className="text-xs font-semibold !text-gold-vein opacity-80 hover:opacity-100 active:opacity-100 focus:opacity-100 uppercase tracking-wider mb-2 px-3 py-1">
              {t('nav.community')}
            </AccordionTrigger>
            <AccordionContent>{sections.community.map(item => renderItem(item))}</AccordionContent>
          </AccordionItem>

          {isAuthenticated && burgerWorkspace.length > 0 && (
            <AccordionItem
              value="workspace"
              className="my-2 p-2 -mx-2 rounded-xl border border-white/5 bg-white/5"
            >
              <AccordionTrigger className="text-xs font-semibold !text-gold-vein opacity-80 hover:opacity-100 active:opacity-100 focus:opacity-100 uppercase tracking-wider mb-2 px-3 py-1">
                {t('nav.mySpace')}
              </AccordionTrigger>
              <AccordionContent>{burgerWorkspace.map(item => renderItem(item))}</AccordionContent>
            </AccordionItem>
          )}

          {isAuthenticated && sections.admin.length > 0 && (
            <AccordionItem
              value="admin"
              className="my-2 p-2 -mx-2 rounded-xl border border-white/5 bg-white/5"
            >
              <AccordionTrigger className="text-xs font-semibold !text-gold-vein opacity-80 hover:opacity-100 active:opacity-100 focus:opacity-100 uppercase tracking-wider mb-2 px-3 py-1">
                {t('nav.administration')}
              </AccordionTrigger>
              <AccordionContent>
                {sections.admin.map(item => renderAdminItem(item))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </nav>

      {/* Auth actions */}
      <div className="border-t border-white/20 mt-4 pt-4">
        {isAuthenticated ? (
          <button
            onClick={async () => {
              await authClient.signOut();
              onClose();
              window.location.href = '/';
            }}
            className="block w-full text-left py-2 text-red-300 cursor-pointer"
            type="button"
          >
            {t('nav.logout')}
          </button>
        ) : (
          <Link href="/sign-in" onClick={onClose} className="block py-2 text-soralia-accent">
            {t('nav.login')}
          </Link>
        )}
      </div>
    </div>
  );
}

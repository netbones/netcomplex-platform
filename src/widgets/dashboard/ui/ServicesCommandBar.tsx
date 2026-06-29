'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import {
  Wrench,
  Calendar,
  ChevronRight,
  ClipboardPlus,
  CalendarPlus,
  Plus,
  Check,
  ShoppingBag,
  MessageSquare,
  ClipboardList,
  Building2,
  Users,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ServicesCommandBarUrgency {
  openMaintenance: number;
  upcomingBookings: number;
}

interface ServicesCommandBarProps {
  urgency: ServicesCommandBarUrgency;
  activeShortcuts?: string[];
  onShortcutsChange?: (shortcuts: string[]) => void;
}

interface ShortcutDef {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

// ═══════════════════════════════════════════════════════════════
// SHORTCUT DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  {
    id: 'new-request',
    label: 'New Request',
    icon: ClipboardPlus,
    href: '/dashboard/services/maintenance?action=new',
  },
  {
    id: 'book-facility',
    label: 'Book Facility',
    icon: CalendarPlus,
    href: '/dashboard/services/bookings?action=new',
  },
];

const EXTENDED_SHORTCUTS: ShortcutDef[] = [
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    href: '/dashboard/services/maintenance',
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: Calendar,
    href: '/dashboard/services/bookings',
  },
  {
    id: 'amenities',
    label: 'Amenities',
    icon: Building2,
    href: '/dashboard/services/amenities',
  },
  {
    id: 'events',
    label: 'Events',
    icon: Trophy,
    href: '/dashboard/services/events',
  },
  {
    id: 'surveys',
    label: 'Surveys',
    icon: ClipboardList,
    href: '/dashboard/services/surveys',
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ShoppingBag,
    href: '/dashboard/services/marketplace',
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    href: '/dashboard/services/communication',
  },
  {
    id: 'my-services',
    label: 'My Services',
    icon: Users,
    href: '/dashboard/services/my-services',
  },
];

// ═══════════════════════════════════════════════════════════════
// REACTIVE CTA CHIP
// ═══════════════════════════════════════════════════════════════

interface UrgencyChipProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  colour: string;
}

function UrgencyChip({ href, icon, label, colour }: UrgencyChipProps) {
  const bgMap: Record<string, string> = {
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  };
  const classes = bgMap[colour] ?? bgMap.red;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${classes}`}
    >
      {icon}
      {label}
      <ChevronRight className="w-3 h-3" />
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHORTCUT BUTTON
// ═══════════════════════════════════════════════════════════════

function ShortcutButton({ shortcut }: { shortcut: ShortcutDef }) {
  const { tx } = useSafeTranslation('services');
  const ShortcutIcon = shortcut.icon;
  return (
    <Link
      href={shortcut.href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      <ShortcutIcon className="w-3.5 h-3.5 text-indigo-600" />
      {tx(`shortcuts.${shortcut.id}`, shortcut.label)}
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADD SHORTCUT POPOVER
// ═══════════════════════════════════════════════════════════════

function AddShortcutPopover({
  extendedShortcuts,
  activeShortcuts,
  onToggle,
}: {
  extendedShortcuts: ShortcutDef[];
  activeShortcuts: string[];
  onToggle: (id: string) => void;
}) {
  const { tx } = useSafeTranslation('services');
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 hover:border-gray-400 transition-colors"
        aria-label={tx('shortcuts.add', 'Add shortcut')}
        aria-expanded={open}
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{tx('shortcuts.add', 'Add')}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            onKeyDown={e => {
              if (e.key === 'Escape') setOpen(false);
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
          />
          <div
            className="absolute left-0 top-full mt-1 z-20 w-56 bg-white rounded-lg border border-gray-200 shadow-lg py-1"
            role="menu"
          >
            {extendedShortcuts.map(shortcut => {
              const isActive = activeShortcuts.includes(shortcut.id);
              const ShortcutIcon = shortcut.icon;
              return (
                <button
                  key={shortcut.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isActive}
                  onClick={() => onToggle(shortcut.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <span
                    className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      isActive ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <ShortcutIcon className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{tx(`shortcuts.${shortcut.id}`, shortcut.label)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ServicesCommandBar({
  urgency,
  activeShortcuts = [],
  onShortcutsChange,
}: ServicesCommandBarProps) {
  const hasUrgentItems = urgency.openMaintenance > 0 || urgency.upcomingBookings > 0;

  const handleToggleShortcut = (id: string) => {
    if (!onShortcutsChange) return;
    const next = activeShortcuts.includes(id)
      ? activeShortcuts.filter(s => s !== id)
      : [...activeShortcuts, id];
    onShortcutsChange(next);
  };

  const activeExtendedShortcuts = EXTENDED_SHORTCUTS.filter(s => activeShortcuts.includes(s.id));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="space-y-3">
        {/* Row 1: Reactive CTAs — only rendered if any count > 0 */}
        {hasUrgentItems && (
          <div className="flex flex-wrap gap-2" role="region" aria-label="Items needing attention">
            {urgency.openMaintenance > 0 && (
              <UrgencyChip
                href="/dashboard/services/maintenance"
                icon={<Wrench className="w-3.5 h-3.5" />}
                label={`${urgency.openMaintenance} open ${urgency.openMaintenance === 1 ? 'request' : 'requests'}`}
                colour="red"
              />
            )}
            {urgency.upcomingBookings > 0 && (
              <UrgencyChip
                href="/dashboard/services/bookings"
                icon={<Calendar className="w-3.5 h-3.5" />}
                label={`${urgency.upcomingBookings} upcoming ${urgency.upcomingBookings === 1 ? 'booking' : 'bookings'}`}
                colour="blue"
              />
            )}
          </div>
        )}

        {/* Row 2: Quick links — defaults + user-added */}
        <div className="flex flex-wrap items-center gap-2">
          {DEFAULT_SHORTCUTS.map(shortcut => (
            <ShortcutButton key={shortcut.id} shortcut={shortcut} />
          ))}

          {activeExtendedShortcuts.map(shortcut => (
            <ShortcutButton key={shortcut.id} shortcut={shortcut} />
          ))}

          <AddShortcutPopover
            extendedShortcuts={EXTENDED_SHORTCUTS}
            activeShortcuts={activeShortcuts}
            onToggle={handleToggleShortcut}
          />
        </div>
      </div>
    </div>
  );
}

export default ServicesCommandBar;

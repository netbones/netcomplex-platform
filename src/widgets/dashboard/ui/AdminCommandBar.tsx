'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Users,
  BarChart2,
  Megaphone,
  ChevronRight,
  UserPlus,
  Calendar,
  Star,
  FolderPlus,
  Plus,
  Shield,
  ExternalLink,
  Home,
  Tag,
  CalendarPlus,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CommandBarUrgency {
  openMaintenance: number;
  pendingMembers: number;
  closingSurveys: number;
  expiredAnnouncements: number;
}

interface AdminCommandBarProps {
  urgency: CommandBarUrgency;
  isPlatformAdmin: boolean;
  activeShortcuts?: string[];
  onShortcutsChange?: (shortcuts: string[]) => void;
}

interface ShortcutDef {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** Feature flag required to show this shortcut (null = always shown) */
  flag?: string | null;
  /** Only show for full admin role (not board/committee) */
  adminOnly?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SHORTCUT DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  {
    id: 'invite-user',
    label: 'Invite User',
    icon: UserPlus,
    href: '/admin/users?action=invite',
  },
  {
    id: 'new-announcement',
    label: 'New Announcement',
    icon: Megaphone,
    href: '/admin/announcements?action=new',
  },
  {
    id: 'new-event',
    label: 'New Event',
    icon: Calendar,
    href: '/admin/events?action=new',
  },
  {
    id: 'new-survey',
    label: 'New Survey',
    icon: BarChart2,
    href: '/admin/surveys?action=new',
  },
  {
    id: 'new-competition',
    label: 'New Competition',
    icon: Star,
    href: '/admin/competitions?action=new',
  },
  {
    id: 'add-resource',
    label: 'Add Resource',
    icon: FolderPlus,
    href: '/admin/resources?action=new',
  },
];

const EXTENDED_SHORTCUTS: ShortcutDef[] = [
  {
    id: 'new-group',
    label: 'New Group',
    icon: Users,
    href: '/admin/groups?action=new',
    flag: 'groups',
  },
  {
    id: 'new-booking',
    label: 'New Booking',
    icon: CalendarPlus,
    href: '/admin/bookings',
    flag: 'bookings',
  },
  {
    id: 'external-survey',
    label: 'External Survey',
    icon: ExternalLink,
    href: '/admin/surveys?type=external',
  },
  {
    id: 'invite-board',
    label: 'Invite Board Member',
    icon: Shield,
    href: '/admin/users?role=board',
    adminOnly: true,
  },
  {
    id: 'new-category',
    label: 'New Category',
    icon: Tag,
    href: '/admin/categories',
  },
  {
    id: 'manage-households',
    label: 'Manage Households',
    icon: Home,
    href: '/admin/households',
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
  const ShortcutIcon = shortcut.icon;
  return (
    <Link
      href={shortcut.href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      <ShortcutIcon className="w-3.5 h-3.5 text-indigo-600" />
      {shortcut.label}
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
  isAdmin,
}: {
  extendedShortcuts: ShortcutDef[];
  activeShortcuts: string[];
  onToggle: (id: string) => void;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Filter out admin-only shortcuts if user isn't admin
  const available = extendedShortcuts.filter(s => !s.adminOnly || isAdmin);

  if (available.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 hover:border-gray-400 transition-colors"
        aria-label="Add shortcut"
        aria-expanded={open}
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Add</span>
      </button>

      {open && (
        <>
          {/* Backdrop to close popover */}
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
            {available.map(shortcut => {
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
                  <span className="truncate">{shortcut.label}</span>
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

export function AdminCommandBar({
  urgency,
  isPlatformAdmin,
  activeShortcuts = [],
  onShortcutsChange,
}: AdminCommandBarProps) {
  const hasUrgentItems =
    urgency.openMaintenance > 0 ||
    urgency.pendingMembers > 0 ||
    urgency.closingSurveys > 0 ||
    urgency.expiredAnnouncements > 0;

  const isAdmin = isPlatformAdmin; // Platform admins are always full admins

  const handleToggleShortcut = (id: string) => {
    if (!onShortcutsChange) return;
    const next = activeShortcuts.includes(id)
      ? activeShortcuts.filter(s => s !== id)
      : [...activeShortcuts, id];
    onShortcutsChange(next);
  };

  // Resolve active extended shortcuts from IDs
  const activeExtendedShortcuts = EXTENDED_SHORTCUTS.filter(s => activeShortcuts.includes(s.id));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="space-y-3">
        {/* Row 1: Reactive CTAs — only rendered if any count > 0 */}
        {hasUrgentItems && (
          <div className="flex flex-wrap gap-2" role="region" aria-label="Items needing attention">
            {urgency.openMaintenance > 0 && (
              <UrgencyChip
                href="/admin/maintenance"
                icon={<Wrench className="w-3.5 h-3.5" />}
                label={`${urgency.openMaintenance} open ${urgency.openMaintenance === 1 ? 'request' : 'requests'}`}
                colour="red"
              />
            )}
            {urgency.pendingMembers > 0 && (
              <UrgencyChip
                href="/admin/users"
                icon={<Users className="w-3.5 h-3.5" />}
                label={`${urgency.pendingMembers} pending ${urgency.pendingMembers === 1 ? 'member' : 'members'}`}
                colour="amber"
              />
            )}
            {urgency.closingSurveys > 0 && (
              <UrgencyChip
                href="/admin/surveys"
                icon={<BarChart2 className="w-3.5 h-3.5" />}
                label={`${urgency.closingSurveys} closing ${urgency.closingSurveys === 1 ? 'survey' : 'surveys'}`}
                colour="blue"
              />
            )}
            {urgency.expiredAnnouncements > 0 && (
              <UrgencyChip
                href="/admin/announcements"
                icon={<Megaphone className="w-3.5 h-3.5" />}
                label={`${urgency.expiredAnnouncements} expired ${urgency.expiredAnnouncements === 1 ? 'announcement' : 'announcements'}`}
                colour="orange"
              />
            )}
          </div>
        )}

        {/* Row 2: Creation shortcuts — always visible */}
        <div className="flex flex-wrap items-center gap-2">
          {DEFAULT_SHORTCUTS.map(shortcut => (
            <ShortcutButton key={shortcut.id} shortcut={shortcut} />
          ))}

          {/* Active extended shortcuts */}
          {activeExtendedShortcuts.map(shortcut => (
            <ShortcutButton key={shortcut.id} shortcut={shortcut} />
          ))}

          {/* "+" Add Shortcut popover */}
          <AddShortcutPopover
            extendedShortcuts={EXTENDED_SHORTCUTS}
            activeShortcuts={activeShortcuts}
            onToggle={handleToggleShortcut}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}

export default AdminCommandBar;

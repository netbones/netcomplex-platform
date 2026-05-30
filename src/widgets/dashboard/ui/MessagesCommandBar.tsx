'use client';

import Link from 'next/link';
import { MessageSquare, Users, Megaphone, Send, ChevronRight } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MessagesCommandBarUrgency {
  unreadDirect: number;
  unreadGroup: number;
  unreadAnnouncements: number;
}

interface MessagesCommandBarProps {
  urgency: MessagesCommandBarUrgency;
}

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

function ShortcutButton({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      <Icon className="w-3.5 h-3.5 text-indigo-600" />
      {label}
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MessagesCommandBar({ urgency }: MessagesCommandBarProps) {
  const hasUrgentItems =
    urgency.unreadDirect > 0 || urgency.unreadGroup > 0 || urgency.unreadAnnouncements > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="space-y-3">
        {/* Row 1: Reactive CTAs — only rendered if any count > 0 */}
        {hasUrgentItems && (
          <div className="flex flex-wrap gap-2" role="region" aria-label="Items needing attention">
            {urgency.unreadDirect > 0 && (
              <UrgencyChip
                href="/dashboard/messages/conversations"
                icon={<MessageSquare className="w-3.5 h-3.5" />}
                label={`${urgency.unreadDirect} unread direct ${urgency.unreadDirect === 1 ? 'message' : 'messages'}`}
                colour="red"
              />
            )}
            {urgency.unreadGroup > 0 && (
              <UrgencyChip
                href="/dashboard/messages/conversations"
                icon={<Users className="w-3.5 h-3.5" />}
                label={`${urgency.unreadGroup} unread group ${urgency.unreadGroup === 1 ? 'message' : 'messages'}`}
                colour="amber"
              />
            )}
            {urgency.unreadAnnouncements > 0 && (
              <UrgencyChip
                href="/dashboard/messages/announcements"
                icon={<Megaphone className="w-3.5 h-3.5" />}
                label={`${urgency.unreadAnnouncements} new ${urgency.unreadAnnouncements === 1 ? 'announcement' : 'announcements'}`}
                colour="orange"
              />
            )}
          </div>
        )}

        {/* Row 2: Shortcuts — always visible */}
        <div className="flex flex-wrap items-center gap-2">
          <ShortcutButton
            href="/dashboard/messages/conversations?action=new"
            icon={Send}
            label="New Message"
          />
        </div>
      </div>
    </div>
  );
}

export default MessagesCommandBar;

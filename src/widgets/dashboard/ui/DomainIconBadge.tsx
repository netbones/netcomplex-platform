'use client';

import {
  Users,
  Wrench,
  FileText,
  CalendarDays,
  Trophy,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  Award,
  Scale,
  ShieldCheck,
  Store,
  Wallet,
  Building2,
  GraduationCap,
  UserCog,
  Settings,
  Zap,
  Briefcase,
  MessageSquare,
  Leaf,
  Calendar,
  Bell,
  Image as ImageIcon,
  Home,
  Tag,
  type LucideIcon,
} from 'lucide-react';

export type DomainIconVariant = 'admin' | 'services' | 'messages';

const ICON_MAPS: Record<DomainIconVariant, Record<string, LucideIcon>> = {
  admin: {
    users: Users,
    maintenance: Wrench,
    content: FileText,
    events: CalendarDays,
    competitions: Trophy,
    resources: BookOpen,
    surveys: ClipboardCheck,
    announcements: Megaphone,
    merits: ShieldCheck,
    achievements: Award,
    disputes: Scale,
    dwallet: Wallet,
    providers: Store,
    bookings: Building2,
    amenities: Building2,
    services: Zap,
    carousel: ImageIcon,
    education: GraduationCap,
    teams: UserCog,
    groups: UserCog,
    system: Settings,
    gallery: ImageIcon,
    households: Home,
    categories: Tag,
  },
  services: {
    maintenance: Wrench,
    bookings: Calendar,
    amenities: Building2,
    'my-services': Briefcase,
    events: CalendarDays,
    surveys: ClipboardCheck,
    competitions: Trophy,
    communication: MessageSquare,
    disputes: Scale,
    marketplace: Store,
    education: GraduationCap,
    directory: Users,
    groups: UserCog,
    resources: BookOpen,
    conservation: Leaf,
    wallet: Wallet,
    settings: Settings,
  },
  messages: {
    conversations: MessageSquare,
    announcements: Megaphone,
    notifications: Bell,
  },
};

const COLOR_MAPS: Record<DomainIconVariant, Record<string, string>> = {
  admin: {
    users: 'bg-blue-100 text-blue-600',
    maintenance: 'bg-orange-100 text-orange-600',
    content: 'bg-violet-100 text-violet-600',
    events: 'bg-pink-100 text-pink-600',
    competitions: 'bg-amber-100 text-amber-600',
    resources: 'bg-teal-100 text-teal-600',
    surveys: 'bg-cyan-100 text-cyan-600',
    announcements: 'bg-indigo-100 text-indigo-600',
    merits: 'bg-emerald-100 text-emerald-600',
    achievements: 'bg-rose-100 text-rose-600',
    disputes: 'bg-red-100 text-red-600',
    dwallet: 'bg-yellow-100 text-yellow-600',
    providers: 'bg-sky-100 text-sky-600',
    bookings: 'bg-green-100 text-green-600',
    amenities: 'bg-emerald-100 text-emerald-600',
    services: 'bg-purple-100 text-purple-600',
    carousel: 'bg-lime-100 text-lime-600',
    education: 'bg-fuchsia-100 text-fuchsia-600',
    teams: 'bg-slate-100 text-slate-600',
    groups: 'bg-green-100 text-green-600',
    system: 'bg-gray-100 text-gray-600',
    gallery: 'bg-stone-100 text-stone-600',
    households: 'bg-teal-100 text-teal-600',
    categories: 'bg-indigo-100 text-indigo-600',
  },
  services: {
    maintenance: 'bg-orange-100 text-orange-600',
    bookings: 'bg-blue-100 text-blue-600',
    amenities: 'bg-green-100 text-green-600',
    'my-services': 'bg-purple-100 text-purple-600',
    events: 'bg-pink-100 text-pink-600',
    surveys: 'bg-teal-100 text-teal-600',
    competitions: 'bg-amber-100 text-amber-600',
    communication: 'bg-indigo-100 text-indigo-600',
    disputes: 'bg-red-100 text-red-600',
    marketplace: 'bg-cyan-100 text-cyan-600',
    education: 'bg-rose-100 text-rose-600',
    directory: 'bg-sky-100 text-sky-600',
    groups: 'bg-emerald-100 text-emerald-600',
    resources: 'bg-violet-100 text-violet-600',
    conservation: 'bg-lime-100 text-lime-600',
    wallet: 'bg-yellow-100 text-yellow-600',
    settings: 'bg-gray-100 text-gray-600',
  },
  messages: {
    conversations: 'bg-indigo-100 text-indigo-600',
    announcements: 'bg-amber-100 text-amber-600',
    notifications: 'bg-red-100 text-red-600',
  },
};

const SIZE_CLASSES = {
  sm: { box: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { box: 'w-12 h-12', icon: 'w-6 h-6' },
  xl: { box: 'w-14 h-14', icon: 'w-7 h-7' },
} as const;

const DEFAULT_ICON: LucideIcon = Settings;

export function getDomainIcon(id: string, variant: DomainIconVariant = 'admin'): LucideIcon {
  return ICON_MAPS[variant][id] ?? DEFAULT_ICON;
}

export function getDomainColor(id: string, variant: DomainIconVariant = 'admin'): string {
  return COLOR_MAPS[variant][id] ?? 'bg-gray-100 text-gray-600';
}

export function DomainIconBadge({
  id,
  variant = 'admin',
  size = 'md',
  className = '',
}: {
  id: string;
  variant?: DomainIconVariant;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const Icon = getDomainIcon(id, variant);
  const sizeClass = SIZE_CLASSES[size];
  const colorClass = getDomainColor(id, variant);
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 rounded-full ${sizeClass.box} ${colorClass} ${className}`}
      aria-hidden="true"
    >
      <Icon className={sizeClass.icon} />
    </div>
  );
}

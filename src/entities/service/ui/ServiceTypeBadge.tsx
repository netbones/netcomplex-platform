'use client';

import { Building2, Shield, User } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  COMMUNITY: <Building2 className="w-3.5 h-3.5" />,
  MEMBER: <User className="w-3.5 h-3.5" />,
  THIRD_PARTY: <Shield className="w-3.5 h-3.5" />,
};

interface ServiceTypeBadgeProps {
  type: 'COMMUNITY' | 'MEMBER' | 'THIRD_PARTY';
}

export function ServiceTypeBadge({ type }: ServiceTypeBadgeProps) {
  const configs = {
    COMMUNITY: {
      label: 'Community Service',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    },
    MEMBER: {
      label: 'Member Service',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
    },
    THIRD_PARTY: {
      label: 'Trusted Provider',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
    },
  };

  const config = configs[type];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {ICON_MAP[type]}
      <span>{config.label}</span>
    </div>
  );
}

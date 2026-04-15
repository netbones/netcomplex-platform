'use client';

interface ServiceTypeBadgeProps {
  type: 'COMMUNITY' | 'MEMBER' | 'THIRD_PARTY';
}

export function ServiceTypeBadge({ type }: ServiceTypeBadgeProps) {
  const configs = {
    COMMUNITY: {
      label: 'Community Service',
      icon: 'fas fa-building',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    },
    MEMBER: {
      label: 'Member Service',
      icon: 'fas fa-user',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
    },
    THIRD_PARTY: {
      label: 'Trusted Provider',
      icon: 'fas fa-shield-alt',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
    },
  };

  const config = configs[type];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      <i className={config.icon} aria-hidden="true"></i>
      <span>{config.label}</span>
    </div>
  );
}

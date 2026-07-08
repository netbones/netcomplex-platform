'use client';
import Image from 'next/image';

interface ParticipantAvatarProps {
  name: string;
  avatar: string | null;
  size?: 'sm' | 'md' | 'lg';
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  sm: 'w-5 h-5 text-[8px]',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function ParticipantAvatar({
  name,
  avatar,
  size = 'md',
  showOnlineIndicator = false,
  isOnline = false,
}: ParticipantAvatarProps) {
  const sizeClass = sizeClasses[size];

  return (
    <div className="relative">
      <div className={`rounded-full overflow-hidden border border-white ${sizeClass} relative`}>
        {avatar ? (
          <Image src={avatar} alt={name} fill className="w-full h-full object-cover" unoptimized />
        ) : (
          <div
            className={`w-full h-full bg-soralia-primary/20 flex items-center justify-center ${sizeClass}`}
          >
            <span className="text-soralia-primary font-medium">{name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      {showOnlineIndicator && isOnline && (
        <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-white" />
      )}
    </div>
  );
}

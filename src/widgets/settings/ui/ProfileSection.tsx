'use client';

import { ImageUpload } from '@shared/ui';
import Image from 'next/image';

interface ProfileSectionProps {
  userName: string;
  userEmail: string;
  userAvatar: string;
  onAvatarChange: (url: string) => Promise<void>;
  isSafeImageUrl: (url: string) => boolean;
}

export function ProfileSection({
  userName,
  userEmail,
  userAvatar,
  onAvatarChange,
  isSafeImageUrl,
}: ProfileSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
      <div className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            {userAvatar && isSafeImageUrl(userAvatar) ? (
              <Image
                src={userAvatar}
                alt="Profile"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-2xl">{userName?.charAt(0) || '?'}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <ImageUpload
              value={userAvatar}
              onChange={onAvatarChange}
              label="Change profile photo"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <p className="mt-1 text-gray-900">{userName || 'Not set'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-gray-900">{userEmail || 'Not set'}</p>
        </div>
      </div>
    </div>
  );
}

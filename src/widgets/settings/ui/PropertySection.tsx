'use client';

import { ImageUpload } from '@shared/ui';
import Image from 'next/image';

interface PropertySectionProps {
  householdId: string | null;
  householdImage: string;
  isOwner: boolean;
  loading: boolean;
  onImageChange: (url: string) => Promise<void>;
  isSafeImageUrl: (url: string) => boolean;
}

export function PropertySection({
  householdId,
  householdImage,
  isOwner,
  loading,
  onImageChange,
  isSafeImageUrl,
}: PropertySectionProps) {
  if (!householdId) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Image</h2>
      <p className="text-sm text-gray-600 mb-4">
        {isOwner
          ? 'Upload a photo of your property. This will be displayed in the directory.'
          : 'Your property photo (managed by property owner).'}
      </p>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : isOwner ? (
        <ImageUpload value={householdImage} onChange={onImageChange} label="" />
      ) : householdImage && isSafeImageUrl(householdImage) ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden">
          <Image
            src={householdImage}
            alt="Property"
            fill
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
      ) : (
        <p className="text-gray-400 italic">No property image available</p>
      )}
    </div>
  );
}

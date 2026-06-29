'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ServiceListing } from '@entities/service';
import { trpc, useSession } from '@api/client';

interface InquireModalProps {
  listing: ServiceListing;
  isOpen: boolean;
  onClose: () => void;
}

export function InquireModal({ listing, isOpen, onClose }: InquireModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const findOrCreate = trpc.chat.findOrCreateConversation.useMutation();

  const handleChat = useCallback(() => {
    if (!session?.user?.id || !listing.provider?.id) return;
    findOrCreate.mutate(
      { participantIds: [session.user.id, listing.provider.id] },
      {
        onSuccess: () => {
          onClose();
          router.push('/messages');
        },
      }
    );
  }, [session, listing.provider, findOrCreate, onClose, router]);

  if (!isOpen) return null;

  return (
    <>
      <button
        className="fixed inset-0 bg-black/50 z-40 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Inquire</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-base font-medium text-gray-900">{listing.title}</h4>
            <p className="text-sm text-gray-500 mt-1">{listing.category}</p>
          </div>

          {listing.provider && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-gray-700">Provider Details</h5>
              <p className="text-sm text-gray-900">{listing.provider.name}</p>

              <div className="flex flex-wrap items-center gap-2">
                {listing.provider.email && (
                  <a
                    href={`mailto:${listing.provider.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-700 bg-indigo-50 rounded-full hover:bg-indigo-100 min-w-[44px] min-h-[44px]"
                  >
                    <i className="fas fa-envelope text-xs" />
                    Email
                  </a>
                )}

                {listing.provider.phone && (
                  <a
                    href={`tel:${listing.provider.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 rounded-full hover:bg-green-100 min-w-[44px] min-h-[44px]"
                  >
                    <i className="fas fa-phone text-xs" />
                    Call
                  </a>
                )}

                {session?.user?.id && listing.provider.id && (
                  <button
                    onClick={handleChat}
                    disabled={findOrCreate.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 disabled:opacity-50 min-w-[44px] min-h-[44px]"
                  >
                    <i className="fas fa-comment text-xs" />
                    {findOrCreate.isPending ? 'Starting...' : 'Chat'}
                  </button>
                )}
              </div>
            </div>
          )}

          {listing.price != null && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Pricing</h5>
              <p className="text-sm text-gray-900">
                {listing.priceType} &mdash; {listing.price} {listing.currency}
              </p>
            </div>
          )}

          {listing.serviceAreas?.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Service Areas</h5>
              <div className="flex flex-wrap gap-1">
                {listing.serviceAreas.map(area => (
                  <span
                    key={area}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            {listing.verified ? 'Verified provider' : 'This provider has not been verified'}
          </p>
        </div>
      </div>
    </>
  );
}

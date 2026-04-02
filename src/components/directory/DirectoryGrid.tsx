import { CARD_HEADER_COLORS, CARD_ANIMATIONS } from '@/lib/constants';
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { ChatModal } from './DirectoryChatModal';
import { ResidentCard, ResidentListItem, type Resident } from './ResidentCard';

interface DirectoryGridProps {
  residents: Resident[];
  viewMode?: 'grid' | 'list';
}

export function DirectoryGrid({ residents, viewMode = 'grid' }: DirectoryGridProps) {
  const { data: session } = authClient.useSession();
  const [chatUser, setChatUser] = useState<{ id: string; name: string } | null>(null);
  const currentUserId = session?.user?.id || '';
  const currentUserName = session?.user?.name || '';

  const openChat = (user: { id: string; name: string }) => {
    setChatUser(user);
  };

  const closeChat = () => {
    setChatUser(null);
  };

  if (residents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No residents found matching your criteria.</p>
      </div>
    );
  }

  const canChat = Boolean(currentUserId);

  return (
    <>
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {residents.map((resident, idx) => {
            const headerColor = CARD_HEADER_COLORS[idx % CARD_HEADER_COLORS.length];
            const avatarUrl =
              resident.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;
            const interestList = Array.isArray(resident.interests) ? resident.interests : [];

            return (
              <ResidentListItem
                key={resident.id}
                resident={resident}
                headerColor={headerColor}
                avatarUrl={avatarUrl}
                interestList={interestList}
                onChat={() => openChat({ id: resident.id, name: resident.name })}
                canChat={canChat && currentUserId !== resident.id}
                showChatButton={true}
              />
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {residents.map((resident, idx) => {
            const headerColor = CARD_HEADER_COLORS[idx % CARD_HEADER_COLORS.length];
            const avatarUrl =
              resident.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;
            const interestList = Array.isArray(resident.interests) ? resident.interests : [];

            return (
              <ResidentCard
                key={resident.id}
                resident={resident}
                headerColor={headerColor}
                avatarUrl={avatarUrl}
                interestList={interestList}
                onChat={() => openChat({ id: resident.id, name: resident.name })}
                canChat={canChat && currentUserId !== resident.id}
                showChatButton={true}
              />
            );
          })}
        </div>
      )}

      {chatUser && currentUserId && (
        <ChatModal
          recipientId={chatUser.id}
          recipientName={chatUser.name}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={closeChat}
        />
      )}
    </>
  );
}

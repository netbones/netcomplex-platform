import { CARD_HEADER_COLORS } from '@/lib/constants';
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { ChatModal } from './DirectoryChatModal';
import { UnifiedResidentCard, type Resident } from '../shared/UnifiedResidentCard';

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

  // For demo purposes, allow chat functionality
  // In production, this should be: Boolean(currentUserId)
  const canChat = true;

  return (
    <>
      <div
        className={
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'
        }
      >
        {residents.map((resident, idx) => {
          const headerColor = CARD_HEADER_COLORS[idx % CARD_HEADER_COLORS.length];
          const avatarUrl =
            resident.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;

          return (
            <UnifiedResidentCard
              key={resident.id}
              resident={resident}
              viewMode={viewMode}
              headerColor={headerColor}
              avatarUrl={avatarUrl}
              isChatVisible={canChat && (!currentUserId || currentUserId !== resident.id)}
              onChat={() => openChat({ id: resident.id, name: resident.name })}
              index={idx}
            />
          );
        })}
      </div>

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

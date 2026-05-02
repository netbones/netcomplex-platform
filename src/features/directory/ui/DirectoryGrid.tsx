'use client';

import { CARD_HEADER_COLORS, createComponentLogger } from '@shared/lib';
import { authClient } from '@api/auth-client';
import { useState, useEffect } from 'react';
// import { ChatModal } from './DirectoryChatModal'; // TODO: Fix chat modal
import { UnifiedResidentCard, type Resident } from '@entities/directory';

const log = createComponentLogger('DirectoryGrid');

interface DirectoryGridProps {
  residents: Resident[];
  viewMode?: 'grid' | 'list';
}

export function DirectoryGrid({ residents, viewMode = 'grid' }: DirectoryGridProps) {
  const { data: session } = authClient.useSession();
  const [chatUser, setChatUser] = useState<{ id: string; name: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const currentUserId = session?.user?.id || '';
  const currentUserName = session?.user?.name || '';

  useEffect(() => {
    if (currentUserId) {
      const fetchUnreadCounts = async () => {
        try {
          const response = await fetch('/api/messages/unread');
          if (response.ok) {
            const data = await response.json();
            setUnreadCounts(data.unreadCounts || {});
          }
        } catch (error) {
          log.error({}, 'Failed to fetch unread counts', error);
        }
      };

      fetchUnreadCounts();
    }
  }, [currentUserId]);

  const openChat = (user: { id: string; name: string }) => {
    setChatUser(user);
  };

  const closeChat = () => {
    setChatUser(null);
  };

  const canChat = Boolean(currentUserId);

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

          const isCurrentUser = currentUserId === resident.id;
          const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
          const unreadCount = isCurrentUser ? totalUnread : unreadCounts[resident.id] || 0;

          return (
            <UnifiedResidentCard
              key={resident.id}
              resident={resident}
              viewMode={viewMode}
              headerColor={headerColor}
              avatarUrl={avatarUrl}
              isChatVisible={canChat && !isCurrentUser}
              onChat={() => openChat({ id: resident.id, name: resident.name })}
              index={idx}
              unreadCount={unreadCount}
              isCurrentUser={isCurrentUser}
            />
          );
        })}
      </div>

      {/* TODO: Fix chat modal
      {chatUser && currentUserId && (
        <ChatModal
          recipientId={chatUser.id}
          recipientName={chatUser.name}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={closeChat}
        />
      )} */}
    </>
  );
}

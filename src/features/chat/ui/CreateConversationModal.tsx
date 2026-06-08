'use client';

import { useState } from 'react';
import { ParticipantAvatar, type ConversationListItem } from '@entities/chat';
import { apiPost } from '@shared/api';

type ConversationType = 'DIRECT' | 'GROUP';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface CreateConversationModalProps {
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onCreated: (conversation: ConversationListItem) => void;
}

export function CreateConversationModal({
  users,
  currentUserId,
  onClose,
  onCreated,
}: CreateConversationModalProps) {
  const [chatType, setChatType] = useState<ConversationType>('DIRECT');
  const [name, setName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const newConv = await apiPost<ConversationListItem>('/api/conversations', {
        name: chatType === 'GROUP' ? name : null,
        type: chatType,
        participantIds: [currentUserId, ...selectedUsers],
      });
      onCreated(newConv);
      onClose();
    } catch {
      // apiPost throws on error; user can retry
    } finally {
      setCreating(false);
    }
  };

  const availableUsers = users.filter(u => u.id !== currentUserId);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">New Conversation</h3>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setChatType('DIRECT');
                setName('');
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                chatType === 'DIRECT'
                  ? 'bg-soralia-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Direct Message
            </button>
            <button
              onClick={() => setChatType('GROUP')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                chatType === 'GROUP'
                  ? 'bg-soralia-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Group Chat
            </button>
          </div>

          {chatType === 'GROUP' && (
            <input
              type="text"
              placeholder="Group name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            />
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              {chatType === 'DIRECT' ? 'Select person:' : 'Select participants:'}
            </p>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
              {availableUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  disabled={
                    chatType === 'DIRECT' &&
                    selectedUsers.length > 0 &&
                    !selectedUsers.includes(user.id)
                  }
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left ${
                    selectedUsers.includes(user.id)
                      ? 'bg-soralia-light border border-soralia-primary'
                      : 'hover:bg-gray-50'
                  } ${
                    chatType === 'DIRECT' &&
                    selectedUsers.length > 0 &&
                    !selectedUsers.includes(user.id)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <ParticipantAvatar name={user.name} avatar={user.avatar || null} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <svg
                      className="w-4 h-4 text-soralia-primary flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || (chatType === 'GROUP' && !name) || creating}
            className="flex-1 py-2 bg-soralia-primary text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

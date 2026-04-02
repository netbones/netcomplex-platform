'use client';

import { useState } from 'react';
import { useChat } from './useChat';
import { EmojiPickerButton } from './EmojiPickerButton';

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
}

export function ChatWindow({ conversationId, currentUserId, currentUserName }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const {
    messages,
    loading,
    onlineCount,
    messagesEndRef,
    sendMessage,
    handleInputChange,
    formatTypingUsers,
  } = useChat({
    conversationId,
    currentUserId,
    currentUserName,
  });

  const handleInputChangeWrapper = (value: string) => {
    handleInputChange(value, setNewMessage);
  };

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function insertEmoji(emoji: string) {
    setNewMessage(prev => prev + emoji);
  }

  async function handleSend() {
    if ((!newMessage.trim() && !selectedImage) || !conversationId) return;

    const messageData = selectedImage
      ? { content: 'Image', type: 'IMAGE' as const, mediaUrl: selectedImage }
      : { content: newMessage, type: 'TEXT' as const };

    await sendMessage(messageData.content, messageData.type, messageData.mediaUrl);
    setNewMessage('');
    setSelectedImage(null);
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-lg shadow">
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-gray-600">{onlineCount} online</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender.id === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.sender.id === currentUserId
                    ? 'bg-soralia-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {msg.sender.id === currentUserId ? 'You' : msg.sender.name}
                </p>
                {msg.type === 'IMAGE' && msg.mediaUrl ? (
                  <img
                    src={msg.mediaUrl}
                    alt="Shared"
                    className="rounded-lg max-w-full h-auto mt-1"
                  />
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {formatTypingUsers() && (
        <div className="px-4 py-1 text-xs text-gray-500 italic">{formatTypingUsers()}</div>
      )}

      <div className="border-t p-4 flex flex-col gap-2">
        {selectedImage && (
          <div className="relative">
            <img src={selectedImage} alt="Preview" className="h-20 rounded-lg object-cover" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <label className="cursor-pointer p-2 text-gray-500 hover:text-soralia-primary">
            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </label>

          <EmojiPickerButton onEmojiSelect={insertEmoji} />

          <input
            type="text"
            value={newMessage}
            onChange={e => handleInputChangeWrapper(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() && !selectedImage}
            className="bg-soralia-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

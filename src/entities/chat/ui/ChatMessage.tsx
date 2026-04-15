'use client';

import type { Message } from '../model/types';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

export function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isCurrentUser ? 'bg-soralia-primary text-white' : 'bg-gray-100 text-gray-800'
        }`}
      >
        <p className="text-sm font-medium mb-1">{isCurrentUser ? 'You' : message.sender.name}</p>
        {message.type === 'IMAGE' && message.mediaUrl ? (
          <img src={message.mediaUrl} alt="Shared" className="rounded-lg max-w-full h-auto mt-1" />
        ) : (
          <p className="text-sm">{message.content}</p>
        )}
        <p className="text-xs opacity-70 mt-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

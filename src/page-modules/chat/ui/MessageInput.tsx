'use client';

import { useState } from 'react';
import Image from 'next/image';
import { COMMON_EMOJIS } from '@entities/chat';

interface MessageInputProps {
  onSend: (text: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = () => {
    if (!newMessage.trim() && !selectedImage) return;
    onSend(newMessage);
    setNewMessage('');
    setSelectedImage(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="border-t border-gray-100 p-4 shrink-0 bg-white">
      {selectedImage && (
        <div className="relative inline-block mb-3 bg-gray-50 p-1.5 rounded-xl border border-gray-150">
          <Image
            src={selectedImage}
            alt="Preview"
            fill
            className="h-20 max-w-[120px] rounded-lg object-cover"
            unoptimized
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow hover:bg-red-600 transition"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0">
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

        <div className="relative shrink-0">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-100 rounded-xl shadow-lg p-2.5 flex gap-1.5 z-20">
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="p-1.5 hover:bg-gray-50 rounded-lg text-lg transition duration-150"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white focus:border-indigo-500 focus:ring-0 focus:outline-none transition-all duration-200 text-sm px-4 py-2.5 rounded-full border border-gray-100"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!newMessage.trim() && !selectedImage}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-sm shadow-indigo-100"
        >
          <svg
            className="w-4 h-4 transform rotate-45"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

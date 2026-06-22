'use client';

import type { Message } from '../model/types';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  showSenderName?: boolean;
}

// Simple link preview parser helper
function parseLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);

  if (!urls) return { text, previews: [] };

  // Strip URLs from text for cleaner bubble or keep them highlighted
  // For standard chat, we keep the text but highlight the links
  const parts = text.split(urlRegex);
  const elements = parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80 break-all font-medium text-inherit"
        >
          {part.replace(/^https?:\/\/(www\.)?/, '')}
        </a>
      );
    }
    return part;
  });

  return {
    elements,
    previews: urls.map(url => {
      try {
        const urlObj = new URL(url);
        return {
          url,
          domain: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
        };
      } catch {
        return { url, domain: url, path: '' };
      }
    }),
  };
}

export function ChatMessage({ message, isCurrentUser, showSenderName = false }: ChatMessageProps) {
  const { elements, previews } = parseLinks(message.content);
  const isImage = message.type === 'IMAGE' && message.mediaUrl;

  return (
    <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} mb-1`}>
      {showSenderName && !isCurrentUser && (
        <span className="text-xs text-gray-500 mb-1 ml-2 font-medium">{message.sender.name}</span>
      )}

      <div className={`flex flex-col max-w-[75%] md:max-w-[65%] group`}>
        {/* Link Previews - rendered on top of the message if any exist, similar to x.com */}
        {!isImage && previews.length > 0 && (
          <div className="mb-1.5 flex flex-col gap-1 w-full">
            {previews.map((preview, idx) => (
              <a
                key={idx}
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-50 hover:bg-gray-100/80 border border-gray-100 rounded-xl p-3 text-xs transition duration-200"
              >
                <div className="font-semibold text-gray-800 mb-0.5">{preview.domain}</div>
                <div className="text-gray-500 truncate">{preview.path || '/'}</div>
              </a>
            ))}
          </div>
        )}

        <div
          className={`px-4 py-2.5 shadow-sm transition-all duration-200 ${
            isCurrentUser
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl rounded-tr-none'
              : 'bg-gray-100 rounded-2xl rounded-tl-none'
          }`}
        >
          {isImage ? (
            <div className="relative overflow-hidden rounded-lg mt-1">
              <img
                src={message.mediaUrl!}
                alt="Shared content"
                className="max-w-full max-h-[300px] object-cover rounded-lg"
              />
            </div>
          ) : (
            <p
              className={`text-[14px] leading-relaxed break-words ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}
            >
              {elements}
            </p>
          )}
        </div>

        {/* Message Timestamp */}
        <span className="text-[10px] text-gray-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

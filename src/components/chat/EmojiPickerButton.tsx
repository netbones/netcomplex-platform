'use client';

import { useState, useEffect } from 'react';
import { EmojiPicker, useSkinTone } from 'frimousse';

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPickerButton({ onEmojiSelect }: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [skinTone, setSkinTone] = useState<
    'none' | 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark'
  >('none');

  // Load saved skin tone preference
  useEffect(() => {
    const saved = localStorage.getItem('emojiSkinTone');
    if (
      saved &&
      ['none', 'light', 'medium-light', 'medium', 'medium-dark', 'dark'].includes(saved)
    ) {
      setSkinTone(saved as typeof skinTone);
    }
  }, []);

  // Save skin tone when changed
  const handleSkinToneChange = (newTone: string) => {
    setSkinTone(newTone as typeof skinTone);
    localStorage.setItem('emojiSkinTone', newTone);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-soralia-primary"
        type="button"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 z-50">
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
            style={{ width: '320px', maxHeight: '400px' }}
          >
            <EmojiPicker.Root
              onEmojiSelect={({ emoji }) => {
                onEmojiSelect(emoji);
                setIsOpen(false);
              }}
              skinTone={skinTone}
              className="h-[360px]"
              sticky
            >
              <EmojiPicker.Search
                className="m-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                placeholder="Search emoji..."
              />

              <div className="flex items-center gap-2 mx-2 mb-1">
                <EmojiPicker.SkinToneSelector
                  className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                  emoji="👍"
                />
                <select
                  value={skinTone}
                  onChange={e => handleSkinToneChange(e.target.value)}
                  className="text-xs px-2 py-1 border rounded bg-white"
                >
                  <option value="none">Default</option>
                  <option value="light">Light</option>
                  <option value="medium-light">Medium-Light</option>
                  <option value="medium">Medium</option>
                  <option value="medium-dark">Medium-Dark</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <EmojiPicker.ActiveEmoji>
                {({ emoji }) => (
                  <div className="mx-2 mb-1 px-2 py-1 text-xs bg-gray-50 rounded text-center">
                    {emoji ? `${emoji.emoji} ${emoji.label}` : 'Select an emoji'}
                  </div>
                )}
              </EmojiPicker.ActiveEmoji>

              <EmojiPicker.Viewport
                className="px-2 pb-2 outline-none overflow-y-auto"
                style={{ maxHeight: '240px' }}
              >
                <EmojiPicker.List
                  className="space-y-0.5"
                  components={{
                    CategoryHeader: ({ category, ...props }) => (
                      <div
                        className="sticky top-0 bg-white text-xs font-semibold text-gray-500 px-2 py-1.5 border-b border-gray-100 -mx-2 px-2 mb-1 z-10"
                        {...props}
                      >
                        {category.label}
                      </div>
                    ),
                    Row: ({ children, ...props }) => (
                      <div className="grid grid-cols-8 gap-0.5" {...props}>
                        {children}
                      </div>
                    ),
                    Emoji: ({ emoji, ...props }) => (
                      <button
                        type="button"
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-colors"
                        title={emoji.label}
                        {...props}
                      >
                        {emoji.emoji}
                      </button>
                    ),
                  }}
                />
              </EmojiPicker.Viewport>
            </EmojiPicker.Root>
          </div>
        </div>
      )}
    </div>
  );
}

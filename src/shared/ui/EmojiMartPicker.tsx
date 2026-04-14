'use client';

import { useState } from 'react';
import Picker from '@emoji-mart/react';
import { useLocalStorage } from 'usehooks-ts';

export type EmojiMartSkinTone = 1 | 2 | 3 | 4 | 5 | 6;

export interface EmojiMartPickerProps {
  onEmojiSelect: (emoji: string) => void;
  skinTone?: EmojiMartSkinTone;
  onSkinToneChange?: (skinTone: EmojiMartSkinTone) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 238,
  md: 320,
  lg: 380,
};

interface PickerData {
  id?: string;
  native?: string;
  [key: string]: unknown;
}

export function EmojiMartPicker({
  onEmojiSelect,
  skinTone = 1,
  onSkinToneChange,
  className = '',
  size = 'md',
}: EmojiMartPickerProps) {
  const [selectedSkinTone, setSelectedSkinTone] = useLocalStorage<EmojiMartSkinTone>(
    'emojiMartSkinTone',
    skinTone
  );

  const handleSkinToneChange = (tone: EmojiMartSkinTone) => {
    setSelectedSkinTone(tone);
    onSkinToneChange?.(tone);
  };

  const handleEmojiSelect = (data: PickerData) => {
    const emoji = data.native || data.id || '';
    onEmojiSelect(emoji);
  };

  return (
    <div className={className}>
      <Picker
        data="/emoji-mart/data/twitter.json"
        onEmojiSelect={handleEmojiSelect}
        skin={selectedSkinTone}
        onSkinChange={handleSkinToneChange}
        perLine={8}
        emojiSize={sizeMap[size] > 280 ? 38 : 28}
        emojiButtonSize={sizeMap[size] > 280 ? 44 : 36}
        set="twitter"
        previewPosition="none"
        skinTonePosition="search"
        maxFrequentRows={2}
      />
    </div>
  );
}

interface EmojiMartPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiMartPickerButton({ onEmojiSelect, className }: EmojiMartPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
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
          <EmojiMartPicker
            onEmojiSelect={emoji => {
              onEmojiSelect(emoji);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default EmojiMartPicker;

'use client';

import { useState } from 'react';
import { FrimoussePickerButton } from '@/components/ui/FrimoussePicker';

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPickerButton({ onEmojiSelect }: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FrimoussePickerButton
      onEmojiSelect={emoji => {
        onEmojiSelect(emoji);
        setIsOpen(false);
      }}
    />
  );
}

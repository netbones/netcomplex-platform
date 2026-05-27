'use client';

import type { ReactNode } from 'react';

interface ModalOverlayProps {
  children: ReactNode;
  onClose: () => void;
}

export function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

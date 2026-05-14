'use client';

import { create } from 'zustand';
import { ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type'], allowDuplicate?: boolean) => void;
  removeToast: (id: string) => void;
}

// SSR-compatible Zustand store for toast management
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (message: string, type: Toast['type'] = 'success', allowDuplicate = false) => {
    const state = get();

    // Prevent duplicate toasts with the same message and type (unless explicitly allowed)
    if (!allowDuplicate) {
      const existingToast = state.toasts.find(
        toast => toast.message === message && toast.type === type
      );
      if (existingToast) {
        return; // Don't add duplicate toast
      }
    }

    const id = Date.now().toString();
    const toast: Toast = { id, message, type };

    set(state => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    }));
  },
}));

export function useToast() {
  const showToast = useToastStore(state => state.showToast);
  return { showToast };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useToastStore(state => state.toasts);

  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const typeIcons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
  };

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${typeStyles[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up`}
          >
            <i className={`fas ${typeIcons[toast.type]}`}></i>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { CircleDot, CheckSquare, TextCursorInput, Star, ToggleLeft, BarChart3 } from 'lucide-react';
import type { QuestionType, QuestionTypeMeta } from './survey-types';
import { QUESTION_TYPE_META } from './survey-types';

interface BlockPaletteProps {
  onSelect: (type: QuestionType) => void;
  /** When true, renders an inline button + popover (used inside sections). */
  compact?: boolean;
}

const ICON_MAP = {
  CircleDot,
  CheckSquare,
  TextCursorInput,
  Star,
  ToggleLeft,
  BarChart3,
} as const;

export function BlockPalette({ onSelect, compact = false }: BlockPaletteProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const handleSelect = (type: QuestionType) => {
    onSelect(type);
    setOpen(false);
  };

  return (
    <div ref={ref} className={compact ? 'relative inline-block' : 'fixed bottom-8 right-8 z-30'}>
      {open && (
        <div
          className={
            compact
              ? 'absolute left-0 bottom-12 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-20'
              : 'absolute right-0 bottom-16 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-20'
          }
        >
          <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Add question</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-0.5"
              aria-label="Close palette"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {QUESTION_TYPE_META.map(meta => (
              <PaletteOption key={meta.type} meta={meta} onClick={() => handleSelect(meta.type)} />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={
          compact
            ? 'w-full text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-dashed border-indigo-300 rounded-lg py-2 px-3 flex items-center justify-center gap-2'
            : 'w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center justify-center transition-transform hover:scale-105'
        }
        aria-label={open ? 'Close question type palette' : 'Add question'}
        title={open ? 'Close' : 'Add question'}
      >
        {compact ? (
          <>
            <Plus size={16} /> Add question
          </>
        ) : (
          <Plus size={28} />
        )}
      </button>
    </div>
  );
}

function PaletteOption({ meta, onClick }: { meta: QuestionTypeMeta; onClick: () => void }) {
  const Icon = ICON_MAP[meta.icon as keyof typeof ICON_MAP] ?? CircleDot;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-50 transition-colors"
    >
      <span className={`mt-0.5 ${meta.badgeClass} rounded p-1`}>
        <Icon size={16} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900">{meta.label}</span>
        <span className="block text-xs text-gray-500">{meta.description}</span>
      </span>
    </button>
  );
}

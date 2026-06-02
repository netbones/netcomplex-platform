'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface OptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
  /** Placeholder shown in the new option input. */
  placeholder?: string;
  /** Add option button label. */
  addLabel?: string;
}

export function OptionsEditor({
  options,
  onChange,
  placeholder = 'Option text',
  addLabel = 'Add option',
}: OptionsEditorProps) {
  const [draft, setDraft] = useState('');

  const updateAt = (index: number, value: string) => {
    const next = options.slice();
    next[index] = value;
    onChange(next);
  };

  const removeAt = (index: number) => {
    if (options.length <= 1) return; // keep at least one option
    onChange(options.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= options.length) return;
    const next = options.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const commitDraft = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...options, v]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      {options.map((option, idx) => (
        <div key={idx} className="flex items-center gap-2 group">
          <span className="text-gray-300">
            <GripVertical size={14} />
          </span>
          <input
            type="text"
            value={option}
            onChange={e => updateAt(idx, e.target.value)}
            onBlur={() => {
              if (!option.trim()) {
                removeAt(idx);
              }
            }}
            placeholder={placeholder}
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button
            type="button"
            onClick={() => move(idx, idx - 1)}
            disabled={idx === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => move(idx, idx + 1)}
            disabled={idx === options.length - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => removeAt(idx)}
            disabled={options.length <= 1}
            className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30"
            aria-label="Remove option"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitDraft();
            }
          }}
          placeholder={placeholder}
          className="flex-1 text-sm border border-dashed border-gray-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        <button
          type="button"
          onClick={commitDraft}
          disabled={!draft.trim()}
          className="px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus size={12} /> {addLabel}
        </button>
      </div>
    </div>
  );
}

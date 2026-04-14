'use client';

import { useState, useEffect, useRef } from 'react';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('TagInput');

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add tags...',
  maxTags = 10,
  className = '',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load user's previous tags for suggestions
  useEffect(() => {
    const loadUserTags = async () => {
      try {
        // Get user's previous tags from their content
        const response = await fetch('/api/user/tags');
        if (response.ok) {
          const data = await response.json();
          // Filter out tags already used in current content
          const availableSuggestions = data.tags.filter((tag: string) => !tags.includes(tag));
          setSuggestions(availableSuggestions);
        }
      } catch (error) {
        log.error({}, 'Failed to load tag suggestions', error);
      }
    };

    loadUserTags();
  }, [tags]);

  const addTag = (tagName: string) => {
    const trimmedTag = tagName.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(value.length > 0);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags[tags.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    suggestion =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(suggestion)
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-indigo-200 rounded-full p-0.5"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </span>
        ))}

        {tags.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm placeholder-gray-400"
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.slice(0, 5).map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addTag(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                  >
                    #{suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {tags.length}/{maxTags} tags
        </span>
        <span>Press Enter to add, Backspace to remove</span>
      </div>
    </div>
  );
}

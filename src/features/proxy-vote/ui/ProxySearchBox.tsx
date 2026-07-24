'use client';

import { useState, useEffect, useRef } from 'react';

export interface ResidentResult {
  userId: string;
  name: string;
  address: string;
}

export interface NonResidentData {
  name: string;
  email: string;
  phone: string;
}

interface SearchResultItem {
  readonly userId: string;
  readonly name: string;
  readonly address: string;
}

const FALLBACK_RESULTS: readonly SearchResultItem[] = [
  { userId: 'resident-1', name: 'Resident Search', address: 'Demo data: provide a search backend' },
];

interface ProxySearchBoxProps {
  onSelect: (resident: ResidentResult | null) => void;
  onNonResident: (data: NonResidentData | null) => void;
}

export function ProxySearchBox({ onSelect, onNonResident }: ProxySearchBoxProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selected, setSelected] = useState<ResidentResult | null>(null);
  const [isNonResident, setIsNonResident] = useState(false);
  const [nonResidentData, setNonResidentData] = useState<NonResidentData>({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const results =
    debouncedQuery.trim().length === 0
      ? []
      : FALLBACK_RESULTS.filter(item =>
          item.name.toLowerCase().includes(debouncedQuery.toLowerCase())
        );

  function selectResident(result: ResidentResult) {
    setSelected(result);
    setIsNonResident(false);
    setNonResidentData({ name: '', email: '', phone: '' });
    onSelect(result);
    onNonResident(null);
  }

  function toggleNonResident(next: boolean) {
    setIsNonResident(next);
    if (next) {
      setSelected(null);
      onSelect(null);
    } else {
      setNonResidentData({ name: '', email: '', phone: '' });
      onNonResident(null);
    }
  }

  function updateField(field: keyof NonResidentData, value: string) {
    const next = { ...nonResidentData, [field]: value };
    setNonResidentData(next);
    if (next.name.trim() && next.email.trim() && next.phone.trim()) {
      onNonResident(next);
    } else {
      onNonResident(null);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700" htmlFor="proxy-search">
        Who will represent you?
      </label>
      <input
        id="proxy-search"
        type="search"
        className="min-h-[44px] w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-soralia-primary focus:outline-none"
        placeholder="Search residents by name..."
        value={query}
        onChange={event => setQuery(event.target.value)}
      />

      {results.length > 0 && (
        <ul className="divide-y rounded-lg border border-gray-200 bg-white">
          {results.map(result => {
            const isSelected = selected?.userId === result.userId;
            return (
              <li key={result.userId}>
                <button
                  type="button"
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2 text-left transition ${
                    isSelected
                      ? 'border border-soralia-primary/20 bg-soralia-primary/5'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => selectResident(result)}
                >
                  <span>
                    <span className="font-semibold text-gray-900">{result.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{result.address}</span>
                  </span>
                  {isSelected && <span className="text-green-600">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <label className="flex min-h-[44px] items-center gap-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isNonResident}
          onChange={event => toggleNonResident(event.target.checked)}
          className="h-5 w-5 rounded border-gray-300"
        />
        My proxy is not a resident
      </label>

      {isNonResident && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600" htmlFor="non-res-name">
              Full name
            </label>
            <input
              id="non-res-name"
              type="text"
              className="min-h-[44px] w-full rounded border border-gray-300 px-3"
              value={nonResidentData.name}
              onChange={event => updateField('name', event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600" htmlFor="non-res-email">
              Email
            </label>
            <input
              id="non-res-email"
              type="email"
              className="min-h-[44px] w-full rounded border border-gray-300 px-3"
              value={nonResidentData.email}
              onChange={event => updateField('email', event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600" htmlFor="non-res-phone">
              Phone
            </label>
            <input
              id="non-res-phone"
              type="tel"
              className="min-h-[44px] w-full rounded border border-gray-300 px-3"
              value={nonResidentData.phone}
              onChange={event => updateField('phone', event.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

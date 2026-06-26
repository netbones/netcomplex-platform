'use client';

import { AlertTriangle } from 'lucide-react';

interface SelfResolutionChecklistProps {
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
}

const CHECKLIST_ITEMS = [
  {
    id: 'spoke_directly',
    label: 'I have spoken to the other party directly',
  },
  {
    id: 'checked_rules',
    label: 'I have checked the community rules',
  },
  {
    id: 'gave_time',
    label: 'I have given reasonable time for resolution',
  },
  {
    id: 'need_help',
    label: 'I believe third-party help is needed',
  },
] as const;

export function SelfResolutionChecklist({ checked, onToggle }: SelfResolutionChecklistProps) {
  const checkedCount = CHECKLIST_ITEMS.filter(item => checked[item.id]).length;
  const showTip = checkedCount < 2;
  const allChecked = checkedCount === CHECKLIST_ITEMS.length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Before You File</h3>
        <p className="text-sm text-gray-500 mt-1">
          Have you tried to resolve this yourself? Check all that apply.
        </p>
      </div>

      <div className="space-y-3">
        {CHECKLIST_ITEMS.map(({ id, label }) => (
          <label
            key={id}
            className="flex items-center gap-3 h-11 px-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={checked[id] ?? false}
              onChange={() => onToggle(id)}
              className="h-5 w-5 rounded border-gray-300 text-soralia-primary focus:ring-soralia-primary accent-soralia-primary"
            />
            <span
              className={`text-sm ${checked[id] ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
            >
              {label}
            </span>
          </label>
        ))}
      </div>

      {showTip && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Consider resolving directly</p>
              <p className="text-sm text-amber-700 mt-1">
                Consider speaking directly with the other party first — many disputes are resolved
                through conversation.
              </p>
            </div>
          </div>
        </div>
      )}

      {allChecked && (
        <div className="flex items-center gap-2 text-sm text-soralia-primary">
          <span className="text-green-500">&#10003;</span>
          <span>Thank you for going through these steps. You&apos;re ready to proceed.</span>
        </div>
      )}
    </div>
  );
}

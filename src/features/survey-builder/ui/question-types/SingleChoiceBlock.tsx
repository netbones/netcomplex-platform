'use client';

import { Circle, ChevronDown } from 'lucide-react';
import type { SurveyQuestion } from '@entities/survey';
import type { QuestionBlockPreviewProps, QuestionBlockConfigProps } from '../QuestionBlock';
import { OptionsEditor } from '../OptionsEditor';

function getConfig(question: SurveyQuestion): { displayAs: 'radio' | 'dropdown' } {
  const config = (question.config ?? {}) as { displayAs?: 'radio' | 'dropdown' };
  return { displayAs: config.displayAs ?? 'radio' };
}

function Preview({ question }: QuestionBlockPreviewProps) {
  const { displayAs } = getConfig(question);
  const options = question.options.length > 0 ? question.options : ['Option 1'];

  if (displayAs === 'dropdown') {
    return (
      <div className="text-sm text-gray-500">
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-400 max-w-xs">
          <span>Choose an option</span>
          <ChevronDown size={14} className="ml-auto" />
        </div>
        <ul className="mt-2 space-y-1 text-xs text-gray-500 max-w-xs">
          {options.map(o => (
            <li key={o} className="px-3 py-1">
              {o}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.map(option => (
        <label
          key={option}
          className="flex items-center gap-2 text-sm text-gray-600 cursor-not-allowed"
        >
          <Circle size={16} className="text-gray-400" />
          {option}
        </label>
      ))}
    </div>
  );
}

function ConfigPanel({ question, onUpdate }: QuestionBlockConfigProps) {
  const { displayAs } = getConfig(question);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Display as</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ config: { ...getConfig(question), displayAs: 'radio' } })}
            className={`px-3 py-1.5 text-sm rounded border ${
              displayAs === 'radio'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Radio buttons
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ config: { ...getConfig(question), displayAs: 'dropdown' } })}
            className={`px-3 py-1.5 text-sm rounded border ${
              displayAs === 'dropdown'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Dropdown
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Options</label>
        <OptionsEditor options={question.options} onChange={options => onUpdate({ options })} />
      </div>
    </div>
  );
}

export const SingleChoiceBlock = { Preview, ConfigPanel };

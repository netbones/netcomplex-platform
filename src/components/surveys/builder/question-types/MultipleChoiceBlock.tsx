'use client';

import { Square } from 'lucide-react';
import type { QuestionBlockPreviewProps, QuestionBlockConfigProps } from '../QuestionBlock';
import { OptionsEditor } from '../OptionsEditor';

function Preview({ question }: QuestionBlockPreviewProps) {
  const options = question.options.length > 0 ? question.options : ['Option 1'];

  return (
    <div className="space-y-2">
      {options.map(option => (
        <label
          key={option}
          className="flex items-center gap-2 text-sm text-gray-600 cursor-not-allowed"
        >
          <Square size={16} className="text-gray-400" />
          {option}
        </label>
      ))}
    </div>
  );
}

function ConfigPanel({ question, onUpdate }: QuestionBlockConfigProps) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Options</label>
      <OptionsEditor options={question.options} onChange={options => onUpdate({ options })} />
    </div>
  );
}

export const MultipleChoiceBlock = { Preview, ConfigPanel };

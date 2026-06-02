'use client';

import { useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import type { SurveyQuestion, QuestionType } from './survey-types';
import { getTypeMeta } from './survey-types';
import { SingleChoiceBlock } from './question-types/SingleChoiceBlock';
import { MultipleChoiceBlock } from './question-types/MultipleChoiceBlock';
import { TextBlock } from './question-types/TextBlock';
import { RatingBlock } from './question-types/RatingBlock';
import { YesNoBlock } from './question-types/YesNoBlock';
import { LinearScaleBlock } from './question-types/LinearScaleBlock';

export interface QuestionBlockPreviewProps {
  question: SurveyQuestion;
}

export interface QuestionBlockConfigProps {
  question: SurveyQuestion;
  onUpdate: (changes: Partial<SurveyQuestion>) => void;
}

interface QuestionBlockProps {
  question: SurveyQuestion;
  onUpdate: (changes: Partial<SurveyQuestion>) => void;
  onDelete: () => void;
}

const PREVIEW_MAP: Record<QuestionType, React.ComponentType<QuestionBlockPreviewProps>> = {
  SINGLE_CHOICE: SingleChoiceBlock.Preview,
  MULTIPLE_CHOICE: MultipleChoiceBlock.Preview,
  TEXT: TextBlock.Preview,
  RATING: RatingBlock.Preview,
  YES_NO: YesNoBlock.Preview,
  LINEAR_SCALE: LinearScaleBlock.Preview,
};

const CONFIG_MAP: Record<QuestionType, React.ComponentType<QuestionBlockConfigProps>> = {
  SINGLE_CHOICE: SingleChoiceBlock.ConfigPanel,
  MULTIPLE_CHOICE: MultipleChoiceBlock.ConfigPanel,
  TEXT: TextBlock.ConfigPanel,
  RATING: RatingBlock.ConfigPanel,
  YES_NO: YesNoBlock.ConfigPanel,
  LINEAR_SCALE: LinearScaleBlock.ConfigPanel,
};

export function QuestionBlock({ question, onUpdate, onDelete }: QuestionBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [textDraft, setTextDraft] = useState(question.text);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const meta = getTypeMeta(question.type);
  const Preview = PREVIEW_MAP[question.type];
  const ConfigPanel = CONFIG_MAP[question.type];

  const isTempId = question.id.startsWith('temp-');

  const commitText = () => {
    if (textDraft !== question.text) {
      onUpdate({ text: textDraft });
    }
  };

  const handleDelete = () => {
    if (confirmingDelete) {
      onDelete();
      setConfirmingDelete(false);
    } else {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 3000);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-start gap-3">
        <button
          type="button"
          className="mt-1 text-gray-400 cursor-grab"
          aria-label="Drag to reorder"
          disabled
          title="Drag handle (wired in Plan 04)"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={textDraft}
            onChange={e => setTextDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            placeholder="Question text"
            className="w-full text-base font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none px-1"
            disabled={isTempId}
          />
        </div>

        <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${meta.badgeClass}`}>
          {meta.label}
        </span>

        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <span>Required</span>
          <input
            type="checkbox"
            checked={question.required}
            onChange={e => onUpdate({ required: e.target.checked })}
            disabled={isTempId}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>

        <button
          type="button"
          onClick={handleDelete}
          className={`p-1 rounded transition-colors ${
            confirmingDelete
              ? 'bg-red-100 text-red-700'
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          }`}
          title={confirmingDelete ? 'Click again to confirm' : 'Delete question'}
          disabled={isTempId}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="px-4 py-4 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <Preview question={question} />
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
          <ConfigPanel question={question} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

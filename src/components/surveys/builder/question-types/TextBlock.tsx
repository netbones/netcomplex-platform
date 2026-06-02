'use client';

import type { SurveyQuestion } from '../survey-types';
import type { QuestionBlockPreviewProps, QuestionBlockConfigProps } from '../QuestionBlock';

function getConfig(question: SurveyQuestion): { isParagraph: boolean; charLimit: number } {
  const config = (question.config ?? {}) as { isParagraph?: boolean; charLimit?: number };
  return {
    isParagraph: config.isParagraph ?? false,
    charLimit: config.charLimit ?? 200,
  };
}

function Preview({ question }: QuestionBlockPreviewProps) {
  const { isParagraph, charLimit } = getConfig(question);

  if (isParagraph) {
    return (
      <div>
        <textarea
          disabled
          rows={4}
          maxLength={charLimit}
          placeholder="Long answer text"
          className="w-full max-w-md text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-400 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">Up to {charLimit} characters</p>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        disabled
        maxLength={charLimit}
        placeholder="Short answer"
        className="w-full max-w-md text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-400"
      />
      <p className="text-xs text-gray-400 mt-1">Up to {charLimit} characters</p>
    </div>
  );
}

function ConfigPanel({ question, onUpdate }: QuestionBlockConfigProps) {
  const { isParagraph, charLimit } = getConfig(question);

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={isParagraph}
          onChange={e =>
            onUpdate({ config: { ...getConfig(question), isParagraph: e.target.checked } })
          }
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        Multi-line (paragraph)
      </label>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1.5 block">
          Character limit: {charLimit}
        </label>
        <input
          type="range"
          min={20}
          max={2000}
          step={10}
          value={charLimit}
          onChange={e =>
            onUpdate({
              config: { ...getConfig(question), charLimit: Number(e.target.value) },
            })
          }
          className="w-full max-w-md accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-400 max-w-md">
          <span>20</span>
          <span>2000</span>
        </div>
      </div>
    </div>
  );
}

export const TextBlock = { Preview, ConfigPanel };

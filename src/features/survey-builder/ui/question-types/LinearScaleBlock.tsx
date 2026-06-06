'use client';

import type { SurveyQuestion } from '@entities/survey';
import type { QuestionBlockPreviewProps, QuestionBlockConfigProps } from '../QuestionBlock';

interface LinearScaleConfig {
  minValue: number;
  maxValue: number;
  minLabel: string;
  maxLabel: string;
}

function getConfig(question: SurveyQuestion): LinearScaleConfig {
  const config = (question.config ?? {}) as Partial<LinearScaleConfig>;
  return {
    minValue: config.minValue ?? 1,
    maxValue: config.maxValue ?? 5,
    minLabel: config.minLabel ?? '',
    maxLabel: config.maxLabel ?? '',
  };
}

function Preview({ question }: QuestionBlockPreviewProps) {
  const { minValue, maxValue, minLabel, maxLabel } = getConfig(question);
  const min = Math.min(minValue, maxValue);
  const max = Math.max(minValue, maxValue);
  const range: number[] = [];
  for (let i = min; i <= max; i++) range.push(i);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {range.map(n => (
          <span
            key={n}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-600"
          >
            {n}
          </span>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 max-w-md">
        <span>{minLabel || '—'}</span>
        <span>{maxLabel || '—'}</span>
      </div>
    </div>
  );
}

function ConfigPanel({ question, onUpdate }: QuestionBlockConfigProps) {
  const { minValue, maxValue, minLabel, maxLabel } = getConfig(question);

  const update = (changes: Partial<LinearScaleConfig>) => {
    onUpdate({ config: { ...getConfig(question), ...changes } });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Min</label>
          <input
            type="number"
            min={1}
            max={10}
            value={minValue}
            onChange={e => {
              const v = Math.min(10, Math.max(1, Number(e.target.value) || 1));
              update({ minValue: v });
              if (v >= maxValue) update({ maxValue: Math.min(10, v + 1) });
            }}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Max</label>
          <input
            type="number"
            min={1}
            max={10}
            value={maxValue}
            onChange={e => {
              const v = Math.min(10, Math.max(1, Number(e.target.value) || 1));
              update({ maxValue: v });
              if (v <= minValue) update({ minValue: Math.max(1, v - 1) });
            }}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Min label</label>
          <input
            type="text"
            value={minLabel}
            onChange={e => update({ minLabel: e.target.value })}
            placeholder="e.g. Strongly disagree"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Max label</label>
          <input
            type="text"
            value={maxLabel}
            onChange={e => update({ maxLabel: e.target.value })}
            placeholder="e.g. Strongly agree"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export const LinearScaleBlock = { Preview, ConfigPanel };

'use client';

import { Star } from 'lucide-react';
import type { SurveyQuestion } from '@entities/survey';
import type { QuestionBlockPreviewProps, QuestionBlockConfigProps } from '../QuestionBlock';

function getMaxStars(question: SurveyQuestion): number {
  const config = (question.config ?? {}) as { maxStars?: number };
  return config.maxStars ?? 5;
}

function Preview({ question }: QuestionBlockPreviewProps) {
  const max = Math.min(Math.max(getMaxStars(question), 1), 10);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={22} className="text-gray-300" fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  );
}

function ConfigPanel({ question, onUpdate }: QuestionBlockConfigProps) {
  const max = getMaxStars(question);
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1.5 block">
        Number of stars: {max}
      </label>
      <input
        type="number"
        min={1}
        max={10}
        value={max}
        onChange={e => {
          const n = Math.min(10, Math.max(1, Number(e.target.value) || 1));
          onUpdate({ config: { ...(question.config ?? {}), maxStars: n } });
        }}
        className="w-24 text-sm border border-gray-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      />
      <div className="flex items-center gap-1 mt-3">
        {Array.from({ length: max }).map((_, i) => (
          <Star key={i} size={20} className="text-yellow-400" fill="currentColor" strokeWidth={0} />
        ))}
      </div>
    </div>
  );
}

export const RatingBlock = { Preview, ConfigPanel };

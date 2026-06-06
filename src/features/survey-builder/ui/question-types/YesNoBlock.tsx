'use client';

import { Circle } from 'lucide-react';
import type { QuestionBlockPreviewProps, QuestionBlockConfigProps } from '../QuestionBlock';

function Preview(_props: QuestionBlockPreviewProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-not-allowed">
        <Circle size={16} className="text-gray-400" /> Yes
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-not-allowed">
        <Circle size={16} className="text-gray-400" /> No
      </label>
    </div>
  );
}

function ConfigPanel(_props: QuestionBlockConfigProps) {
  return <p className="text-sm text-gray-500 italic">Yes / No question — no additional settings</p>;
}

export const YesNoBlock = { Preview, ConfigPanel };

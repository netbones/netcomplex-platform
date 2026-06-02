'use client';

import type { SurveyQuestion } from './survey-types';

interface QuestionConfigPanelProps {
  question: SurveyQuestion;
  onUpdate: (changes: Partial<SurveyQuestion>) => void;
}

/**
 * Generic config panel that delegates to the type-specific ConfigPanel
 * exposed by each question-type module (added in Task 2).
 *
 * Returns null when the type-specific config UI lives inside QuestionBlock
 * itself (the current pattern). Kept as the planned extension point if a
 * question needs panel-only fields outside its type-specific block
 * (e.g. cross-cutting rules or admin-only options).
 */
export function QuestionConfigPanel(_props: QuestionConfigPanelProps) {
  return null;
}

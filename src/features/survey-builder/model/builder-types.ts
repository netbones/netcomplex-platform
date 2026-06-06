/**
 * Shared types for the survey builder UI.
 *
 * These mirror the API response shapes from
 * /api/surveys/[id], /api/surveys/[id]/questions,
 * /api/surveys/[id]/sections.
 *
 * The type aliases (BuilderQuestion, BuilderSection) are convenience
 * re-exports — the canonical sources live in `survey-types.ts`.
 */

import type { QuestionType, SurveyQuestion, SurveySection } from '@entities/survey';

export type { QuestionType, SurveyQuestion, SurveySection };
export type BuilderQuestion = SurveyQuestion;
export type BuilderSection = SurveySection;

/**
 * A flat list of questions and sections in a single sortable context.
 *
 * Used by the drag-and-drop layer to detect which droppable the user
 * is hovering over. Discriminated union keeps the data model honest:
 * a section has no parent `sectionId`, only questions do.
 */
export type SortableItem =
  | { kind: 'section'; section: BuilderSection }
  | { kind: 'question'; question: BuilderQuestion };

/**
 * Item shape for POST /api/surveys/:id/questions/reorder.
 *
 * Re-uses the same field names the API expects so the editor can
 * forward the array straight through.
 */
export interface QuestionReorderItem {
  id: string;
  order: number;
  sectionId?: string | null;
}

/**
 * Item shape for POST /api/surveys/:id/sections/reorder.
 */
export interface SectionReorderItem {
  id: string;
  order: number;
}

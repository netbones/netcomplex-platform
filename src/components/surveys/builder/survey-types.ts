/**
 * Shared types for the survey builder UI.
 *
 * These mirror the API response shapes from
 * /api/surveys/[id], /api/surveys/[id]/questions,
 * /api/surveys/[id]/sections.
 */

export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TEXT'
  | 'RATING'
  | 'YES_NO'
  | 'LINEAR_SCALE';

export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export interface SurveyQuestion {
  id: string;
  tenantId: string;
  surveyId: string;
  sectionId: string | null;
  text: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  order: number;
  config: Record<string, unknown> | null;
}

export interface SurveySection {
  id: string;
  tenantId: string;
  surveyId: string;
  title: string | null;
  description: string | null;
  image: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Survey {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  type: string;
  status: SurveyStatus;
  startDate: string | null;
  endDate: string | null;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyDetailResponse {
  survey: Survey;
  questions: SurveyQuestion[];
  sections: SurveySection[];
}

/**
 * Type-specific config defaults.
 *
 * Each question type may use a subset of these keys in its `config` JSONB column.
 * - SINGLE_CHOICE: displayAs = "radio" | "dropdown"
 * - TEXT: charLimit?: number, isParagraph?: boolean
 * - RATING: maxStars?: number
 * - LINEAR_SCALE: minValue?: number, maxValue?: number, minLabel?: string, maxLabel?: string
 */
export interface QuestionTypeConfig {
  displayAs?: 'radio' | 'dropdown';
  charLimit?: number;
  isParagraph?: boolean;
  maxStars?: number;
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  description: string;
  /** A lucide-react icon name (string) for the palette button. */
  icon: string;
  /** Tailwind pill colors for the type badge. */
  badgeClass: string;
}

export const QUESTION_TYPE_META: QuestionTypeMeta[] = [
  {
    type: 'SINGLE_CHOICE',
    label: 'Multiple Choice',
    description: 'Pick one option from a list',
    icon: 'CircleDot',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  {
    type: 'MULTIPLE_CHOICE',
    label: 'Checkbox',
    description: 'Pick any number of options',
    icon: 'CheckSquare',
    badgeClass: 'bg-purple-100 text-purple-800',
  },
  {
    type: 'TEXT',
    label: 'Short Answer / Paragraph',
    description: 'Open text response',
    icon: 'TextCursorInput',
    badgeClass: 'bg-gray-100 text-gray-800',
  },
  {
    type: 'RATING',
    label: 'Rating',
    description: 'Star rating scale',
    icon: 'Star',
    badgeClass: 'bg-yellow-100 text-yellow-800',
  },
  {
    type: 'YES_NO',
    label: 'Yes / No',
    description: 'Binary choice',
    icon: 'ToggleLeft',
    badgeClass: 'bg-green-100 text-green-800',
  },
  {
    type: 'LINEAR_SCALE',
    label: 'Linear Scale',
    description: 'Numbered scale with min/max labels',
    icon: 'BarChart3',
    badgeClass: 'bg-orange-100 text-orange-800',
  },
];

export function getTypeMeta(type: QuestionType): QuestionTypeMeta {
  return QUESTION_TYPE_META.find(m => m.type === type) ?? QUESTION_TYPE_META[0];
}

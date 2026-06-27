import { router } from '@api/server';
import { surveyManagementProcedures } from './surveys/survey-management';
import { surveyQuestionProcedures } from './surveys/survey-questions';
import { surveySectionProcedures } from './surveys/survey-sections';

export const surveysRouter = router({
  ...surveyManagementProcedures,
  ...surveyQuestionProcedures,
  ...surveySectionProcedures,
});

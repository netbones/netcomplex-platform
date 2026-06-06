import { use } from 'react';
import { SurveyEditorPage } from '@pages/admin';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SurveyEditorPage surveyId={id} />;
}

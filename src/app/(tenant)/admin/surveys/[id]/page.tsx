import { SurveyResultsPage } from '@pages/admin';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SurveyResultsPage params={params} />;
}

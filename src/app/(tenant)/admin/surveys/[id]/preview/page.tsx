import { SurveyPreviewPage } from '@pages/admin';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SurveyPreviewPage params={params} />;
}

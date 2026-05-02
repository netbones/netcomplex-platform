import { ContentForm } from '@/widgets/admin/ui/ContentForm';

export default function NewContentPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Content</h1>
      <ContentForm />
    </div>
  );
}

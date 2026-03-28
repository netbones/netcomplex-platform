import { GroupForm } from '@/components/admin/GroupForm';

export default function NewGroupPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Interest Group</h1>
      <GroupForm />
    </div>
  );
}

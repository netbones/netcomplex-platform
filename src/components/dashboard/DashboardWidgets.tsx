'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { getUserContent } from '@/lib/data-fetching';

export function DashboardWidgets() {
  const { data: session } = authClient.useSession();
  const [content, setContent] = useState([]);

  useEffect(() => {
    if (session?.user?.id) {
      getUserContent(session.user.id).then(setContent);
    }
  }, [session?.user?.id]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Recent Content Widget */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Recent Content</h3>
        {content.length > 0 ? (
          <div className="space-y-3">
            {content.slice(0, 3).map((item: any) => (
              <div key={item.id} className="border-l-4 border-indigo-500 pl-4">
                <h4 className="font-medium text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-600 truncate">{item.excerpt}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No content yet. Start sharing!</p>
        )}
      </div>

      {/* Community Activity Widget */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
            <span className="text-sm text-gray-600">New conservation article published</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
            <span className="text-sm text-gray-600">Facility booking confirmed</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
            <span className="text-sm text-gray-600">New resident joined</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Widget */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
            Submit Maintenance Request
          </button>
          <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
            Book a Facility
          </button>
          <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
            Start a Conversation
          </button>
          <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
            Create Content
          </button>
        </div>
      </div>
    </div>
  );
}

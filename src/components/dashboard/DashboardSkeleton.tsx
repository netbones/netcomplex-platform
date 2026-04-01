export function DashboardSkeleton() {
  return {
    StatCard: () => (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div className="ml-4 flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    ),

    WidgetGrid: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ),
  };
}

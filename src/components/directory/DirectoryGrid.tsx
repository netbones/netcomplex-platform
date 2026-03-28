import Link from 'next/link';

interface Resident {
  id: string;
  name: string;
  email: string;
  street: string | null;
  unit: string | null;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  isPublic: boolean;
}

interface DirectoryGridProps {
  residents: Resident[];
  viewMode?: 'grid' | 'list';
}

export function DirectoryGrid({ residents, viewMode = 'grid' }: DirectoryGridProps) {
  if (residents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No residents found matching your criteria.</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {residents.map(resident => (
          <div
            key={resident.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex items-center"
          >
            <div className="flex items-center space-x-4 w-1/3">
              {resident.avatar ? (
                <img
                  src={resident.avatar}
                  alt={resident.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-soralia-primary flex items-center justify-center text-white text-lg font-bold">
                  {resident.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{resident.name}</h3>
                {resident.street && (
                  <p className="text-sm text-gray-600">
                    {resident.street}
                    {resident.unit && `, ${resident.unit}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex-1 flex justify-between items-center border-l pl-4">
              <div>
                {resident.isPublic && (
                  <div>
                    {resident.phone && <p className="text-sm text-gray-600">{resident.phone}</p>}
                    <p className="text-sm text-gray-600">{resident.email}</p>
                  </div>
                )}
              </div>
              {resident.interests && resident.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {resident.interests.map(interest => (
                    <span
                      key={interest}
                      className="text-xs bg-soralia-light text-soralia-dark px-2 py-1 rounded"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {residents.map(resident => (
        <div
          key={resident.id}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-4">
            {resident.avatar ? (
              <img
                src={resident.avatar}
                alt={resident.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-soralia-primary flex items-center justify-center text-white text-lg font-bold">
                {resident.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{resident.name}</h3>
              {resident.street && (
                <p className="text-sm text-gray-600">
                  {resident.street}
                  {resident.unit && `, ${resident.unit}`}
                </p>
              )}
            </div>
          </div>

          {resident.isPublic && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {resident.phone && <p className="text-sm text-gray-600">{resident.phone}</p>}
              <p className="text-sm text-gray-600">{resident.email}</p>
            </div>
          )}

          {resident.interests && resident.interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {resident.interests.map(interest => (
                <span
                  key={interest}
                  className="text-xs bg-soralia-light text-soralia-dark px-2 py-1 rounded"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

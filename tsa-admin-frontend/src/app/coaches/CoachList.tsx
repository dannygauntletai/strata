import React from 'react';

// Define the same Coach type used in the main page
interface Coach {
  coach_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  sport: string | null;
  school_name: string | null;
  school_type: string | null;
  role: string | null;
  status: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

// Define the props for the new component
interface CoachListProps {
  coaches: Coach[];
  selectedCoaches: number[];
  handleSelectAll: () => void;
  handleSelectCoach: (id: number) => void;
  handleDeleteCoach: (id: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

// Move helper functions into this component file
const getDisplayName = (coach: Coach) => {
    if (coach.first_name && coach.last_name) {
      return `${coach.first_name} ${coach.last_name}`;
    }
    return coach.email || 'Unnamed Coach';
};

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
};

const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};


const CoachList: React.FC<CoachListProps> = ({
  coaches,
  selectedCoaches,
  handleSelectAll,
  handleSelectCoach,
  handleDeleteCoach,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div>
      {coaches.length === 0 && (
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-2">
            {searchTerm ? 'No coaches found matching your search' : 'No coaches found'}
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {coaches.length > 0 && (
        <div>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedCoaches.length === coaches.length && coaches.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coach
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Onboarding
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coaches.map((coach) => (
                  <tr key={coach.coach_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCoaches.includes(coach.coach_id)}
                        onChange={() => handleSelectCoach(coach.coach_id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getDisplayName(coach)}
                        </div>
                        <div className="text-sm text-gray-500">{coach.email || 'No email'}</div>
                        {coach.sport && (
                          <div className="text-sm text-gray-500">{coach.sport}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{coach.school_name || 'No school'}</div>
                      {coach.school_type && (
                        <div className="text-sm text-gray-500 capitalize">
                          {coach.school_type.replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">{coach.role ? coach.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(coach.status || 'unknown')}`}>
                        {coach.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {coach.onboarding_completed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDeleteCoach(coach.coach_id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4 p-4">
            {coaches.map((coach) => (
              <div key={coach.coach_id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCoaches.includes(coach.coach_id)}
                      onChange={() => handleSelectCoach(coach.coach_id)}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getDisplayName(coach)}
                      </div>
                      <div className="text-sm text-gray-500">{coach.email || 'No email'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCoach(coach.coach_id)}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500">School</div>
                    <div className="text-sm text-gray-900">{coach.school_name || 'No school'}</div>
                    {coach.school_type && (
                      <div className="text-xs text-gray-500 capitalize">
                        {coach.school_type.replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500">Role</div>
                    <div className="text-sm text-gray-900">
                      {coach.role ? coach.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(coach.status || 'unknown')}`}>
                    {coach.status || 'unknown'}
                  </span>
                  {coach.onboarding_completed ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⏳ Pending
                    </span>
                  )}
                </div>
                
                {(coach.sport || coach.created_at) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500">
                      {coach.sport && <span>Sport: {coach.sport}</span>}
                      {coach.created_at && <span>Joined: {formatDate(coach.created_at)}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachList;

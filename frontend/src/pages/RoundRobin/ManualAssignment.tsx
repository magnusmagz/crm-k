import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { 
  CheckIcon, 
  UserIcon, 
  MapPinIcon, 
  ClockIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface UnassignedContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  state: string;
  createdAt: string;
  contactType: string;
}

interface Officer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  licensedStates: string[];
  active_contacts: number;
  total_assignments: number;
}

const ManualAssignment: React.FC = () => {
  const { user } = useAuth();
  const [unassignedContacts, setUnassignedContacts] = useState<UnassignedContact[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('all');

  // Check if user is admin
  const isAdmin = user?.isAdmin === true;

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactsRes, officersRes] = await Promise.all([
        api.get('/round-robin/unassigned'),
        api.get('/round-robin/officers')
      ]);
      setUnassignedContacts(contactsRes.data);
      setOfficers(officersRes.data);
    } catch (err) {
      setError('Failed to load assignment data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleAssign = async () => {
    if (!selectedOfficer || selectedContacts.size === 0) {
      setError('Please select contacts and an officer');
      return;
    }

    setAssigning(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post('/round-robin/assign', {
        contactIds: Array.from(selectedContacts),
        officerId: selectedOfficer
      });

      setSuccessMessage(response.data.message);
      
      // Clear selections and refresh
      setSelectedContacts(new Set());
      setSelectedOfficer(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  // Filter contacts by state
  const filteredContacts = filterState === 'all' 
    ? unassignedContacts 
    : unassignedContacts.filter(c => c.state === filterState);

  // Get unique states for filter
  const uniqueStates = Array.from(new Set(unassignedContacts.map(c => c.state).filter(Boolean)));

  // Check officer compatibility with selected contacts
  const getOfficerCompatibility = (officer: Officer) => {
    if (selectedContacts.size === 0) return { compatible: true, percentage: 100 };
    
    const selectedContactsList = filteredContacts.filter(c => selectedContacts.has(c.id));
    const states = selectedContactsList.map(c => c.state).filter(Boolean);
    
    if (states.length === 0) return { compatible: true, percentage: 100 };
    
    const compatibleStates = states.filter(state => 
      officer.licensedStates.includes(state)
    );
    
    return {
      compatible: compatibleStates.length === states.length,
      percentage: Math.round((compatibleStates.length / states.length) * 100)
    };
  };

  // Calculate time since creation
  const getTimeSince = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
          <p className="mt-2 text-sm text-gray-500">Only administrators can assign contacts.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manual Contact Assignment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select contacts and assign them to available loan officers based on state licensing
          </p>
        </div>
        <Link
          to="/round-robin"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <p className="ml-3 text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unassigned Contacts */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Unassigned Contacts ({filteredContacts.length})
              </h2>
              <select
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
              >
                <option value="all">All States</option>
                {uniqueStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                  checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                  onChange={handleSelectAll}
                />
                <span className="ml-2 text-sm text-gray-600">Select All</span>
              </label>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No unassigned contacts
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-all duration-150 ${
                      selectedContacts.has(contact.id) ? 'border-l-4 border-primary' : 'border-l-4 border-transparent'
                    }`}
                    onClick={() => handleSelectContact(contact.id)}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                        checked={selectedContacts.has(contact.id)}
                        onChange={() => {}}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {getTimeSince(contact.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                          {contact.source && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              {contact.source}
                            </span>
                          )}
                          {contact.state && (
                            <span className="flex items-center">
                              <MapPinIcon className="h-3 w-3 mr-1" />
                              {contact.state}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loan Officers */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Select Loan Officer
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {officers.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No loan officers available
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {officers.map(officer => {
                  const compatibility = getOfficerCompatibility(officer);
                  const isSelected = selectedOfficer === officer.id;
                  
                  return (
                    <div
                      key={officer.id}
                      className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-all duration-150 ${
                        isSelected ? 'border-l-4 border-primary' : 'border-l-4 border-transparent'
                      } ${!compatibility.compatible ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedOfficer(officer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 ${isSelected ? 'bg-primary' : 'bg-gray-500'} rounded-full flex items-center justify-center text-white text-sm font-medium transition-colors`}>
                            {(officer.firstName?.[0] || officer.email[0]).toUpperCase()}{(officer.lastName?.[0] || '').toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {officer.firstName && officer.lastName 
                                ? `${officer.firstName} ${officer.lastName}`
                                : officer.email.split('@')[0]}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                States: {officer.licensedStates.join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            {officer.active_contacts} active
                          </p>
                          {selectedContacts.size > 0 && (
                            <p className={`text-xs ${
                              compatibility.compatible ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {compatibility.percentage}% match
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-lg border border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Ready to assign <span className="font-medium">{selectedContacts.size}</span> contact{selectedContacts.size !== 1 ? 's' : ''}
              {selectedOfficer && officers.find(o => o.id === selectedOfficer) && (
                <span> to <span className="font-medium">
                  {(() => {
                    const officer = officers.find(o => o.id === selectedOfficer);
                    return officer?.firstName && officer?.lastName 
                      ? `${officer.firstName} ${officer.lastName}`
                      : officer?.email.split('@')[0];
                  })()}
                </span></span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedContacts(new Set());
                setSelectedOfficer(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              Clear Selection
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning || selectedContacts.size === 0 || !selectedOfficer}
              className="inline-flex items-center px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {assigning ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Assigning...
                </>
              ) : (
                <>
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Assign Contacts
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualAssignment;
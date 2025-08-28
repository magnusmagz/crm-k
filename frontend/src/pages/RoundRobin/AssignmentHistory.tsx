import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { 
  ClockIcon, 
  UserIcon, 
  CalendarIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

interface Assignment {
  id: string;
  contactId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  status: string;
  notes: string;
  firstName: string;
  lastName: string;
  contact_email: string;
  phone: string;
  source: string;
  state: string;
  officer_email: string;
  assigner_email: string;
}

const AssignmentHistory: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    officerId: '',
    dateFrom: '',
    dateTo: '',
    limit: 50,
    offset: 0
  });

  const isAdmin = user && 'isAdmin' in user && user.isAdmin === true;

  useEffect(() => {
    fetchHistory();
  }, [filters]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());
      
      if (filters.officerId) params.append('officerId', filters.officerId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/round-robin/history?${params.toString()}`);
      setAssignments(response.data.history);
      setTotal(response.data.total);
      setError(null);
    } catch (err) {
      setError('Failed to load assignment history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Contact Name', 'Email', 'Phone', 'State', 'Source', 'Assigned To', 'Assigned By', 'Status'].join(','),
      ...assignments.map(a => [
        new Date(a.assignedAt).toLocaleString(),
        `${a.firstName} ${a.lastName}`,
        a.contact_email || '',
        a.phone || '',
        a.state || '',
        a.source || '',
        a.officer_email,
        a.assigner_email || 'System',
        a.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assignments-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'contacted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Contacted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const pageCount = Math.ceil(total / filters.limit);
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;

  if (loading && filters.offset === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Assignment History</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and export past contact assignments
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, offset: 0 })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, offset: 0 })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Records per page
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), offset: 0 })}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned By
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.firstName} {assignment.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.contact_email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {assignment.phone && (
                        <div>{assignment.phone}</div>
                      )}
                      {assignment.state && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {assignment.state}
                        </span>
                      )}
                      {assignment.source && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-light bg-opacity-20 text-primary-dark">
                          {assignment.source}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {assignment.officer_email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-2 text-sm text-gray-900">
                        {assignment.officer_email.split('@')[0]}
                      </div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {assignment.assigner_email ? 
                          assignment.assigner_email.split('@')[0] : 
                          'System'}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDateTime(assignment.assignedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(assignment.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                disabled={filters.offset === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                disabled={filters.offset + filters.limit >= total}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{filters.offset + 1}</span>
                  {' to '}
                  <span className="font-medium">
                    {Math.min(filters.offset + filters.limit, total)}
                  </span>
                  {' of '}
                  <span className="font-medium">{total}</span>
                  {' results'}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                    disabled={filters.offset === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} of {pageCount}
                  </span>
                  <button
                    onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                    disabled={filters.offset + filters.limit >= total}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentHistory;
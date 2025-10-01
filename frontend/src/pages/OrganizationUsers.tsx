import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface User {
  id: string;
  email: string;
  is_admin: boolean;
  is_loan_officer: boolean;
  is_active: boolean;
  last_login: string | null;
}

interface Organization {
  id: string;
  name: string;
  crm_name: string;
  is_active: boolean;
  users: User[];
}

const OrganizationUsers: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/super-admin/organizations/${id}`);
      setOrganization(response.data.organization);
    } catch (error: any) {
      console.error('Failed to fetch organization:', error);
      setError(error.response?.data?.error || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading organization</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          to="/super-admin/organizations"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Organizations
        </Link>
      </div>

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {organization.name} - Users
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {organization.crm_name || 'No CRM name set'} • {organization.users?.length || 0} users
          </p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Organization Users
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            All users associated with this organization
          </p>
        </div>

        {!organization.users || organization.users.length === 0 ? (
          <div className="text-center py-12 border-t border-gray-200">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
            <p className="mt-1 text-sm text-gray-500">
              This organization doesn't have any users yet.
            </p>
          </div>
        ) : (
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {organization.users.map((user) => (
                <li key={user.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.email}
                          </p>
                          {user.is_active ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" title="Active" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0" title="Inactive" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            {user.is_admin && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                <ShieldCheckIcon className="mr-1 h-3 w-3" />
                                Admin
                              </span>
                            )}
                            {user.is_loan_officer && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                <BriefcaseIcon className="mr-1 h-3 w-3" />
                                Loan Officer
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Last login: {formatDate(user.last_login)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationUsers;

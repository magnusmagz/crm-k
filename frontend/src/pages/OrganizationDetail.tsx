import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  UserGroupIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CalendarIcon,
  PencilIcon
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
  primary_color: string;
  is_active: boolean;
  contact_email: string;
  website: string;
  created_at: string;
  updated_at: string;
  users: User[];
  contactCount: number;
}

const OrganizationDetail: React.FC = () => {
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const activeUsers = organization.users?.filter(u => u.is_active).length || 0;
  const adminUsers = organization.users?.filter(u => u.is_admin).length || 0;
  const loanOfficers = organization.users?.filter(u => u.is_loan_officer).length || 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          to="/super-admin"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-white text-xl font-semibold"
              style={{ backgroundColor: organization.primary_color }}
            >
              {organization.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {organization.name}
              </h2>
              <div className="flex items-center mt-1">
                <p className="text-sm text-gray-500">{organization.crm_name}</p>
                <span className="mx-2 text-gray-300">•</span>
                {organization.is_active ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircleIcon className="w-4 h-4 mr-1" />
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to={`/super-admin/organizations/${organization.id}/edit`}
            className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
            Edit Organization
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {organization.users?.length || 0}
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      {activeUsers} active
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Contacts</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {organization.contactCount || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {adminUsers}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Loan Officers</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {loanOfficers}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Details */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Organization Details
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Basic information about the organization
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                Organization Name
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {organization.name}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                CRM Name
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {organization.crm_name}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <EnvelopeIcon className="h-5 w-5 mr-2" />
                Contact Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {organization.contact_email ? (
                  <a href={`mailto:${organization.contact_email}`} className="text-primary hover:underline">
                    {organization.contact_email}
                  </a>
                ) : (
                  <span className="text-gray-400">Not set</span>
                )}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <GlobeAltIcon className="h-5 w-5 mr-2" />
                Website
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {organization.website ? (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {organization.website}
                  </a>
                ) : (
                  <span className="text-gray-400">Not set</span>
                )}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                Primary Color
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                <div
                  className="h-6 w-6 rounded border border-gray-300 mr-2"
                  style={{ backgroundColor: organization.primary_color }}
                />
                {organization.primary_color}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Created
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(organization.created_at)}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Last Updated
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(organization.updated_at)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to={`/super-admin/organizations/${organization.id}/users`}
              className="relative group bg-white p-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
            >
              <div className="flex items-center">
                <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-primary group-hover:bg-indigo-100">
                  <UsersIcon className="h-6 w-6" />
                </span>
                <div className="ml-4">
                  <h3 className="text-base font-medium">
                    View Users
                  </h3>
                  <p className="text-sm text-gray-500">
                    {organization.users?.length || 0} user{organization.users?.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to={`/super-admin/organizations/${organization.id}/edit`}
              className="relative group bg-white p-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
            >
              <div className="flex items-center">
                <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100">
                  <PencilIcon className="h-6 w-6" />
                </span>
                <div className="ml-4">
                  <h3 className="text-base font-medium">
                    Edit Organization
                  </h3>
                  <p className="text-sm text-gray-500">
                    Update settings and branding
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetail;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BuildingOfficeIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  UserGroupIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';

interface Organization {
  id: string;
  name: string;
  crmName: string;
  primaryColor: string;
  isActive: boolean;
  contactEmail: string;
  website: string;
  userCount: number;
  contactCount: number;
}

interface OrganizationsResponse {
  organizations: Organization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const OrganizationsManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, [currentPage, searchQuery, statusFilter]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy: 'name',
        sortOrder: 'ASC'
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await api.get(`/super-admin/organizations?${params}`);
      setOrganizations(response.data.organizations);
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Failed to fetch organizations:', error);
      setError(error.response?.data?.error || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (organizationId: string, organizationName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate "${organizationName}"? This will prevent users from accessing their account.`)) {
      return;
    }

    try {
      setDeleteLoading(organizationId);
      await api.delete(`/super-admin/organizations/${organizationId}`);
      
      // Update the organization in the list
      setOrganizations(orgs => 
        orgs.map(org => 
          org.id === organizationId 
            ? { ...org, isActive: false }
            : org
        )
      );
    } catch (error: any) {
      console.error('Failed to deactivate organization:', error);
      alert(error.response?.data?.error || 'Failed to deactivate organization');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleReactivate = async (organizationId: string, organizationName: string) => {
    if (!window.confirm(`Are you sure you want to reactivate "${organizationName}"?`)) {
      return;
    }

    try {
      setDeleteLoading(organizationId);
      await api.put(`/super-admin/organizations/${organizationId}`, {
        isActive: true
      });
      
      // Update the organization in the list
      setOrganizations(orgs => 
        orgs.map(org => 
          org.id === organizationId 
            ? { ...org, isActive: true }
            : org
        )
      );
    } catch (error: any) {
      console.error('Failed to reactivate organization:', error);
      alert(error.response?.data?.error || 'Failed to reactivate organization');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrganizations();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && currentPage === 1) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Organizations Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage all organizations on the platform
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/super-admin/organizations/new"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Organization
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Search */}
            <div className="sm:col-span-2">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search organizations..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            </div>

            {/* Status Filter */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading organizations</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => fetchOrganizations()}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {organizations.length === 0 && !loading ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new organization.'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <div className="mt-6">
                <Link
                  to="/super-admin/organizations/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  New Organization
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacts
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div 
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{ backgroundColor: org.primaryColor }}
                          >
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{org.name}</div>
                          <div className="text-sm text-gray-500">{org.crmName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.isActive ? (
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <UsersIcon className="w-4 h-4 mr-1 text-gray-400" />
                        {org.userCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <UserGroupIcon className="w-4 h-4 mr-1 text-gray-400" />
                        {org.contactCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {org.contactEmail && (
                          <div className="truncate max-w-32">{org.contactEmail}</div>
                        )}
                        {org.website && (
                          <div className="truncate max-w-32 text-indigo-600">
                            <a href={org.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {org.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        to={`/super-admin/organizations/${org.id}`}
                        className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/super-admin/organizations/${org.id}/edit`}
                        className="text-yellow-600 hover:text-yellow-900 inline-flex items-center"
                        title="Edit Organization"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      {org.isActive ? (
                        <button
                          onClick={() => handleDeactivate(org.id, org.name)}
                          disabled={deleteLoading === org.id}
                          className="text-red-600 hover:text-red-900 inline-flex items-center disabled:opacity-50"
                          title="Deactivate Organization"
                        >
                          {deleteLoading === org.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TrashIcon className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(org.id, org.name)}
                          disabled={deleteLoading === org.id}
                          className="text-green-600 hover:text-green-900 inline-flex items-center disabled:opacity-50"
                          title="Reactivate Organization"
                        >
                          {deleteLoading === org.id ? (
                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircleIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
              pageSize={pagination.limit}
              onPageSizeChange={() => {}}
              totalItems={pagination.total}
              startItem={((pagination.page - 1) * pagination.limit) + 1}
              endItem={Math.min(pagination.page * pagination.limit, pagination.total)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationsManagement;
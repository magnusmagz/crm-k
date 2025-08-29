import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  UsersIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
  ClockIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  lastLogin: string | null;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    crmName: string;
    primaryColor: string;
    isActive: boolean;
  };
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    superAdmins: number;
  };
}

const GlobalUsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'super-admin'>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    pages: 1
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    superAdmins: 0
  });
  const [organizations, setOrganizations] = useState<Array<{id: string, name: string}>>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
  }, [currentPage, searchQuery, statusFilter, roleFilter, organizationFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      if (organizationFilter !== 'all') {
        params.append('organizationId', organizationFilter);
      }

      const response = await api.get(`/super-admin/users?${params}`);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
      setStats(response.data.stats);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      setError(error.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await api.get('/super-admin/organizations?limit=100&sortBy=name&sortOrder=ASC');
      setOrganizations(response.data.organizations.map((org: any) => ({
        id: org.id,
        name: org.name
      })));
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const user = users.find(u => u.id === userId);
    
    if (!window.confirm(`Are you sure you want to ${action} ${user?.firstName} ${user?.lastName}?`)) {
      return;
    }

    try {
      setActionLoading(userId);
      await api.put(`/super-admin/users/${userId}`, {
        isActive: !currentStatus
      });
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, isActive: !currentStatus }
            : user
        )
      );
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        active: currentStatus ? prevStats.active - 1 : prevStats.active + 1,
        inactive: currentStatus ? prevStats.inactive + 1 : prevStats.inactive - 1
      }));
    } catch (error: any) {
      console.error('Failed to toggle user status:', error);
      alert(error.response?.data?.error || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'remove admin privileges from' : 'grant admin privileges to';
    const user = users.find(u => u.id === userId);
    
    if (!window.confirm(`Are you sure you want to ${action} ${user?.firstName} ${user?.lastName}?`)) {
      return;
    }

    try {
      setActionLoading(userId);
      await api.put(`/super-admin/users/${userId}`, {
        isAdmin: !currentStatus
      });
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, isAdmin: !currentStatus }
            : user
        )
      );
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        admins: currentStatus ? prevStats.admins - 1 : prevStats.admins + 1
      }));
    } catch (error: any) {
      console.error('Failed to toggle admin status:', error);
      alert(error.response?.data?.error || 'Failed to update admin status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (user: User) => {
    if (user.isSuperAdmin) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <ShieldCheckIcon className="w-3 h-3 mr-1" />
          Super Admin
        </span>
      );
    }
    
    if (!user.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }
    
    if (user.isAdmin) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <ShieldCheckIcon className="w-3 h-3 mr-1" />
          Admin
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircleIcon className="w-3 h-3 mr-1" />
        Active User
      </span>
    );
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
            Global Users Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View and manage users across all organizations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.active}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Inactive</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.inactive}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.admins}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Super Admins</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.superAdmins}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search users..."
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

            {/* Role Filter */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as 'all' | 'admin' | 'user' | 'super-admin');
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="user">Users Only</option>
                  <option value="admin">Admins Only</option>
                  <option value="super-admin">Super Admins Only</option>
                </select>
              </div>
            </div>

            {/* Organization Filter */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={organizationFilter}
                  onChange={(e) => {
                    setOrganizationFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Organizations</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
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
              <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => fetchUsers()}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {users.length === 0 && !loading ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status & Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserCircleIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <EnvelopeIcon className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2"
                          style={{ backgroundColor: user.organization.primaryColor }}
                        >
                          {user.organization.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.organization.name}</div>
                          <div className="text-sm text-gray-500">{user.organization.crmName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getStatusBadge(user)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? (
                        <div className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatDate(user.lastLogin)}
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {!user.isSuperAdmin && (
                        <>
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                            disabled={actionLoading === user.id}
                            className={`${
                              user.isActive 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            } inline-flex items-center disabled:opacity-50`}
                            title={user.isActive ? 'Deactivate User' : 'Activate User'}
                          >
                            {actionLoading === user.id ? (
                              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                            ) : user.isActive ? (
                              <XCircleIcon className="w-4 h-4" />
                            ) : (
                              <CheckCircleIcon className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleAdminStatus(user.id, user.isAdmin)}
                            disabled={actionLoading === user.id}
                            className={`${
                              user.isAdmin 
                                ? 'text-orange-600 hover:text-orange-900' 
                                : 'text-blue-600 hover:text-blue-900'
                            } inline-flex items-center disabled:opacity-50`}
                            title={user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          >
                            {actionLoading === user.id ? (
                              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ShieldCheckIcon className="w-4 h-4" />
                            )}
                          </button>
                        </>
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

export default GlobalUsersView;
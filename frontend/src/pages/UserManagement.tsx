import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  UserPlusIcon, 
  PencilIcon, 
  TrashIcon, 
  KeyIcon,
  EnvelopeIcon,
  CheckBadgeIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  isLoanOfficer: boolean;
  licensedStates?: string[];
  isActive?: boolean;
  createdAt: string;
  lastLogin?: string;
  stats?: {
    contactCount: number;
    dealCount: number;
    totalDealValue: number;
  };
}

interface NewUserForm {
  email: string;
  firstName: string;
  lastName: string;
  isLoanOfficer: boolean;
  licensedStates: string[];
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<NewUserForm>({
    email: '',
    firstName: '',
    lastName: '',
    isLoanOfficer: false,
    licensedStates: []
  });

  // Check if current user is admin
  useEffect(() => {
    if (!currentUser?.isAdmin) {
      toast.error('Admin access required');
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/user-management');
      setUsers(response.data);
    } catch (error: any) {
      toast.error('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/user-management', formData);
      toast.success('User created and invitation sent!');
      setShowCreateModal(false);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        isLoanOfficer: false,
        licensedStates: []
      });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await api.put(`/user-management/${userId}`, updates);
      toast.success('User updated successfully');
      fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Reset password for ${userEmail}?`)) {
      return;
    }

    try {
      const response = await api.post(`/user-management/${userId}/reset-password`);
      toast.success('Password reset email sent');
      
      // In development, show the temp password
      if (response.data.tempPassword) {
        toast.success(`Temp password: ${response.data.tempPassword}`, {
          duration: 10000
        });
      }
    } catch (error: any) {
      toast.error('Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Deactivate user ${userEmail}? Their contacts will need to be reassigned.`)) {
      return;
    }

    try {
      await api.delete(`/user-management/${userId}`);
      toast.success('User deactivated');
      fetchUsers();
    } catch (error: any) {
      if (error.response?.data?.assignedContacts) {
        toast.error(`User has ${error.response.data.assignedContacts} assigned contacts. Please reassign them first.`);
      } else {
        toast.error('Failed to deactivate user');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users and permissions for your organization
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-10 w-10 text-primary mr-3" />
            <div>
              <p className="text-2xl font-semibold">{users.length}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckBadgeIcon className="h-10 w-10 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-semibold">
                {users.filter(u => u.isActive !== false).length}
              </p>
              <p className="text-sm text-gray-500">Active Users</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <KeyIcon className="h-10 w-10 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-semibold">
                {users.filter(u => u.isAdmin).length}
              </p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-10 w-10 text-primary mr-3" />
            <div>
              <p className="text-2xl font-semibold">
                {users.filter(u => u.isLoanOfficer).length}
              </p>
              <p className="text-sm text-gray-500">Loan Officers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stats
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={user.isActive === false ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    {user.isAdmin && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Admin
                      </span>
                    )}
                    {user.isLoanOfficer && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-primary-dark">
                        Loan Officer
                      </span>
                    )}
                    {!user.isAdmin && !user.isLoanOfficer && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        User
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>
                    <div>{user.stats?.contactCount || 0} contacts</div>
                    <div>{user.stats?.dealCount || 0} deals</div>
                    <div className="font-medium">
                      {formatCurrency(user.stats?.totalDealValue || 0)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isActive !== false ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowEditModal(true);
                      }}
                      className="text-primary hover:text-primary-dark"
                      title="Edit user"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user.id, user.email)}
                      className="text-orange-600 hover:text-orange-900"
                      title="Reset password"
                    >
                      <KeyIcon className="h-5 w-5" />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="text-red-600 hover:text-red-900"
                        title="Deactivate user"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isLoanOfficer}
                      onChange={(e) => setFormData({ ...formData, isLoanOfficer: e.target.checked })}
                      className="mr-2 rounded text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Is Loan Officer
                    </span>
                  </label>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create User & Send Invitation'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Edit User: {selectedUser.email}</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUser.isAdmin}
                    onChange={(e) => setSelectedUser({ ...selectedUser, isAdmin: e.target.checked })}
                    disabled={selectedUser.id === currentUser?.id}
                    className="mr-2 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Administrator
                  </span>
                </label>
                {selectedUser.id === currentUser?.id && (
                  <p className="text-xs text-gray-500 mt-1">
                    You cannot remove your own admin privileges
                  </p>
                )}
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUser.isLoanOfficer}
                    onChange={(e) => setSelectedUser({ ...selectedUser, isLoanOfficer: e.target.checked })}
                    className="mr-2 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Loan Officer
                  </span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUser.isActive !== false}
                    onChange={(e) => setSelectedUser({ ...selectedUser, isActive: e.target.checked })}
                    className="mr-2 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active User
                  </span>
                </label>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateUser(selectedUser.id, selectedUser)}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
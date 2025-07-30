import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { contactsAPI } from '../services/api';
import { UserGroupIcon, CogIcon, PlusIcon } from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalContacts: 0,
    recentContacts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await contactsAPI.getAll({ limit: 1 });
        setStats({
          totalContacts: response.data.total,
          recentContacts: response.data.total, // In a real app, we'd filter by date
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-dark">
          Welcome back, {profile?.firstName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your CRM today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-mobile">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Contacts</dt>
                  <dd className="text-lg font-medium text-primary-dark">{stats.totalContacts}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-mobile py-2 sm:py-3">
            <div className="text-mobile-sm">
              <Link to="/contacts" className="font-medium text-primary hover:text-gray-700">
                View all
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-mobile">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlusIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Quick Actions</dt>
                  <dd className="text-lg font-medium text-primary-dark">Add Contact</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-mobile py-2 sm:py-3">
            <div className="text-mobile-sm">
              <Link to="/contacts?new=true" className="font-medium text-primary hover:text-gray-700">
                Create new
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-mobile">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CogIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Settings</dt>
                  <dd className="text-lg font-medium text-primary-dark">Custom Fields</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-mobile py-2 sm:py-3">
            <div className="text-mobile-sm">
              <Link to="/custom-fields" className="font-medium text-primary hover:text-gray-700">
                Manage fields
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-primary-dark mb-4">Getting Started</h2>
        <div className="bg-white shadow rounded-lg p-6">
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">✓</span>
              <span className="ml-3 text-gray-600">Create your account and set up your profile</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">○</span>
              <span className="ml-3 text-gray-600">Add custom fields to track specific information</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">○</span>
              <span className="ml-3 text-gray-600">Import or add your first contacts</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5">○</span>
              <span className="ml-3 text-gray-600">Start tracking customer interactions</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
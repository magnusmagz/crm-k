import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
  UserGroupIcon,
  CogIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';

interface DashboardData {
  contacts: {
    total: number;
    growth: Array<{ date: string; count: number }>;
  };
  activities: {
    thisWeek: number;
    breakdown: Array<{ type: string; count: number }>;
  };
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await analyticsAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Format contact growth data for chart
  const contactGrowthData = dashboardData?.contacts.growth.map(item => ({
    date: format(new Date(item.date), 'MMM d'),
    contacts: item.count
  })) || [];

  // Calculate cumulative contact growth
  let cumulative = 0;
  const cumulativeGrowthData = contactGrowthData.map(item => {
    cumulative += item.contacts;
    return {
      date: item.date,
      total: cumulative
    };
  });

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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-mobile">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Contacts</dt>
                  <dd className="text-3xl font-bold text-primary-dark">
                    {dashboardData?.contacts.total || 0}
                  </dd>
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
                <ClipboardDocumentListIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Activities This Week</dt>
                  <dd className="text-3xl font-bold text-primary-dark">
                    {dashboardData?.activities.thisWeek || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-mobile py-2 sm:py-3">
            <div className="text-mobile-sm">
              <span className="text-gray-600">Calls, meetings, emails & more</span>
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
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Contact Growth Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ArrowTrendingUpIcon className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-lg font-semibold text-primary-dark">Contact Growth (Last 30 Days)</h2>
          </div>
          {cumulativeGrowthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={cumulativeGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={{ fill: '#4F46E5' }}
                  name="Total Contacts"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No contact growth data yet
            </div>
          )}
        </div>

        {/* Activity Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CalendarDaysIcon className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-lg font-semibold text-primary-dark">Activity Breakdown (This Week)</h2>
          </div>
          {dashboardData?.activities.breakdown && dashboardData.activities.breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dashboardData.activities.breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" name="Activities" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No activities logged this week
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
};

export default Dashboard;

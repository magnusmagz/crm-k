import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
  UserGroupIcon,
  CogIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface DashboardData {
  contacts: {
    total: number;
    growth: Array<{ date: string; count: number }>;
  };
  activities: {
    thisWeek: number;
    weeklyGoal: number;
    breakdown: Array<{ type: string; count: number }>;
  };
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await analyticsAPI.getDashboard();
      setDashboardData(response.data);
      setGoalInput(response.data.activities.weeklyGoal.toString());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGoal = async () => {
    const newGoal = parseInt(goalInput);
    if (isNaN(newGoal) || newGoal < 1 || newGoal > 1000) {
      alert('Please enter a valid goal between 1 and 1000');
      return;
    }

    try {
      await analyticsAPI.updateWeeklyGoal(newGoal);
      setDashboardData(prev => prev ? {
        ...prev,
        activities: { ...prev.activities, weeklyGoal: newGoal }
      } : null);
      setIsEditingGoal(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert('Failed to update goal');
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
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
            <div className="text-mobile-sm flex items-center justify-between">
              <Link to="/contacts" className="font-medium text-primary hover:text-gray-700">
                View all
              </Link>
              <Link to="/contacts?new=true" className="font-medium text-primary hover:text-gray-700">
                Create new
              </Link>
            </div>
          </div>
        </div>

        {/* Contact Growth Chart */}
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ArrowTrendingUpIcon className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-lg font-semibold text-primary-dark">Contact Growth (Last 30 Days)</h2>
          </div>
          {cumulativeGrowthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cumulativeGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11 }} />
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
            <div className="flex items-center justify-center h-48 text-gray-500">
              No contact growth data yet
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Activity Goal */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="h-6 w-6 text-primary mr-2" />
              <h2 className="text-lg font-semibold text-primary-dark">Weekly Activity Goal</h2>
            </div>
            {!isEditingGoal && (
              <button
                onClick={() => setIsEditingGoal(true)}
                className="text-xs text-primary hover:text-primary-dark font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingGoal ? (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Goal:</span>
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                min="1"
                max="1000"
              />
              <button
                onClick={handleUpdateGoal}
                className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingGoal(false);
                  setGoalInput(dashboardData?.activities.weeklyGoal.toString() || '50');
                }}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Large numbers display */}
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary-dark">
                  {dashboardData?.activities.thisWeek || 0}
                </span>
                <span className="text-2xl text-gray-400">/</span>
                <span className="text-3xl font-semibold text-gray-600">
                  {dashboardData?.activities.weeklyGoal || 50}
                </span>
              </div>

              {/* Percentage display */}
              <div>
                <span className="text-sm font-semibold inline-block text-primary">
                  {Math.round(((dashboardData?.activities.thisWeek || 0) / (dashboardData?.activities.weeklyGoal || 50)) * 100)}% Complete
                </span>
              </div>
              <p className="text-sm text-gray-600">Calls, meetings, emails & more</p>
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
            <div className="space-y-3">
              {dashboardData.activities.breakdown.map((activity) => (
                <div key={activity.type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {activity.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-lg font-bold text-primary-dark">{activity.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300">
                <span className="text-base font-semibold text-gray-900">Total Activities</span>
                <span className="text-xl font-bold text-primary">
                  {dashboardData.activities.breakdown.reduce((sum, activity) => sum + activity.count, 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
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

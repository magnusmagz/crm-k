import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { 
  UserGroupIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  UserIcon,
  DocumentTextIcon,
  PhoneIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  summary: {
    total_assignments: number;
    today_assignments: number;
    pending_assignments: number;
    contacted_assignments: number;
    active_officers: number;
    avg_response_time_minutes: number;
  };
  officers: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    total_assigned: number;
    contacted: number;
    assigned_today: number;
  }>;
}

interface RecentActivity {
  id: string;
  contactId: string;
  firstName: string;
  lastName: string;
  contact_email: string;
  officer_email: string;
  assignedAt: string;
  status: string;
  source: string;
}

const AssignmentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.isAdmin === true;

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);

    try {
      const [statsRes, historyRes] = await Promise.all([
        api.get('/round-robin/stats'),
        api.get('/round-robin/history?limit=10')
      ]);

      setStats(statsRes.data);
      setRecentActivity(historyRes.data.history);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return then.toLocaleDateString();
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'contacted':
        return <PhoneIcon className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => fetchDashboardData()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assignment Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage contact assignments
          </p>
        </div>
        {refreshing && (
          <div className="flex items-center text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            Refreshing...
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {isAdmin && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/round-robin/assign"
            className="bg-white rounded-lg shadow px-6 py-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Manual Assignment</p>
                <p className="text-sm text-gray-500">Assign contacts to officers</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/round-robin/rules"
            className="bg-white rounded-lg shadow px-6 py-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Manage Rules</p>
                <p className="text-sm text-gray-500">Configure assignment rules</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/round-robin/history"
            className="bg-white rounded-lg shadow px-6 py-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">View History</p>
                <p className="text-sm text-gray-500">Assignment history & reports</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="text-sm font-medium text-gray-500">Total Assigned</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {stats?.summary.total_assignments || 0}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="text-sm font-medium text-gray-500">Today</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {stats?.summary.today_assignments || 0}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="mt-2 text-2xl font-semibold text-yellow-600">
            {stats?.summary.pending_assignments || 0}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="text-sm font-medium text-gray-500">Contacted</div>
          <div className="mt-2 text-2xl font-semibold text-green-600">
            {stats?.summary.contacted_assignments || 0}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="text-sm font-medium text-gray-500">Active Officers</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {stats?.summary.active_officers || 0}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="text-sm font-medium text-gray-500">Avg Response</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {Math.round(stats?.summary.avg_response_time_minutes || 0)}m
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Assignments</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No recent activity
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.status)}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.firstName} {activity.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Assigned to {activity.officer_email.split('@')[0]}
                        </p>
                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatTime(activity.assignedAt)}</span>
                          {activity.source && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              {activity.source}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded ${
                            activity.status === 'contacted' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Officer Performance */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Performance</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {stats?.officers && stats.officers.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {stats.officers.map((officer) => {
                  const contactRate = officer.total_assigned > 0 
                    ? Math.round((officer.contacted / officer.total_assigned) * 100)
                    : 0;

                  return (
                    <div key={officer.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {officer.firstName && officer.lastName 
                              ? `${officer.firstName[0]}${officer.lastName[0]}`.toUpperCase()
                              : officer.email.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {officer.firstName && officer.lastName 
                                ? `${officer.firstName} ${officer.lastName}`
                                : officer.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-gray-500">
                              {officer.assigned_today} assigned today
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {officer.total_assigned} total
                          </p>
                          <p className="text-xs text-gray-500">
                            {contactRate}% contact rate
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No officer data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDashboard;
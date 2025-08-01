import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { analyticsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface OverviewStats {
  totalSent: number;
  deliveryStats: Record<string, number>;
  engagement: {
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
    avgOpenCount: string;
    avgClickCount: string;
  };
  quality: {
    bounceCount: number;
    bounceRate: number;
    complaintCount: number;
    complaintRate: number;
  };
  unsubscribes: {
    totalUnsubscribes: number;
    unsubscribeRate: number;
    byReason: Record<string, number>;
  };
}

interface PerformanceData {
  period: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

interface UnsubscribeAnalytics {
  summary: {
    totalUnsubscribes: number;
    byReason: Record<string, number>;
  };
  trend: Array<{
    date: string;
    unsubscribes: number;
    reason: string;
  }>;
  recent: Array<{
    id: string;
    email: string;
    reason: string;
    unsubscribedAt: string;
  }>;
}

export default function EmailAnalytics() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [performance, setPerformance] = useState<PerformanceData[]>([]);
  const [unsubscribeAnalytics, setUnsubscribeAnalytics] = useState<UnsubscribeAnalytics | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch overview stats
      const overviewRes = await analyticsAPI.getOverview({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      setOverview(overviewRes.data);

      // Fetch performance data
      const performanceRes = await analyticsAPI.getCampaignPerformance(period);
      setPerformance(performanceRes.data.data);

      // Fetch unsubscribe analytics
      const unsubscribeRes = await analyticsAPI.getUnsubscribeAnalytics({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        limit: 10,
      });
      setUnsubscribeAnalytics(unsubscribeRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (period === '24h') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const deliveryData = overview ? Object.entries(overview.deliveryStats).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metrics</h1>
        
        {/* Period Selector */}
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sent</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {overview?.totalSent.toLocaleString() || 0}
              </p>
            </div>
            <EnvelopeIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        {/* Open Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {overview?.engagement.openRate || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {overview?.engagement.totalOpened || 0} opened
              </p>
            </div>
            <EyeIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        {/* Click Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Click Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {overview?.engagement.clickRate || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {overview?.engagement.totalClicked || 0} clicked
              </p>
            </div>
            <CursorArrowRaysIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        {/* Bounce Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bounce Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {overview?.quality.bounceRate || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {overview?.quality.bounceCount || 0} bounced
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Unsubscribes Row */}
      {overview?.unsubscribes && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Unsubscribe Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unsubscribe Rate</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {overview.unsubscribes.unsubscribeRate}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {overview.unsubscribes.totalUnsubscribes} unsubscribed
                </p>
              </div>
              <NoSymbolIcon className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          {/* Unsubscribe Reasons */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Unsubscribe Reasons</h3>
            <div className="space-y-2">
              {Object.entries(overview.unsubscribes.byReason).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {reason.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ 
                          width: `${overview.unsubscribes.totalUnsubscribes > 0 
                            ? (count / overview.unsubscribes.totalUnsubscribes) * 100 
                            : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Email Performance Over Time
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#8b5cf6" 
                  name="Sent"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="opened" 
                  stroke="#3b82f6" 
                  name="Opened"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="clicked" 
                  stroke="#10b981" 
                  name="Clicked"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery Status Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Delivery Status Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deliveryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Engagement Rates Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Open & Click Rates Trend
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="period" 
                tickFormatter={formatDate}
                stroke="#6b7280"
              />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white'
                }}
                formatter={(value: number) => `${value}%`}
              />
              <Bar dataKey="openRate" fill="#3b82f6" name="Open Rate %" />
              <Bar dataKey="clickRate" fill="#10b981" name="Click Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      {overview && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Average Engagement
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Opens per Email</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {overview.engagement.avgOpenCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Clicks per Email</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {overview.engagement.avgClickCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Complaint Rate</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {overview.quality.complaintRate}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Complaints</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {overview.quality.complaintCount}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
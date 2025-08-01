import React, { useState, useEffect } from 'react';
import { automationsAPI } from '../../services/api';
import { 
  ArrowRightOnRectangleIcon, 
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FlagIcon
} from '@heroicons/react/24/outline';

interface ExitStats {
  totalExited: number;
  byReason: Array<{
    exitReason: string;
    count: number;
  }>;
  recentExits: Array<{
    id: string;
    entityType: string;
    entityId: string;
    exitReason: string;
    exitedAt: string;
  }>;
}

interface ExitStatsViewProps {
  automationId: string;
}

const ExitStatsView: React.FC<ExitStatsViewProps> = ({ automationId }) => {
  const [stats, setStats] = useState<ExitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExitStats();
  }, [automationId]);

  const fetchExitStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await automationsAPI.getExitStats(automationId);
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load exit statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const getExitReasonIcon = (reason: string) => {
    if (reason.includes('goal') || reason.includes('Goal')) {
      return <FlagIcon className="h-4 w-4 text-green-500" />;
    }
    if (reason.includes('time') || reason.includes('duration') || reason.includes('days')) {
      return <ClockIcon className="h-4 w-4 text-primary" />;
    }
    if (reason.includes('safety') || reason.includes('error') || reason.includes('Safety')) {
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
    }
    return <ArrowRightOnRectangleIcon className="h-4 w-4 text-gray-500" />;
  };

  const getExitReasonColor = (reason: string) => {
    if (reason.includes('goal') || reason.includes('Goal')) {
      return 'bg-green-100 text-green-800';
    }
    if (reason.includes('time') || reason.includes('duration') || reason.includes('days')) {
      return 'bg-primary-light text-primary-dark';
    }
    if (reason.includes('safety') || reason.includes('error') || reason.includes('Safety')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="h-5 w-5 bg-gray-300 rounded mr-2"></div>
            <div className="h-5 w-32 bg-gray-300 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-300 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchExitStats}
            className="mt-2 text-sm text-primary hover:text-primary-dark"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalExited === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Exit Statistics</h3>
        </div>
        <div className="text-center py-8">
          <ArrowRightOnRectangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No exits recorded yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Statistics will appear here when contacts exit this automation
          </p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...stats.byReason.map(r => r.count));

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Exit Statistics</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {stats.totalExited} contacts have exited this automation
        </p>
      </div>

      <div className="p-6">
        {/* Exit Reasons Chart */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Exit Reasons</h4>
          <div className="space-y-3">
            {stats.byReason.map((reason, index) => (
              <div key={index} className="flex items-center">
                <div className="flex items-center min-w-0 flex-1">
                  {getExitReasonIcon(reason.exitReason)}
                  <span className="ml-2 text-sm text-gray-700 truncate">
                    {reason.exitReason}
                  </span>
                </div>
                <div className="ml-4 flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(reason.count / maxCount) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {reason.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Exits */}
        {stats.recentExits.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Recent Exits</h4>
            <div className="space-y-2">
              {stats.recentExits.map((exit) => (
                <div key={exit.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="text-sm text-gray-600 capitalize">
                      {exit.entityType}
                    </span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-sm text-gray-500 truncate">
                      ID: {exit.entityId.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExitReasonColor(exit.exitReason)}`}>
                      {exit.exitReason}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(exit.exitedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={fetchExitStats}
            className="text-sm text-gray-600 hover:text-primary-dark"
          >
            Refresh statistics
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitStatsView;
import React, { useState, useEffect } from 'react';
import { automationsAPI } from '../../services/api';
import { BugAntIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface DebugViewProps {
  automationId: string;
}

interface DebugLog {
  sessionId: string;
  event: string;
  data: any;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
}

const DebugView: React.FC<DebugViewProps> = ({ automationId }) => {
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchDebugInfo();
    // Refresh every 5 seconds
    const interval = setInterval(fetchDebugInfo, 5000);
    return () => clearInterval(interval);
  }, [automationId]);

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch(`/api/automations/${automationId}/debug`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setDebugLogs(data.debugLogs || []);
      setRecentEnrollments(data.recentEnrollments || []);
    } catch (error) {
      console.error('Failed to fetch debug info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventIcon = (event: string, level: string) => {
    if (level === 'error') return <XCircleIcon className="h-5 w-5 text-red-500" />;
    if (event.includes('SUCCESS') || event.includes('COMPLETED')) return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    if (event.includes('FAILED')) return <XCircleIcon className="h-5 w-5 text-red-500" />;
    return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
  };

  const getEventColor = (event: string, level: string) => {
    if (level === 'error') return 'bg-red-50 border-red-200';
    if (event.includes('SUCCESS') || event.includes('COMPLETED')) return 'bg-green-50 border-green-200';
    if (event.includes('FAILED')) return 'bg-red-50 border-red-200';
    if (event.includes('WARNING')) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <BugAntIcon className="h-5 w-5 mr-2" />
          Debug Information
        </h3>
        <span className="text-sm text-gray-500">
          Auto-refreshing every 5 seconds
        </span>
      </div>

      {/* Recent Enrollments */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Enrollments</h4>
        {recentEnrollments.length === 0 ? (
          <p className="text-sm text-gray-500">No recent enrollments</p>
        ) : (
          <div className="space-y-2">
            {recentEnrollments.slice(0, 5).map((enrollment: any) => (
              <div key={enrollment.id} className="flex items-center text-sm bg-gray-50 p-2 rounded">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  enrollment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  enrollment.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {enrollment.status}
                </span>
                <span className="ml-2 text-gray-600">
                  {enrollment.entityType} {enrollment.entityId}
                </span>
                <span className="ml-auto text-gray-400">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  {formatTimestamp(enrollment.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Logs */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Logs</h4>
        {debugLogs.length === 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-500">No debug logs available</p>
            <p className="text-xs text-gray-400 mt-1">
              Debug logs will appear here when automations run
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {debugLogs.map((log, index) => (
              <div
                key={`${log.sessionId}-${index}`}
                className={`border rounded-lg p-3 ${getEventColor(log.event, log.level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    {getEventIcon(log.event, log.level)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{log.event}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedLog(expandedLog === log.sessionId ? null : log.sessionId)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {expandedLog === log.sessionId ? 'Hide' : 'Show'} details
                  </button>
                </div>
                
                {expandedLog === log.sessionId && (
                  <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-xs">
                    <pre className="whitespace-pre-wrap font-mono">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Show key information inline */}
                {log.event === 'CONDITION_EVALUATION' && log.data.evaluation && (
                  <p className="text-xs text-gray-600 mt-2 ml-8">
                    {log.data.evaluation}
                  </p>
                )}
                {log.event === 'ACTION_EXECUTION' && log.data.error && (
                  <p className="text-xs text-red-600 mt-2 ml-8">
                    Error: {log.data.error}
                  </p>
                )}
                {log.event === 'ENROLLMENT_DECISION' && (
                  <p className="text-xs text-gray-600 mt-2 ml-8">
                    {log.data.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enable Debug Mode Tip */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Tip:</strong> For more detailed logs, set AUTOMATION_DEBUG=true in your environment variables
        </p>
      </div>
    </div>
  );
};

export default DebugView;
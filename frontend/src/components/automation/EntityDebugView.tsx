import React, { useState, useEffect } from 'react';
import { BugAntIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface EntityDebugViewProps {
  entityType: 'contact' | 'deal';
  entityId: string;
}

interface DebugLog {
  sessionId: string;
  event: string;
  data: any;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
}

interface Enrollment {
  id: string;
  automationId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  nextStepAt: string | null;
  currentStepIndex: number;
  metadata: any;
  Automation?: {
    id: string;
    name: string;
    trigger: any;
    isActive: boolean;
  };
}

const EntityDebugView: React.FC<EntityDebugViewProps> = ({ entityType, entityId }) => {
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);

  useEffect(() => {
    fetchDebugInfo();
    // Refresh every 5 seconds
    const interval = setInterval(fetchDebugInfo, 5000);
    return () => clearInterval(interval);
  }, [entityType, entityId]);

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch(`/api/automations/debug/entity/${entityType}/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setDebugLogs(data.debugLogs || []);
      setEnrollments(data.enrollments || []);
    } catch (error) {
      console.error('Failed to fetch entity debug info:', error);
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

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      unenrolled: 'bg-gray-100 text-gray-800'
    };
    return statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800';
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
          Entity Debug Information
        </h3>
        <div className="text-sm text-gray-500">
          <span className="font-medium">{entityType}:</span> {entityId}
        </div>
      </div>

      {/* Current Enrollments */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Automation Enrollments</h4>
        {enrollments.length === 0 ? (
          <p className="text-sm text-gray-500">No automation enrollments found</p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedEnrollment === enrollment.id ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => setSelectedEnrollment(selectedEnrollment === enrollment.id ? null : enrollment.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(enrollment.status)}`}>
                      {enrollment.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {enrollment.Automation?.name || 'Unknown Automation'}
                    </span>
                    {!enrollment.Automation?.isActive && (
                      <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    {formatTimestamp(enrollment.enrolledAt)}
                  </span>
                </div>
                
                {selectedEnrollment === enrollment.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Enrollment ID:</span>{' '}
                      <span className="font-mono text-xs">{enrollment.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Automation ID:</span>{' '}
                      <span className="font-mono text-xs">{enrollment.automationId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Step:</span>{' '}
                      <span className="font-medium">{enrollment.currentStepIndex}</span>
                    </div>
                    {enrollment.nextStepAt && (
                      <div>
                        <span className="text-gray-600">Next Step At:</span>{' '}
                        <span className="font-medium">{formatTimestamp(enrollment.nextStepAt)}</span>
                      </div>
                    )}
                    {enrollment.completedAt && (
                      <div>
                        <span className="text-gray-600">Completed At:</span>{' '}
                        <span className="font-medium">{formatTimestamp(enrollment.completedAt)}</span>
                      </div>
                    )}
                    {enrollment.metadata && Object.keys(enrollment.metadata).length > 0 && (
                      <div>
                        <span className="text-gray-600">Metadata:</span>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(enrollment.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    {enrollment.Automation && (
                      <div>
                        <span className="text-gray-600">Trigger:</span>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(enrollment.Automation.trigger, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
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
            <p className="text-sm text-gray-500">No debug logs available for this entity</p>
            <p className="text-xs text-gray-400 mt-1">
              Debug logs will appear here when automations process this entity
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
                    onClick={() => setExpandedLog(expandedLog === `${log.sessionId}-${index}` ? null : `${log.sessionId}-${index}`)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {expandedLog === `${log.sessionId}-${index}` ? 'Hide' : 'Show'} details
                  </button>
                </div>
                
                {expandedLog === `${log.sessionId}-${index}` && (
                  <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-xs">
                    <pre className="whitespace-pre-wrap font-mono">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Show key information inline */}
                {log.event === 'ACTION_EXECUTION' && log.data.error && (
                  <p className="text-xs text-red-600 mt-2 ml-8">
                    Error: {log.data.error}
                  </p>
                )}
                {log.event === 'ENROLLMENT_ERROR' && log.data.error && (
                  <p className="text-xs text-red-600 mt-2 ml-8">
                    Error: {log.data.error}
                  </p>
                )}
                {log.event === 'GET_ENTITY_ERROR' && log.data.error && (
                  <p className="text-xs text-red-600 mt-2 ml-8">
                    Error: {log.data.error}
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
          <strong>Tip:</strong> Make sure AUTOMATION_DEBUG=true is set in your environment for detailed logs
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          Entity ID: <span className="font-mono">{entityId}</span>
        </p>
      </div>
    </div>
  );
};

export default EntityDebugView;
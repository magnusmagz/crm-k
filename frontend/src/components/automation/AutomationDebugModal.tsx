import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { automationsAPI } from '../../services/api';

interface AutomationDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'contact' | 'deal';
  entityId: string;
  entityName?: string;
}

interface DebugInfo {
  entity: any;
  logs: any[];
  enrollments: any[];
  applicableAutomations: any[];
}

const AutomationDebugModal: React.FC<AutomationDebugModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName
}) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchDebugInfo();
    }
  }, [isOpen, entityId]);

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await automationsAPI.getEntityDebugInfo(entityType, entityId);
      setDebugInfo(response.data);
    } catch (err) {
      setError('Failed to fetch debug information');
      console.error('Debug fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'waiting':
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="modal-mobile transform bg-white text-left shadow-xl transition-all">
                <div className="bg-white">
                  <div className="sticky top-0 bg-white flex items-center justify-between px-mobile py-3 sm:py-4 border-b z-10">
                    <Dialog.Title className="text-mobile-lg font-medium text-primary-dark truncate pr-2">
                      Action Debug
                      {entityName && <span className="text-mobile-sm text-gray-500 ml-2 hidden sm:inline">for {entityName}</span>}
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500 touch-target flex items-center justify-center"
                    >
                      <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </div>

                  <div className="px-mobile py-mobile overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                    {loading && (
                      <div className="text-center py-6 sm:py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-dark mx-auto"></div>
                        <p className="mt-2 text-mobile-sm text-gray-500">Loading debug information...</p>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <p className="text-red-800">{error}</p>
                      </div>
                    )}

                    {debugInfo && !loading && (
                      <div className="space-y-6">
                        {/* Recent Logs */}
                        <div>
                          <h3 className="text-lg font-medium text-primary-dark mb-3">Recent Action Logs</h3>
                          {debugInfo.logs.length === 0 ? (
                            <p className="text-gray-500">No action logs found</p>
                          ) : (
                            <div className="space-y-3">
                              {debugInfo.logs.map((log) => (
                                <div key={log.id} className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                      {getStatusIcon(log.status)}
                                      <div>
                                        <p className="font-medium text-primary-dark">
                                          {log.automation?.name || 'Unknown Action'}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                          {formatDate(log.createdAt)}
                                        </p>
                                        {log.error && (
                                          <p className="text-sm text-red-600 mt-2">
                                            Error: {log.error}
                                          </p>
                                        )}
                                        {log.executionDetails && (
                                          <details className="mt-2">
                                            <summary className="text-sm text-gray-600 cursor-pointer">
                                              Execution Details
                                            </summary>
                                            <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                                              {JSON.stringify(log.executionDetails, null, 2)}
                                            </pre>
                                          </details>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      log.conditionsMet ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-primary'
                                    }`}>
                                      Conditions: {log.conditionsMet ? 'Met' : 'Not Met'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Active Enrollments */}
                        <div>
                          <h3 className="text-lg font-medium text-primary-dark mb-3">Active Enrollments</h3>
                          {debugInfo.enrollments.length === 0 ? (
                            <p className="text-gray-500">No active enrollments</p>
                          ) : (
                            <div className="space-y-3">
                              {debugInfo.enrollments.map((enrollment) => (
                                <div key={enrollment.id} className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="font-medium text-primary-dark">
                                        {enrollment.automation?.name || 'Unknown Action'}
                                      </p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Status: {enrollment.status} | Step: {enrollment.currentStepIndex + 1}
                                      </p>
                                      {enrollment.nextStepAt && (
                                        <p className="text-sm text-gray-600">
                                          Next step: {formatDate(enrollment.nextStepAt)}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {/* TODO: Process enrollment */}}
                                      className="text-sm text-primary hover:text-primary-dark"
                                    >
                                      Process Now
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Applicable Automations */}
                        <div>
                          <h3 className="text-lg font-medium text-primary-dark mb-3">Applicable Actions</h3>
                          {debugInfo.applicableAutomations.length === 0 ? (
                            <p className="text-gray-500">No applicable actions</p>
                          ) : (
                            <div className="space-y-3">
                              {debugInfo.applicableAutomations.map((automation) => (
                                <div key={automation.id} className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="font-medium text-primary-dark">{automation.name}</p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Trigger: {automation.trigger.type}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Conditions: {automation.conditions.length}
                                      </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      automation.conditionsMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {automation.conditionsMet ? 'Would Trigger' : 'Would Not Trigger'}
                                    </span>
                                  </div>
                                  {!automation.conditionsMet && automation.failedConditions && (
                                    <div className="mt-3 text-sm text-gray-600">
                                      <p className="font-medium">Failed conditions:</p>
                                      <ul className="mt-1 space-y-1">
                                        {automation.failedConditions.map((condition: any, idx: number) => (
                                          <li key={idx} className="ml-4">
                                            • {condition.field} {condition.operator} {condition.value}
                                            <span className="text-gray-500 ml-2">
                                              (actual: {condition.actualValue || 'null'})
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-gray-50 border-t">
                    <button
                      onClick={onClose}
                      className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default AutomationDebugModal;
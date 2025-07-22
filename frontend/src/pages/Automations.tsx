import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Automation } from '../types';
import { automationsAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { 
  PlusIcon, 
  CogIcon, 
  PlayIcon, 
  PauseIcon, 
  TrashIcon, 
  ClockIcon, 
  ChartBarIcon, 
  UserIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAutomations, setExpandedAutomations] = useState<Set<string>>(new Set());
  const [enrolledEntities, setEnrolledEntities] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    setIsLoading(true);
    try {
      const response = await automationsAPI.getAll();
      setAutomations(response.data.automations);
    } catch (error) {
      toast.error('Failed to load automations');
      console.error('Fetch automations error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (automation: Automation) => {
    try {
      await automationsAPI.toggle(automation.id);
      toast.success(`Automation ${automation.isActive ? 'deactivated' : 'activated'}`);
      fetchAutomations();
    } catch (error) {
      toast.error('Failed to toggle automation');
    }
  };

  const handleDelete = async (automation: Automation) => {
    if (!window.confirm('Are you sure you want to delete this automation?')) {
      return;
    }

    try {
      await automationsAPI.delete(automation.id);
      toast.success('Automation deleted');
      fetchAutomations();
    } catch (error) {
      toast.error('Failed to delete automation');
    }
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      'contact_created': 'Contact Created',
      'contact_updated': 'Contact Updated',
      'deal_created': 'Deal Created',
      'deal_updated': 'Deal Updated',
      'deal_stage_changed': 'Deal Stage Changed'
    };
    return labels[trigger] || trigger;
  };

  const getActionsSummary = (actions: any[]) => {
    if (actions.length === 0) return 'No actions';
    if (actions.length === 1) return '1 action';
    return `${actions.length} actions`;
  };

  const toggleEnrollmentView = async (automationId: string) => {
    const newExpanded = new Set(expandedAutomations);
    
    if (newExpanded.has(automationId)) {
      newExpanded.delete(automationId);
    } else {
      newExpanded.add(automationId);
      
      // Fetch enrolled entities if not already loaded
      if (!enrolledEntities[automationId]) {
        try {
          const response = await automationsAPI.getEnrollments(automationId);
          setEnrolledEntities(prev => ({
            ...prev,
            [automationId]: response.data.enrolledEntities
          }));
        } catch (error) {
          console.error('Failed to fetch enrollments:', error);
        }
      }
    }
    
    setExpandedAutomations(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" />
      
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automations</h1>
          <p className="mt-2 text-sm text-gray-700">
            Automate your workflow with powerful rules and actions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={() => navigate('/automations/new')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Simple Automation
          </button>
          <button
            onClick={() => navigate('/automations/workflow/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
          >
            <ArrowsPointingOutIcon className="-ml-1 mr-2 h-5 w-5" />
            Multi-Step Workflow
          </button>
        </div>
      </div>

      <div className="mt-8">
        {automations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No automations</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first automation.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/automations/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Automation
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {automations.map((automation) => (
              <div key={automation.id} className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 p-2 rounded-lg ${
                          automation.isActive ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <BoltIcon className={`h-5 w-5 ${
                            automation.isActive ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {automation.name}
                            {automation.isMultiStep && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                <ArrowsPointingOutIcon className="mr-1 h-3 w-3" />
                                Multi-Step
                              </span>
                            )}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {automation.isMultiStep 
                              ? `When ${getTriggerLabel(automation.trigger.type)} → ${automation.steps?.length || 0} steps`
                              : `When ${getTriggerLabel(automation.trigger.type)} → ${getActionsSummary(automation.actions)}`
                            }
                          </p>
                        </div>
                      </div>
                      {automation.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {automation.description}
                        </p>
                      )}
                      
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <button
                          onClick={() => toggleEnrollmentView(automation.id)}
                          className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title={`${automation.activeEnrollments || 0} currently active`}
                        >
                          <UserIcon className="h-5 w-5 text-blue-600 mr-2" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">
                              {automation.enrolledCount || 0}
                              {automation.activeEnrollments > 0 && (
                                <span className="text-xs text-blue-600 ml-1">
                                  ({automation.activeEnrollments} active)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">total enrolled</p>
                          </div>
                          {automation.activeEnrollments > 0 && (
                            expandedAutomations.has(automation.id) ? (
                              <ChevronUpIcon className="ml-2 h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
                            )
                          )}
                        </button>
                        
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <ChartBarIcon className="h-5 w-5 text-gray-600 mr-2" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{automation.totalExecutions || 0}</p>
                            <p className="text-xs text-gray-500">runs</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center p-3 bg-green-50 rounded-lg">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{automation.successfulExecutions || 0}</p>
                            <p className="text-xs text-gray-500">successful</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                          <CheckCircleIconSolid className="h-5 w-5 text-purple-600 mr-2" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{automation.completedEnrollments || 0}</p>
                            <p className="text-xs text-gray-500">completed</p>
                          </div>
                        </div>
                      </div>
                      
                      {automation.lastExecutedAt && (
                        <div className="mt-3 flex items-center text-xs text-gray-500">
                          <ClockIcon className="mr-1 h-4 w-4" />
                          Last run: {new Date(automation.lastExecutedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(automation)}
                        className={`p-2 rounded-lg border transition-all ${
                          automation.isActive
                            ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
                            : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                        title={automation.isActive ? 'Pause automation' : 'Activate automation'}
                      >
                        {automation.isActive ? (
                          <PauseIcon className="h-5 w-5" />
                        ) : (
                          <PlayIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => navigate(automation.isMultiStep ? `/automations/workflow/${automation.id}` : `/automations/${automation.id}`)}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
                        title="Edit automation"
                      >
                        <CogIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(automation)}
                        className="p-2 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-all"
                        title="Delete automation"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Enrolled Entities */}
                  {expandedAutomations.has(automation.id) && enrolledEntities[automation.id] && (
                    <div className="border-t bg-gray-50 px-6 py-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Enrolled Entities</h4>
                      {enrolledEntities[automation.id].length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No entities currently enrolled</p>
                      ) : (
                        <div className="space-y-3">
                          {enrolledEntities[automation.id].slice(0, 5).map((item: any) => (
                            <div key={item.enrollment.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm">
                              <div className="flex items-center">
                                <div className={`p-2 rounded-lg ${
                                  item.type === 'contact' ? 'bg-blue-100' : 'bg-green-100'
                                }`}>
                                  {item.type === 'contact' ? (
                                    <UserIcon className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">
                                    {item.type === 'contact' 
                                      ? `${item.entity.firstName} ${item.entity.lastName}`
                                      : item.entity.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {item.type === 'contact' && item.entity.email}
                                    {item.type === 'deal' && `$${item.entity.value.toLocaleString()}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Step {item.enrollment.currentStepIndex + 1}
                                </span>
                              </div>
                            </div>
                          ))}
                          {enrolledEntities[automation.id].length > 5 && (
                            <div className="pt-2">
                              <button
                                onClick={() => navigate(`/automations/${automation.id}`)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                View all {enrolledEntities[automation.id].length} enrolled entities →
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default Automations;
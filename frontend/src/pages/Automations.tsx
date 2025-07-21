import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Automation } from '../types';
import { automationsAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, CogIcon, PlayIcon, PauseIcon, TrashIcon, ClockIcon, ChartBarIcon, UserIcon } from '@heroicons/react/24/outline';

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/automations/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Automation
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
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {automations.map((automation) => (
                <li key={automation.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-2 w-2 rounded-full ${
                            automation.isActive ? 'bg-green-400' : 'bg-gray-400'
                          }`} />
                          <p className="ml-3 text-sm font-medium text-gray-900 truncate">
                            {automation.name}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="truncate">
                            When {getTriggerLabel(automation.trigger.type)} → {getActionsSummary(automation.actions)}
                          </span>
                        </div>
                        {automation.description && (
                          <p className="mt-1 text-sm text-gray-500 truncate">
                            {automation.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                          {automation.activeEnrollments > 0 && (
                            <span className="flex items-center text-blue-600">
                              <UserIcon className="mr-1 h-3 w-3" />
                              {automation.activeEnrollments} enrolled
                            </span>
                          )}
                          <span className="flex items-center">
                            <ChartBarIcon className="mr-1 h-3 w-3" />
                            {automation.totalExecutions || 0} runs
                          </span>
                          <span className="flex items-center">
                            <span className="text-green-600">
                              {automation.successfulExecutions || 0} successful
                            </span>
                          </span>
                          {automation.completedEnrollments > 0 && (
                            <span className="flex items-center text-gray-500">
                              {automation.completedEnrollments} completed
                            </span>
                          )}
                          {automation.lastExecutedAt && (
                            <span className="flex items-center">
                              <ClockIcon className="mr-1 h-3 w-3" />
                              Last: {new Date(automation.lastExecutedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(automation)}
                          className={`p-2 rounded-md ${
                            automation.isActive
                              ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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
                          onClick={() => navigate(`/automations/${automation.id}`)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                          title="Edit automation"
                        >
                          <CogIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(automation)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                          title="Delete automation"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Automations;
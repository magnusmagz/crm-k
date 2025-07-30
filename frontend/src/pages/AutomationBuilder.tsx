import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Automation, AutomationTrigger, AutomationCondition, AutomationAction, Stage } from '../types';
import { automationsAPI, stagesAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeftIcon, PlusIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';
import TriggerSelector from '../components/automation/TriggerSelector';
import ConditionBuilder from '../components/automation/ConditionBuilder';
import ActionBuilder from '../components/automation/ActionBuilder';
import EnrollmentView from '../components/automation/EnrollmentView';
import DebugView from '../components/automation/DebugView';

const AutomationBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id !== 'new';
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger>({ type: 'contact_created' });
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showEnrollments, setShowEnrollments] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetchStages();
    if (isEditing) {
      fetchAutomation();
    }
  }, [id]);

  const fetchStages = async () => {
    try {
      const response = await stagesAPI.getAll();
      setStages(response.data.stages);
    } catch (error) {
      console.error('Failed to fetch stages:', error);
    }
  };

  const fetchAutomation = async () => {
    setIsLoading(true);
    try {
      const response = await automationsAPI.getById(id!);
      const automation = response.data.automation;
      setName(automation.name);
      setDescription(automation.description || '');
      setTrigger(automation.trigger);
      setConditions(automation.conditions || []);
      setActions(automation.actions || []);
    } catch (error) {
      toast.error('Failed to load automation');
      navigate('/automations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the automation');
      return;
    }

    if (actions.length === 0) {
      toast.error('Please add at least one action');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        name,
        description,
        trigger,
        conditions,
        actions
      };

      if (isEditing) {
        await automationsAPI.update(id!, data);
        toast.success('Automation updated successfully');
      } else {
        await automationsAPI.create(data);
        toast.success('Automation created successfully');
      }
      navigate('/automations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save automation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!name.trim() || actions.length === 0) {
      toast.error('Please complete the automation before testing');
      return;
    }

    setIsTesting(true);
    try {
      // Save first if new
      if (!isEditing) {
        const response = await automationsAPI.create({
          name,
          description,
          trigger,
          conditions,
          actions
        });
        const newId = response.data.automation.id;
        // Test the newly created automation
        await automationsAPI.test(newId);
        navigate(`/automations/${newId}`);
      } else {
        await automationsAPI.test(id!);
      }
      toast.success('Test completed! Check the execution log.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, {
      field: '',
      operator: 'equals',
      value: '',
      logic: conditions.length > 0 ? 'AND' : undefined
    }]);
  };

  const updateCondition = (index: number, condition: AutomationCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = condition;
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions([...actions, {
      type: 'update_contact_field',
      config: {}
    }]);
  };

  const updateAction = (index: number, action: AutomationAction) => {
    const newActions = [...actions];
    newActions[index] = action;
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <button
          onClick={() => navigate('/automations')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to automations
        </button>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium leading-6 text-primary-dark">
              {isEditing ? 'Edit Automation' : 'Create Automation'}
            </h3>
            {isEditing && (
              <div className="space-x-4">
                <button
                  onClick={() => setShowEnrollments(!showEnrollments)}
                  className="text-sm text-gray-600 hover:text-primary-dark"
                >
                  {showEnrollments ? 'Hide' : 'Show'} Enrollments
                </button>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-sm text-gray-600 hover:text-primary-dark"
                >
                  {showDebug ? 'Hide' : 'Show'} Debug
                </button>
              </div>
            )}
          </div>

          {/* Enrollment View */}
          {showEnrollments && isEditing && (
            <div className="mb-8">
              <EnrollmentView automationId={id!} isActive={true} />
            </div>
          )}

          {/* Debug View */}
          {showDebug && isEditing && (
            <div className="mb-8">
              <DebugView automationId={id!} />
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4 mb-8">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Automation Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary"
                placeholder="e.g., Tag new high-value leads"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary"
                placeholder="What does this automation do?"
              />
            </div>
          </div>

          {/* Trigger */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-primary-dark mb-4">
              When this happens...
            </h4>
            <TriggerSelector
              trigger={trigger}
              onChange={setTrigger}
            />
          </div>

          {/* Conditions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-primary-dark">
                If these conditions are met... (optional)
              </h4>
              <button
                onClick={addCondition}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Condition
              </button>
            </div>
            {conditions.length > 0 && (
              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <ConditionBuilder
                    key={index}
                    condition={condition}
                    onChange={(c) => updateCondition(index, c)}
                    onRemove={() => removeCondition(index)}
                    showLogic={index > 0}
                    triggerType={trigger.type}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-primary-dark">
                Then do this...
              </h4>
              <button
                onClick={addAction}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Action
              </button>
            </div>
            {actions.length === 0 && (
              <p className="text-sm text-gray-500">
                Add at least one action to complete your automation.
              </p>
            )}
            <div className="space-y-3">
              {actions.map((action, index) => (
                <ActionBuilder
                  key={index}
                  action={action}
                  onChange={(a) => updateAction(index, a)}
                  onRemove={() => removeAction(index)}
                  triggerType={trigger.type}
                  stages={stages}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={handleTest}
              disabled={isLoading || isTesting}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {isTesting ? 'Testing...' : 'Test Automation'}
            </button>
            <div className="space-x-3">
              <button
                onClick={() => navigate('/automations')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'} Automation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationBuilder;
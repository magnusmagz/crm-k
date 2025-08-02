import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Automation, AutomationStep, AutomationAction, AutomationCondition } from '../types';
import { automationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import ActionConfig from '../components/workflow/ActionConfig';
import { FormField, FormSelect, FormTextarea } from '../components/ui/FormField';
import ExitCriteriaConfig from '../components/automation/ExitCriteriaConfig';
import {
  PlusIcon,
  TrashIcon,
  BoltIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ArrowsPointingOutIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const WorkflowBuilder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';
  
  const [automation, setAutomation] = useState<Partial<Automation>>({
    name: '',
    description: '',
    trigger: { type: 'contact_created' },
    isMultiStep: true,
    isActive: false,
  });
  
  const [steps, setSteps] = useState<Partial<AutomationStep>[]>([
    {
      stepIndex: 0,
      name: 'Initial Action',
      type: 'action',
      actions: [],
      nextStepIndex: null,
    }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [exitCriteria, setExitCriteria] = useState<any>({});
  const [maxDurationDays, setMaxDurationDays] = useState<number | null>(null);
  const [safetyExitEnabled, setSafetyExitEnabled] = useState(true);

  const handleExitCriteriaChange = (criteria: any) => {
    setExitCriteria(criteria);
  };

  const handleMaxDurationChange = (days: number | null) => {
    setMaxDurationDays(days);
  };

  const handleSafetyExitChange = (enabled: boolean) => {
    setSafetyExitEnabled(enabled);
  };

  useEffect(() => {
    if (isEditing) {
      fetchAutomation();
    }
  }, [id]);

  const fetchAutomation = async () => {
    setIsLoading(true);
    try {
      const response = await automationsAPI.getWithSteps(id!);
      setAutomation(response.data.automation);
      if (response.data.automation.steps && response.data.automation.steps.length > 0) {
        setSteps(response.data.automation.steps);
      }
      setExitCriteria(response.data.automation.exitCriteria || {});
      setMaxDurationDays(response.data.automation.maxDurationDays || null);
      setSafetyExitEnabled(response.data.automation.safetyExitEnabled !== false);
    } catch (error) {
      toast.error('Failed to load automation');
      navigate('/automations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStep = (afterIndex: number, type: AutomationStep['type']) => {
    const newStepIndex = steps.length;
    const newStep: Partial<AutomationStep> = {
      stepIndex: newStepIndex,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      type,
      nextStepIndex: null,
    };

    // Initialize type-specific fields
    switch (type) {
      case 'action':
        newStep.actions = [];
        break;
      case 'delay':
        newStep.delayConfig = { value: 1, unit: 'hours' };
        break;
      case 'condition':
        newStep.conditions = [];
        newStep.branchStepIndices = { true: null, false: null };
        break;
      case 'branch':
        newStep.branchConfig = { branches: [] };
        newStep.branchStepIndices = {};
        break;
    }

    // Update the previous step to point to the new step
    const updatedSteps = [...steps];
    if (afterIndex >= 0 && afterIndex < steps.length) {
      updatedSteps[afterIndex] = {
        ...updatedSteps[afterIndex],
        nextStepIndex: newStepIndex,
      };
    }

    setSteps([...updatedSteps, newStep]);
    const newExpanded = new Set(expandedSteps);
    newExpanded.add(newStepIndex);
    setExpandedSteps(newExpanded);
  };

  const handleDeleteStep = (index: number) => {
    if (steps.length === 1) {
      toast.error('Cannot delete the last step');
      return;
    }

    const stepToDelete = steps[index];
    const updatedSteps = steps.filter((_, i) => i !== index);

    // Update step indices and connections
    updatedSteps.forEach((step, i) => {
      step.stepIndex = i;
      
      // Update nextStepIndex
      if (step.nextStepIndex === stepToDelete.stepIndex) {
        step.nextStepIndex = stepToDelete.nextStepIndex;
      } else if (step.nextStepIndex && step.nextStepIndex > stepToDelete.stepIndex!) {
        step.nextStepIndex--;
      }

      // Update branch indices
      if (step.branchStepIndices) {
        Object.keys(step.branchStepIndices).forEach(branch => {
          const targetIndex = step.branchStepIndices![branch];
          if (targetIndex === stepToDelete.stepIndex) {
            step.branchStepIndices![branch] = stepToDelete.nextStepIndex || null;
          } else if (targetIndex && targetIndex > stepToDelete.stepIndex!) {
            step.branchStepIndices![branch] = targetIndex - 1;
          }
        });
      }
    });

    setSteps(updatedSteps);
  };

  const toggleStepExpansion = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const validateWorkflow = async () => {
    if (!isEditing) {
      // Basic validation for new workflows
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!automation.name) {
        errors.push('Automation name is required');
      }

      steps.forEach((step, index) => {
        if (!step.name) {
          errors.push(`Step ${index} is missing a name`);
        }

        switch (step.type) {
          case 'action':
            if (!step.actions || step.actions.length === 0) {
              errors.push(`Action step ${index} has no actions configured`);
            }
            break;
          case 'delay':
            if (!step.delayConfig || !step.delayConfig.value) {
              errors.push(`Delay step ${index} is missing delay configuration`);
            }
            break;
          case 'condition':
            if (!step.conditions || step.conditions.length === 0) {
              errors.push(`Condition step ${index} has no conditions configured`);
            }
            break;
          case 'branch':
            if (!step.branchConfig || !step.branchConfig.branches || step.branchConfig.branches.length === 0) {
              errors.push(`Branch step ${index} has no branches configured`);
            }
            break;
        }
      });

      setValidationErrors(errors);
      setValidationWarnings(warnings);
      return errors.length === 0;
    }

    // Server-side validation for existing workflows
    try {
      const response = await automationsAPI.validateWorkflow(id!);
      setValidationErrors(response.data.errors);
      setValidationWarnings(response.data.warnings);
      return response.data.valid;
    } catch (error) {
      toast.error('Failed to validate workflow');
      return false;
    }
  };

  const handleSave = async () => {
    const isValid = await validateWorkflow();
    if (!isValid && validationErrors.length > 0) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        ...automation,
        steps,
        exitCriteria,
        maxDurationDays,
        safetyExitEnabled,
      };

      if (isEditing) {
        await automationsAPI.updateMultiStep(id!, data);
        toast.success('Workflow updated successfully');
      } else {
        const response = await automationsAPI.createMultiStep(data);
        toast.success('Workflow created successfully');
        navigate(`/automations/workflow/${response.data.automation.id}`);
      }
    } catch (error) {
      toast.error('Failed to save workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (type: AutomationStep['type']) => {
    switch (type) {
      case 'action':
        return <BoltIcon className="h-5 w-5" />;
      case 'delay':
        return <ClockIcon className="h-5 w-5" />;
      case 'condition':
        return <AdjustmentsHorizontalIcon className="h-5 w-5" />;
      case 'branch':
        return <ArrowsPointingOutIcon className="h-5 w-5" />;
    }
  };

  const getStepColor = (type: AutomationStep['type']) => {
    switch (type) {
      case 'action':
        return 'bg-gray-100 text-primary-dark';
      case 'delay':
        return 'bg-yellow-100 text-yellow-800';
      case 'condition':
        return 'bg-purple-100 text-purple-800';
      case 'branch':
        return 'bg-green-100 text-green-800';
    }
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-dark mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-dark">
              {isEditing ? 'Edit Workflow' : 'Create Multi-Step Workflow'}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Build complex automation workflows with conditions, delays, and branching logic
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={validateWorkflow}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Validate
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="mb-6 space-y-4">
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <XCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {validationWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Warnings</h3>
                  <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                    {validationWarnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workflow Details */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-primary-dark mb-4">Workflow Details</h2>
          <div className="space-y-4">
            <FormField
              label="Workflow Name"
              id="workflow-name"
              name="name"
              value={automation.name || ''}
              onChange={(e) => setAutomation({ ...automation, name: e.target.value })}
              placeholder="e.g., Welcome Email Sequence"
              required
            />
            <FormTextarea
              label="Description"
              id="workflow-description"
              name="description"
              value={automation.description || ''}
              onChange={(e) => setAutomation({ ...automation, description: e.target.value })}
              placeholder="Describe what this workflow does..."
              rows={3}
            />
            <FormSelect
              label="Trigger"
              id="workflow-trigger"
              name="trigger"
              value={automation.trigger?.type || 'contact_created'}
              onChange={(e) => setAutomation({ ...automation, trigger: { type: e.target.value as any } })}
            >
              <option value="contact_created">When Contact is Created</option>
              <option value="contact_updated">When Contact is Updated</option>
              <option value="deal_created">When Deal is Created</option>
              <option value="deal_updated">When Deal is Updated</option>
              <option value="deal_stage_changed">When Deal Stage Changes</option>
            </FormSelect>
          </div>
        </div>
      </div>

      {/* Exit Criteria */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-primary-dark mb-4">Exit Criteria</h2>
          <p className="text-sm text-gray-600 mb-6">
            Define when contacts should automatically exit this workflow
          </p>
          <ExitCriteriaConfig
            exitCriteria={exitCriteria}
            maxDurationDays={maxDurationDays}
            safetyExitEnabled={safetyExitEnabled}
            onChange={(criteria, maxDays, safetyEnabled) => {
              setExitCriteria(criteria);
              setMaxDurationDays(maxDays);
              setSafetyExitEnabled(safetyEnabled);
            }}
          />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-primary-dark">Workflow Steps</h2>
        
        {steps.map((step, index) => (
          <div key={index}>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div
                className={`p-4 cursor-pointer ${getStepColor(step.type!)} bg-opacity-20`}
                onClick={() => toggleStepExpansion(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${getStepColor(step.type!)} bg-opacity-40`}>
                      {getStepIcon(step.type!)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-primary-dark">
                        Step {index + 1}: {step.name}
                      </h3>
                      <p className="text-xs text-gray-500 capitalize">{step.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {index > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStep(index);
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                    {expandedSteps.has(index) ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedSteps.has(index) && (
                <div className="px-4 py-5 border-t border-gray-200">
                  <div className="space-y-4">
                    <FormField
                      label="Step Name"
                      id={`step-name-${index}`}
                      name={`step-name-${index}`}
                      value={step.name || ''}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[index] = { ...step, name: e.target.value };
                        setSteps(updated);
                      }}
                      placeholder="Enter step name"
                    />

                  {/* Step-specific configuration */}
                  {step.type === 'action' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-4">
                        Configure actions to execute in this step
                      </p>
                      <div className="space-y-3">
                        {step.actions?.map((action, actionIndex) => (
                          <ActionConfig
                            key={actionIndex}
                            action={action}
                            entityType={automation.trigger?.type.includes('contact') ? 'contact' : 'deal'}
                            onUpdate={(updatedAction) => {
                              const updated = [...steps];
                              const newActions = [...(step.actions || [])];
                              newActions[actionIndex] = updatedAction as AutomationAction;
                              updated[index] = { ...step, actions: newActions };
                              setSteps(updated);
                            }}
                            onDelete={() => {
                              const updated = [...steps];
                              const newActions = (step.actions || []).filter((_, i) => i !== actionIndex);
                              updated[index] = { ...step, actions: newActions };
                              setSteps(updated);
                            }}
                          />
                        ))}
                      </div>
                      <button 
                        onClick={() => {
                          const updated = [...steps];
                          const newAction: Partial<AutomationAction> = { type: undefined, config: {} };
                          const newActions = [...(step.actions || []), newAction];
                          updated[index] = { ...step, actions: newActions as AutomationAction[] };
                          setSteps(updated);
                        }}
                        className="mt-3 text-sm text-primary hover:text-primary-dark"
                      >
                        + Add Action
                      </button>
                    </div>
                  )}

                  {step.type === 'delay' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delay Duration
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          label="Amount"
                          id={`delay-value-${index}`}
                          name={`delay-value-${index}`}
                          type="number"
                          value={step.delayConfig?.value || 1}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[index] = {
                              ...step,
                              delayConfig: {
                                ...step.delayConfig!,
                                value: parseInt(e.target.value) || 1,
                              },
                            };
                            setSteps(updated);
                          }}
                        />
                        <FormSelect
                          label="Unit"
                          id={`delay-unit-${index}`}
                          name={`delay-unit-${index}`}
                          value={step.delayConfig?.unit || 'hours'}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[index] = {
                              ...step,
                              delayConfig: {
                                ...step.delayConfig!,
                                unit: e.target.value as any,
                              },
                            };
                            setSteps(updated);
                          }}
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </FormSelect>
                      </div>
                    </div>
                  )}

                  {step.type === 'condition' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">
                        Define conditions to determine the workflow path
                      </p>
                      {/* Condition configuration will be added here */}
                      <button className="text-sm text-primary hover:text-primary-dark">
                        + Add Condition
                      </button>
                    </div>
                  )}

                  {step.type === 'branch' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">
                        Create multiple paths based on different conditions
                      </p>
                      {/* Branch configuration will be added here */}
                      <button className="text-sm text-primary hover:text-primary-dark">
                        + Add Branch
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>

            {/* Add Step Button */}
            <div className="flex justify-center -mt-2 mb-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <div className="bg-white px-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAddStep(index, 'action')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Add Action Step"
                      >
                        <BoltIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAddStep(index, 'delay')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Add Delay Step"
                      >
                        <ClockIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAddStep(index, 'condition')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Add Condition Step"
                      >
                        <AdjustmentsHorizontalIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAddStep(index, 'branch')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Add Branch Step"
                      >
                        <ArrowsPointingOutIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* End of Workflow */}
        <div className="bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-500">
          End of Workflow
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
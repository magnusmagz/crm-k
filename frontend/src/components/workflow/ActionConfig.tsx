import React, { useState, useEffect } from 'react';
import { AutomationAction, Stage } from '../../types';
import { automationsAPI, stagesAPI } from '../../services/api';
import { TrashIcon } from '@heroicons/react/24/outline';

interface ActionConfigProps {
  action: Partial<AutomationAction>;
  entityType: 'contact' | 'deal';
  onUpdate: (action: Partial<AutomationAction>) => void;
  onDelete: () => void;
}

const ActionConfig: React.FC<ActionConfigProps> = ({ action, entityType, onUpdate, onDelete }) => {
  const [fields, setFields] = useState<any[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchFields();
    if (entityType === 'deal') {
      fetchStages();
    }
  }, [entityType]);

  const fetchFields = async () => {
    setIsLoading(true);
    try {
      const response = await automationsAPI.getFields(entityType);
      setFields(response.data.fields);
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const response = await stagesAPI.getAll();
      setStages(response.data.stages);
    } catch (error) {
      console.error('Failed to fetch stages:', error);
    }
  };

  const handleTypeChange = (type: AutomationAction['type']) => {
    onUpdate({ 
      type, 
      config: {} 
    });
  };

  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      ...action,
      config: {
        ...action.config,
        [key]: value
      }
    });
  };

  const getActionTypes = () => {
    if (entityType === 'contact') {
      return [
        { value: 'update_contact_field', label: 'Update Contact Field' },
        { value: 'add_contact_tag', label: 'Add Contact Tag' },
        { value: 'update_custom_field', label: 'Update Custom Field' },
      ];
    } else {
      return [
        { value: 'update_deal_field', label: 'Update Deal Field' },
        { value: 'move_deal_to_stage', label: 'Move Deal to Stage' },
        { value: 'update_custom_field', label: 'Update Custom Field' },
      ];
    }
  };

  const renderActionConfig = () => {
    if (!action.type) return null;

    switch (action.type) {
      case 'update_contact_field':
      case 'update_deal_field':
        return (
          <>
            <div>
              <label htmlFor={`field-select-${Math.random()}`} className="block text-sm font-medium text-gray-700">
                Field to Update
              </label>
              <select
                id={`field-select-${Math.random()}`}
                value={action.config?.field || ''}
                onChange={(e) => handleConfigChange('field', e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
              >
                <option value="">Select a field</option>
                {fields.filter(f => !f.isCustom).map((field) => (
                  <option key={field.name} value={field.name}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            {action.config?.field && (
              <div>
                <label htmlFor={`field-value-${Math.random()}`} className="block text-sm font-medium text-gray-700">
                  New Value
                </label>
                <input
                  type="text"
                  id={`field-value-${Math.random()}`}
                  value={action.config?.value || ''}
                  onChange={(e) => handleConfigChange('value', e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
                  placeholder="Enter new value"
                />
              </div>
            )}
          </>
        );

      case 'add_contact_tag':
        return (
          <div>
            <label htmlFor={`tag-input-${Math.random()}`} className="block text-sm font-medium text-gray-700">
              Tag to Add
            </label>
            <input
              type="text"
              id={`tag-input-${Math.random()}`}
              value={action.config?.tag || ''}
              onChange={(e) => handleConfigChange('tag', e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
              placeholder="Enter tag name"
            />
          </div>
        );

      case 'move_deal_to_stage':
        return (
          <div>
            <label htmlFor={`stage-select-${Math.random()}`} className="block text-sm font-medium text-gray-700">
              Move to Stage
            </label>
            <select
              id={`stage-select-${Math.random()}`}
              value={action.config?.stageId || ''}
              onChange={(e) => handleConfigChange('stageId', e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
            >
              <option value="">Select a stage</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'update_custom_field':
        const customFields = fields.filter(f => f.isCustom);
        return (
          <>
            <div>
              <label htmlFor={`custom-field-select-${Math.random()}`} className="block text-sm font-medium text-gray-700">
                Custom Field
              </label>
              <select
                id={`custom-field-select-${Math.random()}`}
                value={action.config?.field || ''}
                onChange={(e) => handleConfigChange('field', e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
              >
                <option value="">Select a custom field</option>
                {customFields.map((field) => (
                  <option key={field.name} value={field.name}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            {action.config?.field && (
              <div>
                <label htmlFor={`custom-field-value-${Math.random()}`} className="block text-sm font-medium text-gray-700">
                  New Value
                </label>
                <input
                  type="text"
                  id={`custom-field-value-${Math.random()}`}
                  value={action.config?.value || ''}
                  onChange={(e) => handleConfigChange('value', e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
                  placeholder="Enter new value"
                />
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-4">
            <div>
              <label htmlFor={`action-type-${Math.random()}`} className="block text-sm font-medium text-gray-700">
                Action Type
              </label>
              <select
                id={`action-type-${Math.random()}`}
                value={action.type || ''}
                onChange={(e) => handleTypeChange(e.target.value as AutomationAction['type'])}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
                disabled={isLoading}
              >
                <option value="">Select an action</option>
                {getActionTypes().map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            {renderActionConfig()}
          </div>
          <button
            onClick={onDelete}
            className="ml-4 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Remove action"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionConfig;
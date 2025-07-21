import React from 'react';
import { AutomationAction, Stage } from '../../types';
import { TrashIcon } from '@heroicons/react/24/outline';

interface ActionBuilderProps {
  action: AutomationAction;
  onChange: (action: AutomationAction) => void;
  onRemove: () => void;
  triggerType: string;
  stages: Stage[];
}

const ActionBuilder: React.FC<ActionBuilderProps> = ({
  action,
  onChange,
  onRemove,
  triggerType,
  stages,
}) => {
  const getActionOptions = () => {
    const contactActions = [
      { value: 'update_contact_field', label: 'Update Contact Field' },
      { value: 'add_contact_tag', label: 'Add Tag to Contact' },
    ];

    const dealActions = [
      { value: 'update_deal_field', label: 'Update Deal Field' },
      { value: 'move_deal_to_stage', label: 'Move Deal to Stage' },
    ];

    if (triggerType.includes('contact')) {
      return contactActions;
    } else if (triggerType.includes('deal')) {
      return [...dealActions, ...contactActions];
    }
    return [];
  };

  const renderActionConfig = () => {
    switch (action.type) {
      case 'update_contact_field':
        return (
          <div className="grid grid-cols-2 gap-3">
            <select
              value={action.config.field || ''}
              onChange={(e) => onChange({
                ...action,
                config: { ...action.config, field: e.target.value }
              })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
            >
              <option value="">Select field</option>
              <option value="firstName">First Name</option>
              <option value="lastName">Last Name</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="company">Company</option>
              <option value="position">Position</option>
            </select>
            <input
              type="text"
              value={action.config.value || ''}
              onChange={(e) => onChange({
                ...action,
                config: { ...action.config, value: e.target.value }
              })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
              placeholder="New value"
            />
          </div>
        );

      case 'add_contact_tag':
        return (
          <input
            type="text"
            value={action.config.tag || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, tag: e.target.value }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
            placeholder="Tag name"
          />
        );

      case 'update_deal_field':
        return (
          <div className="grid grid-cols-2 gap-3">
            <select
              value={action.config.field || ''}
              onChange={(e) => onChange({
                ...action,
                config: { ...action.config, field: e.target.value }
              })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
            >
              <option value="">Select field</option>
              <option value="name">Deal Name</option>
              <option value="value">Deal Value</option>
              <option value="status">Status</option>
            </select>
            {action.config.field === 'status' ? (
              <select
                value={action.config.value || ''}
                onChange={(e) => onChange({
                  ...action,
                  config: { ...action.config, value: e.target.value }
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
              >
                <option value="">Select status</option>
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            ) : (
              <input
                type={action.config.field === 'value' ? 'number' : 'text'}
                value={action.config.value || ''}
                onChange={(e) => onChange({
                  ...action,
                  config: { ...action.config, value: e.target.value }
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
                placeholder="New value"
              />
            )}
          </div>
        );

      case 'move_deal_to_stage':
        return (
          <select
            value={action.config.stageId || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, stageId: e.target.value }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
          >
            <option value="">Select stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  const actionOptions = getActionOptions();

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1 space-y-3">
        <select
          value={action.type}
          onChange={(e) => onChange({
            type: e.target.value as AutomationAction['type'],
            config: {}
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
        >
          <option value="">Select action</option>
          {actionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {action.type && renderActionConfig()}
      </div>

      <button
        onClick={onRemove}
        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ActionBuilder;
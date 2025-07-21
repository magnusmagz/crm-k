import React from 'react';
import { AutomationCondition } from '../../types';
import { TrashIcon } from '@heroicons/react/24/outline';

interface ConditionBuilderProps {
  condition: AutomationCondition;
  onChange: (condition: AutomationCondition) => void;
  onRemove: () => void;
  showLogic: boolean;
  triggerType: string;
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  condition,
  onChange,
  onRemove,
  showLogic,
  triggerType,
}) => {
  const getFieldOptions = () => {
    const baseContactFields = [
      { value: 'firstName', label: 'First Name' },
      { value: 'lastName', label: 'Last Name' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'company', label: 'Company' },
      { value: 'position', label: 'Position' },
      { value: 'tags', label: 'Tags' },
    ];

    const baseDealFields = [
      { value: 'name', label: 'Deal Name' },
      { value: 'value', label: 'Deal Value' },
      { value: 'status', label: 'Deal Status' },
      { value: 'stage', label: 'Stage' },
    ];

    if (triggerType.includes('contact')) {
      return baseContactFields;
    } else if (triggerType.includes('deal')) {
      return baseDealFields;
    }
    return [];
  };

  const getOperatorOptions = () => {
    const field = condition.field;
    
    if (field === 'tags') {
      return [
        { value: 'has_tag', label: 'Has tag' },
        { value: 'not_has_tag', label: 'Does not have tag' },
      ];
    }
    
    if (field === 'value') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Does not equal' },
        { value: 'greater_than', label: 'Greater than' },
        { value: 'less_than', label: 'Less than' },
      ];
    }
    
    return [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Does not equal' },
      { value: 'contains', label: 'Contains' },
      { value: 'not_contains', label: 'Does not contain' },
      { value: 'is_empty', label: 'Is empty' },
      { value: 'is_not_empty', label: 'Is not empty' },
    ];
  };

  const needsValue = () => {
    return !['is_empty', 'is_not_empty'].includes(condition.operator);
  };

  const fieldOptions = getFieldOptions();
  const operatorOptions = getOperatorOptions();

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
      {showLogic && (
        <select
          value={condition.logic || 'AND'}
          onChange={(e) => onChange({ ...condition, logic: e.target.value as 'AND' | 'OR' })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800 text-sm"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}
      
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={condition.field}
          onChange={(e) => onChange({ ...condition, field: e.target.value, operator: 'equals', value: '' })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
        >
          <option value="">Select field</option>
          {fieldOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={condition.operator}
          onChange={(e) => onChange({ ...condition, operator: e.target.value as AutomationCondition['operator'] })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
          disabled={!condition.field}
        >
          <option value="">Select operator</option>
          {operatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {needsValue() && (
          <input
            type={condition.field === 'value' ? 'number' : 'text'}
            value={condition.value || ''}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
            placeholder={condition.field === 'tags' ? 'Tag name' : 'Value'}
            disabled={!condition.operator}
          />
        )}
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

export default ConditionBuilder;
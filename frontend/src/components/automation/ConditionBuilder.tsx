import React, { useState, useEffect } from 'react';
import { AutomationCondition } from '../../types';
import { TrashIcon } from '@heroicons/react/24/outline';
import { automationsAPI } from '../../services/api';

interface ConditionBuilderProps {
  condition: AutomationCondition;
  onChange: (condition: AutomationCondition) => void;
  onRemove: () => void;
  showLogic: boolean;
  triggerType: string;
}

interface Field {
  name: string;
  label: string;
  type: string;
  options?: string[];
  isCustom?: boolean;
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  condition,
  onChange,
  onRemove,
  showLogic,
  triggerType,
}) => {
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  useEffect(() => {
    fetchFields();
  }, [triggerType]);

  const fetchFields = async () => {
    if (!triggerType) return;
    
    let entityType: 'contact' | 'deal' = 'contact';
    if (triggerType.includes('deal')) {
      entityType = 'deal';
    } else if (triggerType.includes('candidate') || triggerType.includes('position') || triggerType.includes('interview')) {
      // For recruiting triggers, we'll use candidate fields
      setFields(getDefaultFields());
      return;
    }
    
    setIsLoadingFields(true);
    
    try {
      const response = await automationsAPI.getFields(entityType);
      setFields(response.data.fields);
    } catch (error) {
      console.error('Failed to fetch fields:', error);
      // Fallback to default fields
      setFields(getDefaultFields());
    } finally {
      setIsLoadingFields(false);
    }
  };

  const getDefaultFields = () => {
    if (triggerType.includes('candidate') || triggerType.includes('interview')) {
      return [
        { name: 'candidate.firstName', label: 'Candidate First Name', type: 'text' },
        { name: 'candidate.lastName', label: 'Candidate Last Name', type: 'text' },
        { name: 'candidate.email', label: 'Candidate Email', type: 'email' },
        { name: 'candidate.phone', label: 'Candidate Phone', type: 'text' },
        { name: 'candidate.skills', label: 'Skills', type: 'array' },
        { name: 'candidate.experienceYears', label: 'Years of Experience', type: 'number' },
        { name: 'candidate.currentEmployer', label: 'Current Employer', type: 'text' },
        { name: 'candidate.currentRole', label: 'Current Role', type: 'text' },
        { name: 'pipeline.status', label: 'Pipeline Status', type: 'select', options: ['active', 'hired', 'passed', 'withdrawn'] },
        { name: 'pipeline.rating', label: 'Candidate Rating', type: 'number' },
        { name: 'position.title', label: 'Position Title', type: 'text' },
        { name: 'position.department', label: 'Department', type: 'text' },
        { name: 'position.location', label: 'Location', type: 'text' },
        { name: 'stage.name', label: 'Stage Name', type: 'text' },
      ];
    } else if (triggerType.includes('position')) {
      return [
        { name: 'position.title', label: 'Position Title', type: 'text' },
        { name: 'position.department', label: 'Department', type: 'text' },
        { name: 'position.location', label: 'Location', type: 'text' },
        { name: 'position.type', label: 'Employment Type', type: 'select', options: ['full-time', 'part-time', 'contract', 'internship'] },
        { name: 'position.remote', label: 'Work Arrangement', type: 'select', options: ['onsite', 'remote', 'hybrid'] },
        { name: 'position.status', label: 'Position Status', type: 'select', options: ['open', 'closed', 'on-hold'] },
      ];
    } else if (triggerType.includes('contact')) {
      return [
        { name: 'firstName', label: 'First Name', type: 'text' },
        { name: 'lastName', label: 'Last Name', type: 'text' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone', type: 'text' },
        { name: 'company', label: 'Company', type: 'text' },
        { name: 'position', label: 'Position', type: 'text' },
        { name: 'tags', label: 'Tags', type: 'array' },
      ];
    } else if (triggerType.includes('deal')) {
      return [
        { name: 'name', label: 'Deal Name', type: 'text' },
        { name: 'value', label: 'Deal Value', type: 'number' },
        { name: 'status', label: 'Deal Status', type: 'select', options: ['open', 'won', 'lost'] },
        { name: 'stageId', label: 'Stage', type: 'select' },
      ];
    }
    return [];
  };

  const getOperatorOptions = () => {
    const selectedField = fields.find(f => f.name === condition.field);
    if (!selectedField) return [];
    
    if (selectedField.type === 'array' || selectedField.name === 'tags') {
      return [
        { value: 'has_tag', label: 'Has tag' },
        { value: 'not_has_tag', label: 'Does not have tag' },
      ];
    }
    
    if (selectedField.type === 'number') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Does not equal' },
        { value: 'greater_than', label: 'Greater than' },
        { value: 'less_than', label: 'Less than' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ];
    }
    
    if (selectedField.type === 'checkbox') {
      return [
        { value: 'equals', label: 'Is checked' },
        { value: 'not_equals', label: 'Is not checked' },
      ];
    }
    
    if (selectedField.type === 'select') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Does not equal' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ];
    }
    
    // Default text operators
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

  const getValueInput = () => {
    const selectedField = fields.find(f => f.name === condition.field);
    if (!selectedField || !needsValue()) return null;

    // For checkbox fields with equals/not_equals operators
    if (selectedField.type === 'checkbox') {
      return (
        <select
          value={condition.value || 'true'}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          disabled={!condition.operator}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    // For select fields with options
    if (selectedField.type === 'select' && selectedField.options) {
      return (
        <select
          value={condition.value || ''}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          disabled={!condition.operator}
        >
          <option value="">Select value</option>
          {selectedField.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    // Default input
    return (
      <input
        type={selectedField.type === 'number' ? 'number' : selectedField.type === 'date' ? 'date' : 'text'}
        value={condition.value || ''}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
        placeholder={selectedField.name === 'tags' ? 'Tag name' : 'Value'}
        disabled={!condition.operator}
      />
    );
  };

  const operatorOptions = getOperatorOptions();

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
      {showLogic && (
        <select
          value={condition.logic || 'AND'}
          onChange={(e) => onChange({ ...condition, logic: e.target.value as 'AND' | 'OR' })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}
      
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={condition.field}
          onChange={(e) => onChange({ ...condition, field: e.target.value, operator: 'equals', value: '' })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          disabled={isLoadingFields}
        >
          <option value="">Select field</option>
          {fields.length > 0 && (
            <>
              <optgroup label="Standard Fields">
                {fields.filter(f => !f.isCustom).map((field) => (
                  <option key={field.name} value={field.name}>
                    {field.label}
                  </option>
                ))}
              </optgroup>
              {fields.some(f => f.isCustom) && (
                <optgroup label="Custom Fields">
                  {fields.filter(f => f.isCustom).map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </>
          )}
        </select>

        <select
          value={condition.operator}
          onChange={(e) => onChange({ ...condition, operator: e.target.value as AutomationCondition['operator'] })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          disabled={!condition.field}
        >
          <option value="">Select operator</option>
          {operatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {getValueInput()}
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
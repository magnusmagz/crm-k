import React, { useState, useEffect } from 'react';
import { AutomationAction, Stage } from '../../types';
import { TrashIcon } from '@heroicons/react/24/outline';
import { automationsAPI } from '../../services/api';

interface ActionBuilderProps {
  action: AutomationAction;
  onChange: (action: AutomationAction) => void;
  onRemove: () => void;
  triggerType: string;
  stages: Stage[];
}

interface Field {
  name: string;
  label: string;
  type: string;
  options?: string[];
  isCustom?: boolean;
}

const ActionBuilder: React.FC<ActionBuilderProps> = ({
  action,
  onChange,
  onRemove,
  triggerType,
  stages,
}) => {
  const [contactFields, setContactFields] = useState<Field[]>([]);
  const [dealFields, setDealFields] = useState<Field[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  useEffect(() => {
    fetchFields();
  }, [triggerType]);

  const fetchFields = async () => {
    setIsLoadingFields(true);
    
    try {
      // Fetch contact fields
      const contactResponse = await automationsAPI.getFields('contact');
      setContactFields(contactResponse.data.fields);
      
      // Fetch deal fields if relevant
      if (triggerType.includes('deal')) {
        const dealResponse = await automationsAPI.getFields('deal');
        setDealFields(dealResponse.data.fields);
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const getActionOptions = () => {
    const contactActions = [
      { value: 'update_contact_field', label: 'Update Contact Field' },
      { value: 'add_contact_tag', label: 'Add Tag to Contact' },
    ];

    const dealActions = [
      { value: 'update_deal_field', label: 'Update Deal Field' },
      { value: 'move_deal_to_stage', label: 'Move Deal to Stage' },
    ];

    const customFieldAction = [
      { value: 'update_custom_field', label: 'Update Custom Field' },
    ];

    if (triggerType.includes('contact')) {
      return [...contactActions, ...customFieldAction];
    } else if (triggerType.includes('deal')) {
      return [...dealActions, ...contactActions, ...customFieldAction];
    }
    return [];
  };

  const getFieldValue = () => {
    const fields = action.type === 'update_contact_field' ? contactFields : dealFields;
    const selectedField = fields.find(f => f.name === action.config.field);
    
    if (!selectedField) {
      return (
        <input
          type="text"
          value={action.config.value || ''}
          onChange={(e) => onChange({
            ...action,
            config: { ...action.config, value: e.target.value }
          })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          placeholder="New value"
        />
      );
    }

    // For select fields
    if (selectedField.type === 'select' && selectedField.options) {
      return (
        <select
          value={action.config.value || ''}
          onChange={(e) => onChange({
            ...action,
            config: { ...action.config, value: e.target.value }
          })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
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

    // For checkbox fields
    if (selectedField.type === 'checkbox') {
      return (
        <select
          value={action.config.value || 'true'}
          onChange={(e) => onChange({
            ...action,
            config: { ...action.config, value: e.target.value }
          })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
        >
          <option value="true">Checked</option>
          <option value="false">Unchecked</option>
        </select>
      );
    }

    // Default input
    return (
      <input
        type={selectedField.type === 'number' ? 'number' : selectedField.type === 'date' ? 'date' : 'text'}
        value={action.config.value || ''}
        onChange={(e) => onChange({
          ...action,
          config: { ...action.config, value: e.target.value }
        })}
        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
        placeholder="New value"
      />
    );
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
                config: { ...action.config, field: e.target.value, value: '' }
              })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              disabled={isLoadingFields}
            >
              <option value="">Select field</option>
              {contactFields.length > 0 && (
                <>
                  <optgroup label="Standard Fields">
                    {contactFields.filter(f => !f.isCustom).map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </optgroup>
                  {contactFields.some(f => f.isCustom) && (
                    <optgroup label="Custom Fields">
                      {contactFields.filter(f => f.isCustom).map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
            {getFieldValue()}
          </div>
        );

      case 'add_contact_tag':
        return (
          <input
            type="text"
            value={action.config.tags || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, tags: e.target.value }
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
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
                config: { ...action.config, field: e.target.value, value: '' }
              })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              disabled={isLoadingFields}
            >
              <option value="">Select field</option>
              {dealFields.length > 0 && (
                <>
                  <optgroup label="Standard Fields">
                    {dealFields.filter(f => !f.isCustom).map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </optgroup>
                  {dealFields.some(f => f.isCustom) && (
                    <optgroup label="Custom Fields">
                      {dealFields.filter(f => f.isCustom).map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
            {getFieldValue()}
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          >
            <option value="">Select stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        );

      case 'update_custom_field':
        const allFields = [...contactFields, ...dealFields].filter(f => f.isCustom);
        const selectedField = allFields.find(f => f.name === action.config.fieldName);
        
        return (
          <div className="space-y-3">
            <select
              value={action.config.entityType || ''}
              onChange={(e) => onChange({
                ...action,
                config: { ...action.config, entityType: e.target.value, fieldName: '', value: '' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="">Select entity type</option>
              <option value="contact">Contact</option>
              {triggerType.includes('deal') && <option value="deal">Deal</option>}
            </select>
            
            {action.config.entityType && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={action.config.fieldName || ''}
                  onChange={(e) => onChange({
                    ...action,
                    config: { ...action.config, fieldName: e.target.value.replace('customFields.', ''), value: '' }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                >
                  <option value="">Select custom field</option>
                  {(action.config.entityType === 'contact' ? contactFields : dealFields)
                    .filter(f => f.isCustom)
                    .map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                </select>
                
                {selectedField && getFieldValue()}
              </div>
            )}
          </div>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
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
import React, { useState } from 'react';
import { CustomField } from '../types';
import { customFieldsAPI, dealCustomFieldsAPI } from '../services/api';
import { XMarkIcon, PlusIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { FormField, FormSelect } from './ui/FormField';

interface CustomFieldFormProps {
  field?: CustomField;
  onSubmit: (field: CustomField) => void;
  onCancel: () => void;
  entityType?: 'contact' | 'deal';
}

const CustomFieldForm: React.FC<CustomFieldFormProps> = ({ field, onSubmit, onCancel, entityType = 'contact' }) => {
  const [formData, setFormData] = useState({
    name: field?.name || '',
    label: field?.label || '',
    type: field?.type || 'text',
    required: field?.required || false,
    options: field?.options || [''],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 1) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Field name is required';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.name)) {
      newErrors.name = 'Field name must contain only letters, numbers, and underscores';
    }
    
    if (!formData.label.trim()) {
      newErrors.label = 'Label is required';
    }
    
    if (formData.type === 'select') {
      const validOptions = formData.options.filter(opt => opt.trim());
      if (validOptions.length === 0) {
        newErrors.options = 'At least one option is required for dropdown fields';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const data = {
        ...formData,
        options: formData.type === 'select' 
          ? formData.options.filter(opt => opt.trim()) 
          : undefined,
      };
      
      const api = entityType === 'deal' ? dealCustomFieldsAPI : customFieldsAPI;
      
      let result;
      if (field) {
        const response = await api.update(field.id, data);
        result = response.data.customField;
      } else {
        const response = await api.create(data);
        result = response.data.customField;
      }
      
      onSubmit(result);
    } catch (error: any) {
      console.error('Failed to save custom field:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to save custom field');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium leading-6 text-primary-dark">
            {field ? 'Edit Custom Field' : 'New Custom Field'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <FormField
              label="Field Label"
              id="label"
              name="label"
              value={formData.label}
              onChange={handleChange}
              placeholder="e.g., Company Size"
              error={errors.label}
              required
            />
            
            <div>
              <FormField
                label="Field Name"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!!field}
                placeholder="e.g., company_size"
                error={errors.name}
                required
              />
              {!field && (
                <p className="mt-1 text-xs text-gray-500">
                  Used internally. Cannot be changed after creation.
                </p>
              )}
            </div>
            
            <div>
              <FormSelect
                label="Field Type"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={!!field}
              >
                <option value="text">Text</option>
                <option value="textarea">Text Area</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="url">URL</option>
              </FormSelect>
              {field && (
                <p className="mt-1 text-xs text-gray-500">
                  Field type cannot be changed after creation.
                </p>
              )}
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="required"
                  name="required"
                  type="checkbox"
                  checked={formData.required}
                  onChange={handleChange}
                  className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded checked:bg-primary checked:border-primary"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="required" className="font-medium text-gray-700">
                  Required field
                </label>
                <p className="text-gray-500">Make this field mandatory for all contacts</p>
              </div>
            </div>
            
            {formData.type === 'select' && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options <span className="text-red-500">*</span>
                </label>
                {errors.options && <p className="mb-2 text-sm text-red-600">{errors.options}</p>}
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                      {formData.options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
                    Add Option
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex items-center justify-end gap-x-6">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : field ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomFieldForm;
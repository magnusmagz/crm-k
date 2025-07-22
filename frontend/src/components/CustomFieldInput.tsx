import React from 'react';
import { CustomField } from '../types';

interface CustomFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

const CustomFieldInput: React.FC<CustomFieldInputProps> = ({ field, value, onChange, error }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (field.type === 'checkbox') {
      onChange((e.target as HTMLInputElement).checked);
    } else if (field.type === 'number') {
      onChange(e.target.value ? Number(e.target.value) : '');
    } else {
      onChange(e.target.value);
    }
  };

  const inputClasses = "mt-1 block w-full px-4 py-3 rounded-md shadow-sm sm:text-sm border-gray-300 focus:border-gray-800 focus:ring-gray-800";

  return (
    <div>
      <label htmlFor={`custom_${field.name}`} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {field.type === 'text' && (
        <input
          id={`custom_${field.name}`}
          name={`custom_${field.name}`}
          type="text"
          value={value || ''}
          onChange={handleChange}
          required={field.required}
          className={inputClasses}
        />
      )}

      {field.type === 'textarea' && (
        <textarea
          id={`custom_${field.name}`}
          name={`custom_${field.name}`}
          value={value || ''}
          onChange={handleChange}
          required={field.required}
          rows={3}
          className={inputClasses}
        />
      )}

      {field.type === 'number' && (
        <input
          id={`custom_${field.name}`}
          name={`custom_${field.name}`}
          type="number"
          value={value || ''}
          onChange={handleChange}
          required={field.required}
          className={inputClasses}
        />
      )}

      {field.type === 'date' && (
        <input
          id={`custom_${field.name}`}
          name={`custom_${field.name}`}
          type="date"
          value={value || ''}
          onChange={handleChange}
          required={field.required}
          className={inputClasses}
        />
      )}

      {field.type === 'select' && (
        <select
          id={`custom_${field.name}`}
          name={`custom_${field.name}`}
          value={value || ''}
          onChange={handleChange}
          required={field.required}
          className={inputClasses}
        >
          <option value="">Select an option</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {field.type === 'checkbox' && (
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id={`custom_${field.name}`}
              name={`custom_${field.name}`}
              type="checkbox"
              checked={value || false}
              onChange={handleChange}
              className="focus:ring-gray-800 h-4 w-4 text-gray-800 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor={`custom_${field.name}`} className="font-medium text-gray-700">
              Check if applicable
            </label>
          </div>
        </div>
      )}

      {field.type === 'url' && (
        <input
          id={`custom_${field.name}`}
          name={`custom_${field.name}`}
          type="url"
          value={value || ''}
          onChange={handleChange}
          required={field.required}
          className={inputClasses}
          placeholder="https://example.com"
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CustomFieldInput;
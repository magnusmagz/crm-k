import React from 'react';

interface FormFieldProps {
  label: string;
  id: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'date' | 'url';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  autoComplete,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`mt-1 block w-full px-4 py-3 border ${
          error ? 'border-red-300' : 'border-gray-300'
        } rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

interface FormSelectProps {
  label: string;
  id: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  required?: boolean;
  error?: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  onBlur,
  required = false,
  error,
  className = '',
  disabled = false,
  children,
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full px-4 py-3 border ${
          error ? 'border-red-300' : 'border-gray-300'
        } rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

interface FormTextareaProps {
  label: string;
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  rows = 3,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        rows={rows}
        disabled={disabled}
        className={`mt-1 block w-full px-4 py-3 border ${
          error ? 'border-red-300' : 'border-gray-300'
        } rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
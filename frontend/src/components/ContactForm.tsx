import React, { useState, useEffect } from 'react';
import { Contact, CustomField } from '../types';
import { contactsAPI, customFieldsAPI } from '../services/api';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ContactFormProps {
  contact?: Contact;
  onSubmit: (contact: Contact) => void;
  onCancel: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ contact, onSubmit, onCancel }) => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    tags: contact?.tags?.join(', ') || '',
    notes: contact?.notes || '',
    customFields: contact?.customFields || {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCustomFields();
  }, []);

  const fetchCustomFields = async () => {
    try {
      const response = await customFieldsAPI.getAll();
      setCustomFields(response.data.customFields);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('custom_')) {
      const fieldName = name.replace('custom_', '');
      const field = customFields.find(f => f.name === fieldName);
      
      let processedValue: any = value;
      if (field?.type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked;
      } else if (field?.type === 'number') {
        processedValue = value ? Number(value) : '';
      }
      
      setFormData(prev => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [fieldName]: processedValue,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    // Validate custom fields
    customFields.forEach(field => {
      const value = formData.customFields[field.name];
      if (field.required && !value) {
        newErrors[`custom_${field.name}`] = `${field.label} is required`;
      }
    });
    
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
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };
      
      let result;
      if (contact) {
        const response = await contactsAPI.update(contact.id, data);
        result = response.data.contact;
      } else {
        const response = await contactsAPI.create(data);
        result = response.data.contact;
      }
      
      onSubmit(result);
    } catch (error: any) {
      console.error('Failed to save contact:', error);
      alert(error.response?.data?.error || 'Failed to save contact');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = formData.customFields[field.name] || '';
    const error = errors[`custom_${field.name}`];
    
    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className="sm:col-span-2">
            <label htmlFor={`custom_${field.name}`} className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={`custom_${field.name}`}
              name={`custom_${field.name}`}
              rows={3}
              value={value}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                error ? 'border-red-300' : 'border-gray-300'
              } focus:border-indigo-500 focus:ring-indigo-500`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
        
      case 'select':
        return (
          <div key={field.id}>
            <label htmlFor={`custom_${field.name}`} className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={`custom_${field.name}`}
              name={`custom_${field.name}`}
              value={value}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                error ? 'border-red-300' : 'border-gray-300'
              } focus:border-indigo-500 focus:ring-indigo-500`}
            >
              <option value="">Select...</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
        
      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id={`custom_${field.name}`}
                name={`custom_${field.name}`}
                type="checkbox"
                checked={value || false}
                onChange={handleChange}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor={`custom_${field.name}`} className="font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
        
      default:
        return (
          <div key={field.id}>
            <label htmlFor={`custom_${field.name}`} className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={`custom_${field.name}`}
              name={`custom_${field.name}`}
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'}
              value={value}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                error ? 'border-red-300' : 'border-gray-300'
              } focus:border-indigo-500 focus:ring-indigo-500`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {contact ? 'Edit Contact' : 'New Contact'}
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
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                id="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                } focus:border-indigo-500 focus:ring-indigo-500`}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                id="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                } focus:border-indigo-500 focus:ring-indigo-500`}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } focus:border-indigo-500 focus:ring-indigo-500`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                id="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="customer, vip, lead"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                name="notes"
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            
            {customFields.length > 0 && (
              <>
                <div className="sm:col-span-2">
                  <h4 className="text-sm font-medium text-gray-900 mt-4">Custom Fields</h4>
                </div>
                {customFields.map(renderCustomField)}
              </>
            )}
          </div>
          
          <div className="mt-6 flex items-center justify-end gap-x-6">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : contact ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;
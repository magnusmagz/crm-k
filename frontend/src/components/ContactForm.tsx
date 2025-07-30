import React, { useState, useEffect } from 'react';
import { Contact, CustomField } from '../types';
import { contactsAPI, customFieldsAPI } from '../services/api';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FormField, FormSelect, FormTextarea } from './ui/FormField';

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
    company: contact?.company || '',
    position: contact?.position || '',
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
              className={`mt-1 block w-full px-4 py-3 border ${
                error ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 text-mobile-sm touch-target`}
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
              className={`mt-1 block w-full px-4 py-3 border ${
                error ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 text-mobile-sm touch-target`}
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
                className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
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
              className={`mt-1 block w-full px-4 py-3 border ${
                error ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 text-mobile-sm touch-target`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
    }
  };

  return (
    <div className="bg-white">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold leading-6 text-primary-dark">
            {contact ? 'Edit Contact' : 'New Contact'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <span className="sr-only">Close</span>
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 px-6 py-5 rounded-lg">
            <h4 className="text-sm font-medium text-primary-dark mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <FormField
                label="First Name"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                required
              />
              
              <FormField
                label="Last Name"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                required
              />
              
              <FormField
                label="Email"
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />
              
              <FormField
                label="Phone"
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
              
              <FormField
                label="Company"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
              
              <FormField
                label="Position"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
              />
            </div>
          </div>
          
          {/* Additional Information */}
          <div className="bg-gray-50 px-6 py-5 rounded-lg">
            <h4 className="text-sm font-medium text-primary-dark mb-4">Additional Information</h4>
            <div className="space-y-6">
              <FormField
                label="Tags (comma-separated)"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="customer, vip, lead"
              />
              
              <FormTextarea
                label="Notes"
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
          
          {customFields.length > 0 && (
            <div className="bg-gray-50 px-6 py-5 rounded-lg">
              <h4 className="text-sm font-medium text-primary-dark mb-4">Custom Fields</h4>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                {customFields.map(renderCustomField)}
              </div>
            </div>
          )}
          
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-end gap-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-primary-dark shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : contact ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;
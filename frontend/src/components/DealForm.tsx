import React, { useState, useEffect } from 'react';
import { Deal, Stage, Contact, CustomField, Company } from '../types';
import { contactsAPI, dealCustomFieldsAPI, companiesAPI } from '../services/api';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CustomFieldInput from './CustomFieldInput';
import { FormField, FormSelect, FormTextarea } from './ui/FormField';

interface DealFormProps {
  deal?: Deal | null;
  stages: Stage[];
  onSubmit: (data: any) => void;
  onClose: () => void;
  defaultContactId?: string;
}

const DealForm: React.FC<DealFormProps> = ({ deal, stages, onSubmit, onClose, defaultContactId }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [formData, setFormData] = useState({
    name: deal?.name || '',
    value: deal?.value ?? '',
    stageId: deal?.stageId || stages[0]?.id || '',
    contactId: deal?.contactId || defaultContactId || '',
    companyId: deal?.companyId || '',
    notes: deal?.notes || '',
    expectedCloseDate: deal?.expectedCloseDate
      ? new Date(deal.expectedCloseDate).toISOString().split('T')[0]
      : '',
    status: deal?.status || 'open',
    customFields: deal?.customFields || {}
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
    fetchCustomFields();
  }, []);


  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.getAll({ limit: 1000 });
      setContacts(response.data.contacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.getAll({ limit: 1000 });
      setCompanies(response.data.companies);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const response = await dealCustomFieldsAPI.getAll();
      setCustomFields(response.data.customFields);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'value' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value
      }
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Deal name is required';
    }
    if (!formData.stageId) {
      newErrors.stageId = 'Stage is required';
    }
    if (formData.value !== '' && formData.value < 0) {
      newErrors.value = 'Value cannot be negative';
    }

    // Validate custom fields
    customFields.forEach(field => {
      const value = formData.customFields[field.name];
      if (field.required && !value) {
        newErrors[`customField_${field.name}`] = `${field.label} is required`;
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
        value: formData.value === '' ? null : formData.value,
        contactId: formData.contactId || null,
        companyId: formData.companyId || null,
        expectedCloseDate: formData.expectedCloseDate || null
      };

      await onSubmit(data);
    } catch (error) {
      console.error('Failed to save deal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-primary-dark">
          {deal ? 'Edit Deal' : 'New Deal'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Deal Name"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700">
              Deal Value
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="value"
                name="value"
                value={formData.value}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`block w-full pl-7 pr-3 py-3 border ${
                  errors.value ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm`}
              />
            </div>
            {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
          </div>

          <FormSelect
            label="Stage"
            id="stageId"
            name="stageId"
            value={formData.stageId}
            onChange={handleChange}
            error={errors.stageId}
            required
          >
            {stages.map(stage => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </FormSelect>
        </div>

        <FormSelect
          label="Associated Contact (Optional)"
          id="contactId"
          name="contactId"
          value={formData.contactId}
          onChange={handleChange}
          error={errors.contactId}
          required
        >
          <option value="">No contact selected</option>
          {contacts.map(contact => (
            <option key={contact.id} value={contact.id}>
              {contact.firstName} {contact.lastName}
              {contact.company && ` - ${contact.company}`}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Associated Company (Optional)"
          id="companyId"
          name="companyId"
          value={formData.companyId}
          onChange={handleChange}
        >
          <option value="">Select a company...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </FormSelect>

        <FormField
          label="Expected Close Date"
          id="expectedCloseDate"
          name="expectedCloseDate"
          type="date"
          value={formData.expectedCloseDate}
          onChange={handleChange}
        />

        {deal && (
          <FormSelect
            label="Status"
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="open">Open</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </FormSelect>
        )}

        <FormTextarea
          label="Notes"
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
        />

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-primary-dark">Additional Information</h4>
            {customFields.map(field => (
              <div key={field.id}>
                <CustomFieldInput
                  field={field}
                  value={formData.customFields[field.name]}
                  onChange={(value) => handleCustomFieldChange(field.name, value)}
                  error={errors[`customField_${field.name}`]}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-mobile pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 btn-mobile bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Saving...' : deal ? 'Update Deal' : 'Create Deal'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-mobile bg-gray-200 text-primary rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default DealForm;
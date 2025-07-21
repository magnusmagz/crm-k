import React, { useState, useEffect } from 'react';
import { Deal, Stage, Contact } from '../types';
import { contactsAPI } from '../services/api';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DealFormProps {
  deal?: Deal | null;
  stages: Stage[];
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const DealForm: React.FC<DealFormProps> = ({ deal, stages, onSubmit, onClose }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState({
    name: deal?.name || '',
    value: deal?.value || 0,
    stageId: deal?.stageId || stages[0]?.id || '',
    contactId: deal?.contactId || '',
    notes: deal?.notes || '',
    expectedCloseDate: deal?.expectedCloseDate 
      ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] 
      : '',
    status: deal?.status || 'open'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.getAll({ limit: 1000 });
      setContacts(response.data.contacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'value' ? parseFloat(value) || 0 : value
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Deal name is required';
    }
    if (!formData.stageId) {
      newErrors.stageId = 'Stage is required';
    }
    if (formData.value < 0) {
      newErrors.value = 'Value cannot be negative';
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
        contactId: formData.contactId || null,
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
        <h3 className="text-lg font-semibold text-gray-900">
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
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Deal Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`mt-1 block w-full px-4 py-3 rounded-md shadow-sm ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            } focus:ring-gray-800 focus:border-gray-800`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

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
                className={`block w-full pl-7 pr-3 py-3 rounded-md ${
                  errors.value ? 'border-red-300' : 'border-gray-300'
                } focus:ring-gray-800 focus:border-gray-800`}
              />
            </div>
            {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
          </div>

          <div>
            <label htmlFor="stageId" className="block text-sm font-medium text-gray-700">
              Stage <span className="text-red-500">*</span>
            </label>
            <select
              id="stageId"
              name="stageId"
              value={formData.stageId}
              onChange={handleChange}
              className={`mt-1 block w-full px-4 py-3 rounded-md shadow-sm ${
                errors.stageId ? 'border-red-300' : 'border-gray-300'
              } focus:ring-gray-800 focus:border-gray-800`}
            >
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            {errors.stageId && <p className="mt-1 text-sm text-red-600">{errors.stageId}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="contactId" className="block text-sm font-medium text-gray-700">
            Associated Contact
          </label>
          <select
            id="contactId"
            name="contactId"
            value={formData.contactId}
            onChange={handleChange}
            className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-gray-800 focus:border-gray-800"
          >
            <option value="">No contact selected</option>
            {contacts.map(contact => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
                {contact.company && ` - ${contact.company}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="expectedCloseDate" className="block text-sm font-medium text-gray-700">
            Expected Close Date
          </label>
          <input
            type="date"
            id="expectedCloseDate"
            name="expectedCloseDate"
            value={formData.expectedCloseDate}
            onChange={handleChange}
            className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-gray-800 focus:border-gray-800"
          />
        </div>

        {deal && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-gray-800 focus:border-gray-800"
            >
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-gray-800 focus:border-gray-800"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : deal ? 'Update Deal' : 'Create Deal'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default DealForm;
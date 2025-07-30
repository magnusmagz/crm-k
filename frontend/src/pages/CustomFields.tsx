import React, { useEffect, useState } from 'react';
import { customFieldsAPI } from '../services/api';
import { CustomField } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import CustomFieldForm from '../components/CustomFieldForm';
import DealCustomFieldsSettings from '../components/DealCustomFieldsSettings';

const CustomFields: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'deals'>('contacts');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  useEffect(() => {
    if (activeTab === 'contacts') {
      fetchCustomFields();
    }
  }, [activeTab]);

  const fetchCustomFields = async () => {
    setIsLoading(true);
    try {
      const response = await customFieldsAPI.getAll();
      setCustomFields(response.data.customFields);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = (field: CustomField) => {
    setCustomFields(prev => [...prev, field]);
    setShowForm(false);
  };

  const handleUpdate = (field: CustomField) => {
    setCustomFields(prev => prev.map(f => f.id === field.id ? field : f));
    setEditingField(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this field? This will remove it from all contacts.')) {
      return;
    }

    try {
      await customFieldsAPI.delete(id);
      setCustomFields(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to delete custom field:', error);
      alert('Failed to delete custom field');
    }
  };

  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Text',
      textarea: 'Text Area',
      number: 'Number',
      date: 'Date',
      select: 'Dropdown',
      checkbox: 'Checkbox',
      url: 'URL',
    };
    return labels[type] || type;
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-primary-dark">Custom Fields</h1>
          <p className="mt-2 text-sm text-gray-700">
            Define custom fields to track additional information for your contacts and deals.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`${
              activeTab === 'contacts'
                ? 'border-gray-800 text-gray-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Contact Fields
          </button>
          <button
            onClick={() => setActiveTab('deals')}
            className={`${
              activeTab === 'deals'
                ? 'border-gray-800 text-gray-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Deal Fields
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'contacts' ? (
          <div>
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-primary-dark">Contact Custom Fields</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add custom fields to capture additional information about your contacts.
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Add field
                </button>
              </div>
            </div>

            {(showForm || editingField) && (
              <div className="mb-6">
                <CustomFieldForm
                  field={editingField || undefined}
                  onSubmit={editingField ? handleUpdate : handleCreate}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingField(null);
                  }}
                />
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      {customFields.length === 0 ? (
                        <div className="text-center py-12">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-primary-dark">No custom fields</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Get started by creating a new custom field.
                          </p>
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-dark sm:pl-6">
                                Label
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                                Field Name
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                                Type
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                                Required
                              </th>
                              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {customFields.map((field) => (
                              <tr key={field.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-dark sm:pl-6">
                                  {field.label}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {field.name}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {getFieldTypeLabel(field.type)}
                                  {field.type === 'select' && field.options && (
                                    <span className="text-xs text-gray-400 block">
                                      {field.options.length} options
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {field.required ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Yes
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-primary">
                                      No
                                    </span>
                                  )}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                  <button
                                    onClick={() => setEditingField(field)}
                                    className="text-primary hover:text-primary-dark mr-4"
                                  >
                                    <PencilIcon className="h-5 w-5" aria-hidden="true" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(field.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <DealCustomFieldsSettings />
        )}
      </div>
    </div>
  );
};

export default CustomFields;
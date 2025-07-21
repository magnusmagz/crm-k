import React, { useState, useEffect } from 'react';
import { dealCustomFieldsAPI } from '../services/api';
import { CustomField } from '../types';
import CustomFieldForm from './CustomFieldForm';
import CustomFieldList from './CustomFieldList';
import toast from 'react-hot-toast';

const DealCustomFieldsSettings: React.FC = () => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  useEffect(() => {
    loadCustomFields();
  }, []);

  const loadCustomFields = async () => {
    try {
      const response = await dealCustomFieldsAPI.getAll();
      setCustomFields(response.data.customFields);
    } catch (error) {
      toast.error('Failed to load custom fields');
      console.error('Load custom fields error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (fieldData: any) => {
    try {
      const response = await dealCustomFieldsAPI.create(fieldData);
      setCustomFields([...customFields, response.data.customField]);
      setShowAddForm(false);
      toast.success('Custom field created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create custom field');
    }
  };

  const handleUpdate = async (id: string, fieldData: any) => {
    try {
      const response = await dealCustomFieldsAPI.update(id, fieldData);
      setCustomFields(customFields.map(f => 
        f.id === id ? response.data.customField : f
      ));
      setEditingField(null);
      toast.success('Custom field updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update custom field');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? This will remove this field from all deals.')) {
      return;
    }

    try {
      await dealCustomFieldsAPI.delete(id);
      setCustomFields(customFields.filter(f => f.id !== id));
      toast.success('Custom field deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete custom field');
    }
  };

  const handleReorder = async (fieldIds: string[]) => {
    try {
      await dealCustomFieldsAPI.reorder(fieldIds);
      // Reorder local state to match
      const reorderedFields = fieldIds.map(id => 
        customFields.find(f => f.id === id)!
      );
      setCustomFields(reorderedFields);
      toast.success('Fields reordered successfully');
    } catch (error: any) {
      toast.error('Failed to reorder fields');
      // Reload to get correct order
      loadCustomFields();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Deal Custom Fields</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add custom fields to capture additional information about your deals.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
          >
            Add Custom Field
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Add Custom Field
            </h3>
            <CustomFieldForm
              onSubmit={handleCreate}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {editingField && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Edit Custom Field
            </h3>
            <CustomFieldForm
              field={editingField}
              onSubmit={(data) => handleUpdate(editingField.id, data)}
              onCancel={() => setEditingField(null)}
            />
          </div>
        </div>
      )}

      <CustomFieldList
        fields={customFields}
        onEdit={setEditingField}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {customFields.length === 0 && !showAddForm && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No custom fields</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first custom field for deals.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
            >
              Add Custom Field
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealCustomFieldsSettings;
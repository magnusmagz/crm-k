import React, { useState, useCallback, useEffect } from 'react';
import { X, Edit3, Plus, Minus, Trash2, Loader, UserPlus } from 'lucide-react';
import { Contact, Deal } from '../types';
import api from '../services/api';

interface BulkOperationsProps {
  entityType: 'contacts' | 'deals';
  selectedItems: Set<string>;
  allItems: (Contact | Deal)[];
  onClearSelection: () => void;
  onRefresh: () => void;
  customFields?: any[];
  stages?: any[];
}

interface BulkUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  notes?: string;
  tags?: string[];
  tagOperation?: 'add' | 'remove' | 'replace';
  customFields?: Record<string, any>;
  clearField?: string;
  // Deal specific fields
  name?: string;
  value?: number;
  status?: string;
  stageId?: string;
  expectedCloseDate?: string;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  entityType,
  selectedItems,
  allItems,
  onClearSelection,
  onRefresh,
  customFields = [],
  stages = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'tags' | 'custom'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateData, setUpdateData] = useState<BulkUpdateData>({});
  const [newTag, setNewTag] = useState('');
  const [tagOperation, setTagOperation] = useState<'add' | 'remove' | 'replace'>('add');

  const selectedCount = selectedItems.size;

  useEffect(() => {
    if (selectedCount === 0) {
      setIsOpen(false);
    }
  }, [selectedCount]);

  const handleBulkUpdate = useCallback(async () => {
    if (selectedCount === 0) return;

    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedItems);
      const updates = { ...updateData };
      
      if (updates.tags && tagOperation) {
        updates.tagOperation = tagOperation;
      }

      const endpoint = entityType === 'contacts' ? '/contacts/bulk-edit' : '/deals/bulk-edit';
      const response = await api.post(endpoint, {
        ids,
        updates
      });

      alert(response.data.message);
      onClearSelection();
      onRefresh();
      setIsOpen(false);
      setUpdateData({});
      setNewTag('');
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to update ${entityType}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItems, updateData, tagOperation, entityType, onClearSelection, onRefresh, selectedCount]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedCount === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedCount} ${entityType}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedItems);
      const endpoint = entityType === 'contacts' ? '/contacts/bulk-delete' : '/deals/bulk-delete';
      const response = await api.post(endpoint, { ids });

      alert(response.data.message);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to delete ${entityType}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItems, entityType, onClearSelection, onRefresh, selectedCount]);

  const handleAddToPool = useCallback(async () => {
    if (selectedCount === 0 || entityType !== 'contacts') return;

    const confirmMessage = `Add ${selectedCount} contact${selectedCount > 1 ? 's' : ''} to the Round Robin assignment pool?\n\nThis will remove their current assignments and make them available for redistribution.`;
    if (!window.confirm(confirmMessage)) return;

    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedItems);
      const response = await api.post('/contacts/bulk-add-to-pool', { 
        ids,
        autoAssign: false // Don't auto-assign, just add to pool
      });

      alert(response.data.message);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add contacts to pool');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItems, selectedCount, onClearSelection, onRefresh]);

  const addTag = () => {
    if (!newTag.trim()) return;
    
    const currentTags = updateData.tags || [];
    if (!currentTags.includes(newTag.trim())) {
      setUpdateData(prev => ({
        ...prev,
        tags: [...currentTags, newTag.trim()]
      }));
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setUpdateData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setUpdateData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setUpdateData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value
      }
    }));
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">
              {selectedCount} {entityType} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-dark disabled:bg-gray-400 flex items-center gap-1"
              >
                <Edit3 className="h-4 w-4" />
                Bulk Edit
              </button>
              {entityType === 'contacts' && (
                <button
                  onClick={handleAddToPool}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-dark disabled:bg-gray-400 flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Add to Pool
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-1"
              >
                {isSubmitting ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
          <button
            onClick={onClearSelection}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isOpen && (
          <div className="border-t pt-4">
            {/* Tab Navigation */}
            <div className="flex mb-4 border-b">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'basic'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Basic Fields
              </button>
              <button
                onClick={() => setActiveTab('tags')}
                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'tags'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Tags
              </button>
              {customFields.length > 0 && (
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`px-3 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'custom'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Custom Fields
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {activeTab === 'basic' && (
                <div className="space-y-3">
                  {entityType === 'contacts' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="First Name"
                          value={updateData.firstName || ''}
                          onChange={(e) => handleFieldChange('firstName', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={updateData.lastName || ''}
                          onChange={(e) => handleFieldChange('lastName', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <input
                        type="email"
                        placeholder="Email"
                        value={updateData.email || ''}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={updateData.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Company"
                          value={updateData.company || ''}
                          onChange={(e) => handleFieldChange('company', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Position"
                          value={updateData.position || ''}
                          onChange={(e) => handleFieldChange('position', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Deal Name"
                        value={updateData.name || ''}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Value"
                          value={updateData.value || ''}
                          onChange={(e) => handleFieldChange('value', parseFloat(e.target.value))}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <select
                          value={updateData.status || ''}
                          onChange={(e) => handleFieldChange('status', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Status...</option>
                          <option value="open">Open</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                      <select
                        value={updateData.stageId || ''}
                        onChange={(e) => handleFieldChange('stageId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Select Stage...</option>
                        {stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        placeholder="Expected Close Date"
                        value={updateData.expectedCloseDate || ''}
                        onChange={(e) => handleFieldChange('expectedCloseDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </>
                  )}
                  <textarea
                    placeholder="Notes"
                    value={updateData.notes || ''}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}

              {activeTab === 'tags' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={tagOperation}
                      onChange={(e) => setTagOperation(e.target.value as 'add' | 'remove' | 'replace')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="add">Add tags</option>
                      <option value="remove">Remove tags</option>
                      <option value="replace">Replace tags</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter tag name"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      onClick={addTag}
                      className="px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {updateData.tags && updateData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {updateData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'custom' && customFields.length > 0 && (
                <div className="space-y-3">
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={updateData.customFields?.[field.name] || ''}
                          onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      )}
                      {field.type === 'number' && (
                        <input
                          type="number"
                          value={updateData.customFields?.[field.name] || ''}
                          onChange={(e) => handleCustomFieldChange(field.name, parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      )}
                      {field.type === 'date' && (
                        <input
                          type="date"
                          value={updateData.customFields?.[field.name] || ''}
                          onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          value={updateData.customFields?.[field.name] || ''}
                          onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((option: string) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                      {field.type === 'checkbox' && (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={updateData.customFields?.[field.name] || false}
                            onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-600">Yes</span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary-dark disabled:bg-gray-400 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Update ${selectedCount} ${entityType}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperations;
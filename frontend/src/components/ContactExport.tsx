import React, { useState, useEffect } from 'react';
import { X, Download, CheckSquare, Square, Loader } from 'lucide-react';
import api from '../services/api';

interface ContactExportProps {
  onClose: () => void;
  searchQuery?: string;
  selectedTags?: string[];
  totalContacts?: number;
}

interface CustomField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

interface FieldOption {
  key: string;
  label: string;
  checked: boolean;
}

const ContactExport: React.FC<ContactExportProps> = ({
  onClose,
  searchQuery,
  selectedTags,
  totalContacts
}) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [standardFields, setStandardFields] = useState<FieldOption[]>([
    { key: 'firstName', label: 'First Name', checked: true },
    { key: 'lastName', label: 'Last Name', checked: true },
    { key: 'email', label: 'Email', checked: true },
    { key: 'phone', label: 'Phone', checked: false },
    { key: 'company', label: 'Company', checked: false },
    { key: 'position', label: 'Position', checked: false },
    { key: 'tags', label: 'Tags', checked: false },
    { key: 'notes', label: 'Notes', checked: false },
    { key: 'createdAt', label: 'Created Date', checked: false },
    { key: 'updatedAt', label: 'Updated Date', checked: false }
  ]);
  const [customFieldOptions, setCustomFieldOptions] = useState<FieldOption[]>([]);

  useEffect(() => {
    fetchCustomFields();
  }, []);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const response = await api.get('/custom-fields?entityType=contact');
      const fields = response.data.fields || [];
      setCustomFields(fields);
      
      // Create field options for custom fields
      const options = fields.map((field: CustomField) => ({
        key: `customFields.${field.name}`,
        label: field.label,
        checked: false
      }));
      setCustomFieldOptions(options);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (fieldKey: string, isCustom: boolean) => {
    if (isCustom) {
      setCustomFieldOptions(prev =>
        prev.map(field =>
          field.key === fieldKey ? { ...field, checked: !field.checked } : field
        )
      );
    } else {
      setStandardFields(prev =>
        prev.map(field =>
          field.key === fieldKey ? { ...field, checked: !field.checked } : field
        )
      );
    }
  };

  const selectAll = () => {
    setStandardFields(prev => prev.map(field => ({ ...field, checked: true })));
    setCustomFieldOptions(prev => prev.map(field => ({ ...field, checked: true })));
  };

  const clearAll = () => {
    setStandardFields(prev => prev.map(field => ({ ...field, checked: false })));
    setCustomFieldOptions(prev => prev.map(field => ({ ...field, checked: false })));
  };

  const getSelectedFields = () => {
    const selected: string[] = [];
    
    // Add standard fields
    standardFields.forEach(field => {
      if (field.checked) {
        selected.push(field.key);
      }
    });
    
    // Add custom fields
    customFieldOptions.forEach(field => {
      if (field.checked) {
        selected.push(field.key);
      }
    });
    
    return selected;
  };

  const handleExport = async () => {
    const selectedFields = getSelectedFields();
    
    if (selectedFields.length === 0) {
      alert('Please select at least one field to export');
      return;
    }

    try {
      setExporting(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('fields', selectedFields.join(','));
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (selectedTags && selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }
      
      // Make the API call
      const response = await api.get(`/contacts/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch ? fileNameMatch[1] : `contacts-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Close the modal after successful export
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export contacts. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = [...standardFields, ...customFieldOptions].filter(f => f.checked).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Export Contacts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Select fields to export ({selectedCount} selected)
                </h3>
                
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={selectAll}
                    className="text-sm text-primary hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={clearAll}
                    className="text-sm text-primary hover:text-blue-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Standard Fields</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {standardFields.map(field => (
                      <label
                        key={field.key}
                        className="flex items-center space-x-2 cursor-pointer hover:text-gray-700"
                      >
                        <button
                          type="button"
                          onClick={() => toggleField(field.key, false)}
                          className="flex-shrink-0"
                        >
                          {field.checked ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm text-gray-700">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {customFieldOptions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Fields</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {customFieldOptions.map(field => (
                        <label
                          key={field.key}
                          className="flex items-center space-x-2 cursor-pointer hover:text-gray-700"
                        >
                          <button
                            type="button"
                            onClick={() => toggleField(field.key, true)}
                            className="flex-shrink-0"
                          >
                            {field.checked ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                          <span className="text-sm text-gray-700">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {(searchQuery || (selectedTags && selectedTags.length > 0)) && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Current Filters</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {searchQuery && (
                      <div>Search: "{searchQuery}"</div>
                    )}
                    {selectedTags && selectedTags.length > 0 && (
                      <div>Tags: {selectedTags.join(', ')}</div>
                    )}
                  </div>
                </div>
              )}

              {totalContacts && totalContacts > 10000 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Note: Export is limited to 10,000 contacts. Your current filters match {totalContacts.toLocaleString()} contacts.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {exporting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactExport;
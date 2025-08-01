import React, { useState, useEffect } from 'react';
import { X, Check, Users, AlertCircle } from 'lucide-react';
import { Contact } from '../types';
import { contactsAPI } from '../services/api';

interface ContactWithStats extends Contact {
  dealCount: number;
}

interface ContactComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: ContactWithStats[];
  onMergeComplete: (mergedContact: ContactWithStats) => void;
}

interface MergeData {
  primaryId: string;
  mergeIds: string[];
  fieldChoices: Record<string, string>; // field -> contactId
}

const ContactComparisonModal: React.FC<ContactComparisonModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onMergeComplete
}) => {
  const [mergeData, setMergeData] = useState<MergeData>({
    primaryId: contacts[0]?.id || '',
    mergeIds: [],
    fieldChoices: {}
  });
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contacts.length > 0) {
      const primary = contacts[0];
      const others = contacts.slice(1);
      
      setMergeData({
        primaryId: primary.id,
        mergeIds: others.map(c => c.id),
        fieldChoices: initializeFieldChoices(contacts)
      });
    }
  }, [contacts]);

  const initializeFieldChoices = (contactList: ContactWithStats[]): Record<string, string> => {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'company', 'position', 'notes'];
    const choices: Record<string, string> = {};
    
    // For each field, pick the contact with the most complete/recent data
    fields.forEach(field => {
      const contactWithValue = contactList.find(c => c[field as keyof Contact] && 
        String(c[field as keyof Contact]).trim() !== '');
      choices[field] = contactWithValue?.id || contactList[0].id;
    });

    // Handle tags - combine all unique tags
    const allTags = new Set<string>();
    contactList.forEach(contact => {
      if (contact.tags) {
        contact.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Use primary contact for tags but we'll merge all unique ones
    choices['tags'] = contactList[0].id;

    return choices;
  };

  const getFieldValue = (contact: ContactWithStats, field: string): string => {
    if (field === 'tags') {
      return contact.tags ? contact.tags.join(', ') : '';
    }
    return String(contact[field as keyof Contact] || '');
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company', 
      position: 'Position',
      notes: 'Notes',
      tags: 'Tags'
    };
    return labels[field] || field;
  };

  const handleFieldChoice = (field: string, contactId: string) => {
    setMergeData(prev => ({
      ...prev,
      fieldChoices: {
        ...prev.fieldChoices,
        [field]: contactId
      }
    }));
  };

  const handlePrimaryChange = (contactId: string) => {
    const otherContacts = contacts.filter(c => c.id !== contactId);
    setMergeData(prev => ({
      ...prev,
      primaryId: contactId,
      mergeIds: otherContacts.map(c => c.id)
    }));
  };

  const handleMerge = async () => {
    setIsMerging(true);
    setError(null);

    try {
      // Build the merged contact data based on field choices
      const primaryContact = contacts.find(c => c.id === mergeData.primaryId)!;
      const mergedData: any = {
        id: primaryContact.id
      };

      // Apply field choices
      Object.entries(mergeData.fieldChoices).forEach(([field, sourceContactId]) => {
        const sourceContact = contacts.find(c => c.id === sourceContactId);
        if (sourceContact) {
          if (field === 'tags') {
            // Combine all unique tags from all contacts
            const allTags = new Set<string>();
            contacts.forEach(contact => {
              if (contact.tags) {
                contact.tags.forEach(tag => allTags.add(tag));
              }
            });
            mergedData.tags = Array.from(allTags);
          } else {
            mergedData[field] = (sourceContact as any)[field];
          }
        }
      });

      // Call the enhanced merge API
      const response = await contactsAPI.mergeWithFieldSelection({
        primaryId: mergeData.primaryId,
        mergeIds: mergeData.mergeIds,
        mergedData
      });

      onMergeComplete(response.data.contact);
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to merge contacts');
    } finally {
      setIsMerging(false);
    }
  };

  const renderFieldComparison = (field: string) => {
    return (
      <div key={field} className="border-b border-gray-200 py-4">
        <div className="font-medium text-gray-900 mb-3">{getFieldLabel(field)}</div>
        <div className="grid grid-cols-1 gap-2">
          {contacts.map((contact) => {
            const value = getFieldValue(contact, field);
            const isSelected = mergeData.fieldChoices[field] === contact.id;
            const isEmpty = !value || value.trim() === '';
            
            return (
              <div
                key={`${field}-${contact.id}`}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${isEmpty ? 'opacity-50' : ''}`}
                onClick={() => handleFieldChoice(field, contact.id)}
              >
                <input
                  type="radio"
                  name={field}
                  checked={isSelected}
                  onChange={() => handleFieldChoice(field, contact.id)}
                  className="h-4 w-4 text-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </span>
                    {contact.id === mergeData.primaryId && (
                      <span className="px-2 py-1 text-xs bg-primary text-white rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isEmpty ? (
                      <span className="italic text-gray-400">No data</span>
                    ) : (
                      <span className="break-words">{value}</span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Compare & Merge Contacts
                  </h3>
                  <p className="text-sm text-gray-500">
                    Choose which data to keep for each field
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Primary Contact Selection */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Primary Contact</h4>
              <p className="text-sm text-gray-600 mb-3">
                Choose which contact will be kept as the primary record (others will be merged into this one)
              </p>
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <label key={contact.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="primary"
                      value={contact.id}
                      checked={mergeData.primaryId === contact.id}
                      onChange={(e) => handlePrimaryChange(e.target.value)}
                      className="h-4 w-4 text-primary"
                    />
                    <div>
                      <div className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contact.email} • {contact.dealCount} deals
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Field Comparisons */}
            <div className="max-h-96 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-4">Field Comparison</h4>
              <div className="space-y-0">
                {['firstName', 'lastName', 'email', 'phone', 'company', 'position', 'notes', 'tags'].map(renderFieldComparison)}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleMerge}
              disabled={isMerging}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isMerging ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Merging...
                </>
              ) : (
                `Merge ${contacts.length} Contacts`
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isMerging}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactComparisonModal;
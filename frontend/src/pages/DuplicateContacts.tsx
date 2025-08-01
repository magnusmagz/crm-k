import React, { useState, useCallback } from 'react';
import { Search, Users, Loader } from 'lucide-react';
import { contactsAPI } from '../services/api';
import { Contact } from '../types';
import useDebounce from '../hooks/useDebounce';
import ContactComparisonModal from '../components/ContactComparisonModal';

interface ContactWithStats extends Contact {
  dealCount: number;
}

const DuplicateContacts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [contacts, setContacts] = useState<ContactWithStats[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const searchDuplicates = useCallback(async () => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setContacts([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const response = await contactsAPI.searchDuplicates(debouncedSearch);
      setContacts(response.data.contacts);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to search contacts');
      setContacts([]);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedSearch]);

  React.useEffect(() => {
    searchDuplicates();
  }, [searchDuplicates]);

  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    
    setSelectedContacts(newSelected);
  };

  const handleMerge = () => {
    if (selectedContacts.size < 2) {
      setError('Please select at least 2 contacts to compare and merge');
      return;
    }

    if (selectedContacts.size > 8) {
      setError('You can only compare up to 8 contacts at once');
      return;
    }

    setError(null);
    setShowComparisonModal(true);
  };

  const handleMergeComplete = (mergedContact: ContactWithStats) => {
    const mergeIds = Array.from(selectedContacts).filter(id => id !== mergedContact.id);
    
    setSuccessMessage(`Successfully merged ${mergeIds.length + 1} contacts`);
    
    // Remove merged contacts from the list and update the primary
    setContacts(contacts.filter(c => !mergeIds.includes(c.id)).map(c => 
      c.id === mergedContact.id ? mergedContact : c
    ));
    
    // Reset selection
    setSelectedContacts(new Set());
    setShowComparisonModal(false);
  };

  const clearSelection = () => {
    setSelectedContacts(new Set());
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find & Merge Duplicates</h1>
        <p className="text-gray-600">Search for potential duplicate contacts and merge them together (up to 8 contacts at once)</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {isSearching && (
            <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 animate-spin" />
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Enter at least 2 characters to search
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* Action Bar */}
      {selectedContacts.size > 0 && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-primary-dark">
              {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
            </span>
            <span className="text-primary text-sm">
              Ready to compare and merge
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Selection
            </button>
            <button
              onClick={handleMerge}
              disabled={selectedContacts.size < 2}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Compare & Merge
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {contacts.length > 0 ? (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`border rounded-lg p-4 transition-all ${
                selectedContacts.has(contact.id)
                  ? 'border-primary bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => toggleContactSelection(contact.id)}
                    className="mt-1 h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {contact.email && (
                        <div>Email: {contact.email}</div>
                      )}
                      {contact.phone && (
                        <div>Phone: {contact.phone}</div>
                      )}
                      {contact.company && (
                        <div>Company: {contact.company}</div>
                      )}
                      <div className="text-gray-500">
                        {contact.dealCount} deal{contact.dealCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery.length >= 2 && !isSearching ? (
        <div className="text-center py-12 text-gray-500">
          No contacts found matching "{searchQuery}"
        </div>
      ) : searchQuery.length < 2 && !isSearching ? (
        <div className="text-center py-12 text-gray-500">
          Start typing to search for duplicate contacts
        </div>
      ) : null}

      {/* Comparison Modal */}
      <ContactComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        contacts={contacts.filter(c => selectedContacts.has(c.id))}
        onMergeComplete={handleMergeComplete}
      />
    </div>
  );
};

export default DuplicateContacts;
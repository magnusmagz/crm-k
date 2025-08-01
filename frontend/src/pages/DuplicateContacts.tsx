import React, { useState, useCallback } from 'react';
import { Search, Users, Check, X, Loader } from 'lucide-react';
import api from '../services/api';
import { Contact } from '../types';
import useDebounce from '../hooks/useDebounce';

interface ContactWithStats extends Contact {
  dealCount: number;
}

const DuplicateContacts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [contacts, setContacts] = useState<ContactWithStats[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [masterId, setMasterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const searchDuplicates = useCallback(async () => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setContacts([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const response = await api.get(`/contacts/duplicates?search=${encodeURIComponent(debouncedSearch)}`);
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
      if (masterId === contactId) {
        setMasterId(null);
      }
    } else {
      newSelected.add(contactId);
    }
    
    setSelectedContacts(newSelected);
  };

  const setMasterContact = (contactId: string) => {
    if (!selectedContacts.has(contactId)) {
      const newSelected = new Set(selectedContacts);
      newSelected.add(contactId);
      setSelectedContacts(newSelected);
    }
    setMasterId(contactId);
  };

  const handleMerge = async () => {
    if (!masterId || selectedContacts.size < 2) {
      setError('Please select at least 2 contacts and choose a master contact');
      return;
    }

    const mergeIds = Array.from(selectedContacts).filter(id => id !== masterId);
    
    if (mergeIds.length === 0) {
      setError('Please select at least one contact to merge into the master');
      return;
    }

    if (!window.confirm(`Are you sure you want to merge ${mergeIds.length} contact(s) into the master contact? This action cannot be undone.`)) {
      return;
    }

    setIsMerging(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post('/contacts/merge', {
        masterId,
        mergeIds
      });

      setSuccessMessage(response.data.message);
      
      // Remove merged contacts from the list
      setContacts(contacts.filter(c => !mergeIds.includes(c.id)));
      
      // Update master contact with new data
      setContacts(contacts.map(c => 
        c.id === masterId ? response.data.contact : c
      ));
      
      // Reset selection
      setSelectedContacts(new Set());
      setMasterId(null);
      
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to merge contacts');
    } finally {
      setIsMerging(false);
    }
  };

  const clearSelection = () => {
    setSelectedContacts(new Set());
    setMasterId(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find & Merge Duplicates</h1>
        <p className="text-gray-600">Search for potential duplicate contacts and merge them together</p>
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
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-blue-700">
              {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
            </span>
            {masterId && (
              <span className="text-blue-600 text-sm">
                Master: {contacts.find(c => c.id === masterId)?.firstName} {contacts.find(c => c.id === masterId)?.lastName}
              </span>
            )}
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
              disabled={!masterId || selectedContacts.size < 2 || isMerging}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isMerging ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Merge Selected
                </>
              )}
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => toggleContactSelection(contact.id)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </h3>
                      {masterId === contact.id && (
                        <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                          Master
                        </span>
                      )}
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
                
                {selectedContacts.has(contact.id) && (
                  <button
                    onClick={() => setMasterContact(contact.id)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      masterId === contact.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {masterId === contact.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      'Set as Master'
                    )}
                  </button>
                )}
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
    </div>
  );
};

export default DuplicateContacts;
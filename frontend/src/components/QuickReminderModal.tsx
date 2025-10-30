import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { remindersAPI, contactsAPI } from '../services/api';

interface QuickReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: 'contact' | 'deal';
  entityId?: string;
  entityName?: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export const QuickReminderModal: React.FC<QuickReminderModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName
}) => {
  const [formData, setFormData] = useState({
    title: entityName ? `Follow up with ${entityName}` : 'Follow up reminder',
    description: '',
    remindAt: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Fetch contacts when modal opens (only if no entity is pre-selected)
  useEffect(() => {
    const fetchContacts = async () => {
      if (isOpen && !entityId) {
        setLoadingContacts(true);
        try {
          const response = await contactsAPI.getAll({ limit: 1000 });
          setContacts(response.data.contacts || []);
        } catch (error) {
          console.error('Failed to fetch contacts:', error);
        } finally {
          setLoadingContacts(false);
        }
      }
    };

    fetchContacts();
  }, [isOpen, entityId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: entityName ? `Follow up with ${entityName}` : 'Follow up reminder',
        description: '',
        remindAt: ''
      });
      setSelectedContactId('');
      setError(null);
    }
  }, [isOpen, entityName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const contactId = e.target.value;
    setSelectedContactId(contactId);

    // Update title if a contact is selected
    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setFormData(prev => ({
          ...prev,
          title: `Follow up with ${contact.firstName} ${contact.lastName}`
        }));
      }
    } else {
      // Reset to default title if no contact selected
      setFormData(prev => ({
        ...prev,
        title: 'Follow up reminder'
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert local datetime to ISO string for proper timezone handling
      const remindAtISO = new Date(formData.remindAt).toISOString();

      const reminderData: any = {
        title: formData.title,
        description: formData.description,
        remindAt: remindAtISO
      };

      // Add entity information if provided via props (from contact detail page)
      if (entityType && entityId && entityName) {
        reminderData.entityType = entityType;
        reminderData.entityId = entityId;
        reminderData.entityName = entityName;
      }
      // Or if a contact was selected from the dropdown
      else if (selectedContactId) {
        const selectedContact = contacts.find(c => c.id === selectedContactId);
        if (selectedContact) {
          reminderData.entityType = 'contact';
          reminderData.entityId = selectedContact.id;
          reminderData.entityName = `${selectedContact.firstName} ${selectedContact.lastName}`;
        }
      }

      await remindersAPI.create(reminderData);

      // Success - close modal and show success message
      onClose();

      // Optional: Show success toast (you can implement a toast system)
      console.log('Reminder created successfully!');

    } catch (error: any) {
      console.error('Failed to create reminder:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  const getQuickTimeOptions = () => {
    const now = new Date();
    const options = [
      { label: 'In 1 hour', value: new Date(now.getTime() + 60 * 60 * 1000) },
      { label: 'Tomorrow 9 AM', value: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0) },
      { label: 'In 1 week', value: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    ];

    return options.map(option => ({
      ...option,
      value: option.value.toISOString().slice(0, 16) // Format for datetime-local input
    }));
  };

  const setQuickTime = (timeValue: string) => {
    setFormData(prev => ({
      ...prev,
      remindAt: timeValue
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-primary-dark">Set Reminder</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Entity info display */}
          {entityName && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Setting reminder for: <span className="font-medium text-primary-dark">{entityName}</span>
              </p>
            </div>
          )}

          {/* Contact Selector - only show if no entity is pre-selected */}
          {!entityId && (
            <div className="mb-4">
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                Link to Contact (Optional)
              </label>
              <select
                id="contact"
                value={selectedContactId}
                onChange={handleContactSelect}
                disabled={loadingContacts}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">No contact (general reminder)</option>
                {loadingContacts ? (
                  <option disabled>Loading contacts...</option>
                ) : (
                  contacts
                    .sort((a, b) => {
                      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                        {contact.email ? ` (${contact.email})` : ''}
                      </option>
                    ))
                )}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Reminder Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Remind At */}
          <div className="mb-4">
            <label htmlFor="remindAt" className="block text-sm font-medium text-gray-700 mb-2">
              Remind me at
            </label>
            <input
              type="datetime-local"
              id="remindAt"
              name="remindAt"
              value={formData.remindAt}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* Quick time buttons */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Quick options:</p>
            <div className="flex flex-wrap gap-2">
              {getQuickTimeOptions().map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setQuickTime(option.value)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
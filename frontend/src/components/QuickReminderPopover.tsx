import React, { useState, Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { BellIcon } from '@heroicons/react/24/outline';
import { remindersAPI } from '../services/api';

interface QuickReminderPopoverProps {
  entityType?: 'contact' | 'deal';
  entityId?: string;
  entityName?: string;
  variant?: 'button' | 'link' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const QuickReminderPopover: React.FC<QuickReminderPopoverProps> = ({
  entityType,
  entityId,
  entityName,
  variant = 'link',
  size = 'sm',
  className = ''
}) => {
  const [formData, setFormData] = useState({
    title: entityName ? `Follow up with ${entityName}` : 'Follow up reminder',
    description: '',
    remindAt: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const reminderData: any = {
        title: formData.title,
        description: formData.description,
        remindAt: formData.remindAt
      };

      if (entityType && entityId && entityName) {
        reminderData.entityType = entityType;
        reminderData.entityId = entityId;
        reminderData.entityName = entityName;
      }

      await remindersAPI.create(reminderData);

      setSuccess(true);
      setTimeout(() => {
        close();
        setSuccess(false);
        setFormData({
          title: entityName ? `Follow up with ${entityName}` : 'Follow up reminder',
          description: '',
          remindAt: ''
        });
      }, 1000);

    } catch (error: any) {
      console.error('Failed to create reminder:', error);
      setError(error.response?.data?.error || 'Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  const getQuickTimeOptions = () => {
    const now = new Date();
    const options = [
      { label: '1 hour', value: new Date(now.getTime() + 60 * 60 * 1000) },
      { label: 'Tomorrow 9 AM', value: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0) },
      { label: '1 week', value: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    ];

    return options.map(option => ({
      ...option,
      value: option.value.toISOString().slice(0, 16)
    }));
  };

  const setQuickTime = (timeValue: string) => {
    setFormData(prev => ({
      ...prev,
      remindAt: timeValue
    }));
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-3 py-2 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-6 w-6';
      default:
        return 'h-4 w-4';
    }
  };

  const renderTrigger = () => {
    switch (variant) {
      case 'link':
        return (
          <Popover.Button
            className={`inline-flex items-center gap-1 text-primary hover:text-primary-dark transition-colors ${getSizeClasses()} ${className}`}
          >
            <BellIcon className={getIconSize()} />
            <span>Set Reminder</span>
          </Popover.Button>
        );

      case 'icon':
        return (
          <Popover.Button
            className={`inline-flex items-center justify-center text-gray-500 hover:text-primary transition-colors ${getSizeClasses()} ${className}`}
            title="Set Reminder"
          >
            <BellIcon className={getIconSize()} />
          </Popover.Button>
        );

      default:
        return (
          <Popover.Button
            className={`inline-flex items-center gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${getSizeClasses()} ${className}`}
          >
            <BellIcon className={getIconSize()} />
            Set Reminder
          </Popover.Button>
        );
    }
  };

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          {renderTrigger()}

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-50 mt-2 right-0 md:left-0 w-screen max-w-[calc(100vw-2rem)] md:max-w-sm">
              <div className="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
                <form onSubmit={(e) => handleSubmit(e, close)} className="p-4">
                  {error && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs text-green-600">✓ Reminder created!</p>
                    </div>
                  )}

                  {entityName && (
                    <div className="mb-3 p-2 bg-gray-50 rounded-md">
                      <p className="text-xs text-gray-600">
                        For: <span className="font-medium text-primary-dark">{entityName}</span>
                      </p>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="title" className="block text-xs font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary touch-target"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="Add notes..."
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="remindAt" className="block text-xs font-medium text-gray-700 mb-1">
                      When
                    </label>
                    <input
                      type="datetime-local"
                      id="remindAt"
                      name="remindAt"
                      value={formData.remindAt}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary touch-target"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Quick select:</p>
                    <div className="flex flex-wrap gap-2">
                      {getQuickTimeOptions().map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setQuickTime(option.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors touch-target"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => close()}
                      className="flex-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors touch-target"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || success}
                      className="flex-1 px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
                    >
                      {loading ? 'Creating...' : success ? 'Created!' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

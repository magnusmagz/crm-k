import React, { useState, useEffect } from 'react';
import { BellIcon, CheckIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import { remindersAPI } from '../services/api';
import { QuickReminderModal } from '../components/QuickReminderModal';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  remindAt: string;
  entityType?: 'contact' | 'deal';
  entityId?: string;
  entityName?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReminderModal, setShowNewReminderModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  useEffect(() => {
    fetchReminders();

    // Simple polling for due reminders (every minute)
    const interval = setInterval(checkDueReminders, 60000);

    // Request notification permission on component mount
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => clearInterval(interval);
  }, [filter]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === 'pending') {
        params.completed = false;
      } else if (filter === 'completed') {
        params.completed = true;
      }

      const response = await remindersAPI.getAll(params);
      setReminders(response.data.reminders || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDueReminders = async () => {
    try {
      console.log('Checking for due reminders...');
      const response = await remindersAPI.checkDue();
      const dueReminders = response.data.reminders || [];
      console.log('Due reminders found:', dueReminders.length, dueReminders);
      console.log('Notification permission:', Notification.permission);

      dueReminders.forEach((reminder: Reminder) => {
        if (Notification.permission === 'granted') {
          console.log('Showing notification for:', reminder.title);
          new Notification(reminder.title, {
            body: reminder.entityName
              ? `Reminder for ${reminder.entityName}`
              : reminder.description || 'You have a reminder due',
            icon: '/favicon.ico',
            tag: reminder.id // Prevents duplicate notifications
          });
        } else {
          console.log('Notification permission not granted:', Notification.permission);
        }
      });

      // Refresh the list if we have due reminders
      if (dueReminders.length > 0 && filter === 'pending') {
        fetchReminders();
      }
    } catch (error) {
      console.error('Failed to check due reminders:', error);
    }
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      await remindersAPI.update(id, { isCompleted: !currentStatus });
      fetchReminders();
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  };

  const deleteReminder = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      await remindersAPI.delete(id);
      fetchReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  };


  const isOverdue = (remindAt: string) => {
    return new Date(remindAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));

    if (Math.abs(diffInMinutes) < 60) {
      if (diffInMinutes > 0) {
        return `in ${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
      } else {
        return `${Math.abs(diffInMinutes)} minute${diffInMinutes !== -1 ? 's' : ''} ago`;
      }
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (Math.abs(diffInHours) < 24) {
      if (diffInHours > 0) {
        return `in ${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
      } else {
        return `${Math.abs(diffInHours)} hour${diffInHours !== -1 ? 's' : ''} ago`;
      }
    }

    // For dates more than 24 hours away, show the actual date
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFilteredReminders = () => {
    return reminders.sort((a, b) => {
      // Sort by due date for pending, completion date for completed
      if (filter === 'completed') {
        return new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime();
      } else {
        return new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Reminders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your follow-up reminders and never miss an important task.
          </p>
        </div>
        <button
          onClick={() => setShowNewReminderModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <BellIcon className="-ml-1 mr-2 h-5 w-5" />
          New Reminder
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['pending', 'completed', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                filter === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab} ({reminders.filter(r =>
                tab === 'all' ? true :
                tab === 'pending' ? !r.isCompleted : r.isCompleted
              ).length})
            </button>
          ))}
        </nav>
      </div>

      {/* Reminders List */}
      <div className="space-y-4">
        {getFilteredReminders().length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No {filter === 'all' ? '' : filter} reminders
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'pending' ? "You're all caught up!" : 'Get started by creating a new reminder.'}
            </p>
          </div>
        ) : (
          getFilteredReminders().map((reminder) => (
            <div
              key={reminder.id}
              className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                reminder.isCompleted ? 'opacity-75' : ''
              } ${
                !reminder.isCompleted && isOverdue(reminder.remindAt) ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <h3 className={`text-lg font-medium ${reminder.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {reminder.title}
                    </h3>
                    {!reminder.isCompleted && isOverdue(reminder.remindAt) && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Overdue
                      </span>
                    )}
                  </div>

                  {reminder.description && (
                    <p className="mt-1 text-sm text-gray-600">{reminder.description}</p>
                  )}

                  <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {reminder.isCompleted ? (
                        <span>Completed {formatDate(reminder.completedAt!)}</span>
                      ) : (
                        <span className={isOverdue(reminder.remindAt) ? 'text-red-600 font-medium' : ''}>
                          {formatDate(reminder.remindAt)}
                        </span>
                      )}
                    </div>

                    {reminder.entityName && (
                      <div className="flex items-center">
                        <span className="text-gray-400">•</span>
                        <span className="ml-1">{reminder.entityName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleComplete(reminder.id, reminder.isCompleted)}
                    className={`p-2 rounded-full transition-colors ${
                      reminder.isCompleted
                        ? 'text-green-600 hover:bg-green-100'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={reminder.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Delete reminder"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Reminder Modal */}
      <QuickReminderModal
        isOpen={showNewReminderModal}
        onClose={() => {
          setShowNewReminderModal(false);
          fetchReminders(); // Refresh list when modal closes
        }}
      />
    </div>
  );
};

export default Reminders;
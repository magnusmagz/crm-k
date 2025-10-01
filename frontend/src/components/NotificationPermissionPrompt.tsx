import React, { useState, useEffect } from 'react';
import { BellIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { pushNotificationService, PushSubscriptionStatus } from '../services/pushNotificationService';

interface NotificationPermissionPromptProps {
  onSubscribed?: () => void;
  onDismiss?: () => void;
  showOnlyIfNeeded?: boolean;
}

export const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  onSubscribed,
  onDismiss,
  showOnlyIfNeeded = true,
}) => {
  const [status, setStatus] = useState<PushSubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const currentStatus = await pushNotificationService.getSubscriptionStatus();
      setStatus(currentStatus);
    } catch (err) {
      console.error('Error checking notification status:', err);
      setError('Failed to check notification status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    setError(null);

    try {
      await pushNotificationService.subscribeToPush();
      await checkStatus(); // Refresh status

      if (onSubscribed) {
        onSubscribed();
      }
    } catch (err: any) {
      console.error('Error enabling notifications:', err);

      // Provide user-friendly error messages
      if (err.message.includes('permission')) {
        setError('Permission denied. Please enable notifications in your device settings.');
      } else if (err.message.includes('not supported')) {
        setError('Push notifications are not supported on this device.');
      } else {
        setError('Failed to enable notifications. Please try again.');
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  // Don't show if loading
  if (isLoading) {
    return null;
  }

  // Don't show if no status
  if (!status) {
    return null;
  }

  // Don't show if already subscribed
  if (showOnlyIfNeeded && status.isSubscribed) {
    return null;
  }

  // Don't show if permission is denied
  if (showOnlyIfNeeded && status.permission === 'denied') {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  // Don't show if not supported
  if (!status.isSupported) {
    return null;
  }

  // Show install PWA message if not in PWA mode
  if (!status.isPWA) {
    return (
      <div className="bg-blue-50 border-l-4 border-gray-200 p-4 mb-6 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <DevicePhoneMobileIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-primary-dark">Install App for Notifications</h3>
            <div className="mt-2 text-sm text-primary-dark">
              <p>
                To receive reminder notifications, please install this app to your home screen.
              </p>
              {pushNotificationService.isIOS() && (
                <div className="mt-2 text-xs">
                  <p className="font-semibold">On iOS:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Tap the Share button in Safari</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" to confirm</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex rounded-md bg-blue-50 p-1.5 text-primary hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-blue-50"
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show permission denied message
  if (status.permission === 'denied') {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">Notifications Blocked</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                You have blocked notifications for this app. To receive reminder notifications, please enable them in your device settings.
              </p>
              {pushNotificationService.isIOS() && (
                <div className="mt-2 text-xs">
                  <p className="font-semibold">On iOS:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to Settings</li>
                    <li>Scroll down and find this app</li>
                    <li>Tap Notifications</li>
                    <li>Enable "Allow Notifications"</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show enable notifications prompt
  return (
    <div className="bg-primary-50 border-l-4 border-primary p-4 mb-6 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <BellIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-primary-dark">Enable Reminder Notifications</h3>
          <div className="mt-2 text-sm text-gray-700">
            <p>
              Get notified when your reminders are due. You'll receive push notifications even when the app is closed.
            </p>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={isSubscribing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubscribing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enabling...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Enable Notifications
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Not now
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
        <div className="ml-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex rounded-md bg-primary-50 p-1.5 text-primary hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-primary-50"
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionPrompt;

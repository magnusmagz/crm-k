import React, { useState, useEffect } from 'react';
import {
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { analyticsAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

interface ContactEngagement {
  contact: {
    id: string;
    email: string;
    name: string;
  };
  summary: {
    totalEmails: number;
    openedEmails: number;
    clickedEmails: number;
    engagementScore: number;
    lastEmailSent: string | null;
    unsubscribed: boolean;
  };
  emails: Array<{
    id: string;
    subject: string;
    status: string;
    sentAt: string;
    engagement: {
      opened: boolean;
      clicked: boolean;
      openCount: number;
      clickCount: number;
    };
    events: Array<{
      type: string;
      occurredAt: string;
    }>;
  }>;
}

interface Props {
  contactId: string;
}

export default function ContactEmailEngagement({ contactId }: Props) {
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<ContactEngagement | null>(null);

  useEffect(() => {
    fetchEngagement();
  }, [contactId]);

  const fetchEngagement = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getContactAnalytics(contactId);
      setEngagement(response.data);
    } catch (error) {
      console.error('Error fetching contact engagement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!engagement) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (email: any) => {
    if (email.engagement.clicked) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Clicked
        </span>
      );
    }
    if (email.engagement.opened) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Opened
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Sent
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Engagement Score Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Email Engagement
          </h3>
          <ChartBarIcon className="h-5 w-5 text-gray-400" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sent</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {engagement.summary.totalEmails}
                </p>
              </div>
              <EnvelopeIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Engagement Score</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {engagement.summary.engagementScore}%
                </p>
              </div>
              <div className="relative">
                <svg className="w-8 h-8">
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${engagement.summary.engagementScore * 0.88} 88`}
                    transform="rotate(-90 16 16)"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Open/Click Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <EyeIcon className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Opened</p>
              <p className="font-semibold">
                {engagement.summary.openedEmails} / {engagement.summary.totalEmails}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <CursorArrowRaysIcon className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Clicked</p>
              <p className="font-semibold">
                {engagement.summary.clickedEmails} / {engagement.summary.totalEmails}
              </p>
            </div>
          </div>
        </div>

        {engagement.summary.unsubscribed && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              This contact has unsubscribed from emails
            </p>
          </div>
        )}
      </div>

      {/* Email History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Email History
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {engagement.emails.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No emails sent to this contact yet
              </p>
            </div>
          ) : (
            engagement.emails.map((email) => (
              <div key={email.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {email.subject}
                      </h4>
                      {getStatusBadge(email)}
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{formatDate(email.sentAt)}</span>
                      </div>
                      {email.engagement.opened && (
                        <div className="flex items-center space-x-1">
                          <EyeIcon className="h-4 w-4 text-blue-500" />
                          <span>{email.engagement.openCount} opens</span>
                        </div>
                      )}
                      {email.engagement.clicked && (
                        <div className="flex items-center space-x-1">
                          <CursorArrowRaysIcon className="h-4 w-4 text-green-500" />
                          <span>{email.engagement.clickCount} clicks</span>
                        </div>
                      )}
                    </div>
                    {email.events.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {email.events.map((event, index) => (
                          <div key={index} className="text-xs text-gray-500 dark:text-gray-400">
                            {event.type === 'open' && '👁 Opened'}
                            {event.type === 'click' && '🖱 Clicked'}
                            {event.type === 'bounce' && '⚠️ Bounced'}
                            {' at '}
                            {formatDate(event.occurredAt)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
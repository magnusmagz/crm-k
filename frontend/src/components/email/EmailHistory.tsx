import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, EnvelopeIcon, EnvelopeOpenIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { emailAPI, EmailRecord } from '../../services/emailAPI';
import { formatDistanceToNow } from 'date-fns';

interface EmailHistoryProps {
  contactId: string;
  refresh?: boolean;
}

const EmailHistory: React.FC<EmailHistoryProps> = ({ contactId, refresh }) => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await emailAPI.getHistory(contactId);
      setEmails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load email history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [contactId, refresh]);

  const toggleExpanded = (emailId: number) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (email: EmailRecord) => {
    if (email.bouncedAt) {
      return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
    }
    if (email.openedAt) {
      return <EnvelopeOpenIcon className="h-5 w-5 text-green-500" />;
    }
    return <EnvelopeIcon className="h-5 w-5 text-gray-500" />;
  };

  const getStatusText = (email: EmailRecord) => {
    if (email.bouncedAt) {
      return 'Bounced';
    }
    if (email.openedAt) {
      return 'Opened';
    }
    return 'Sent';
  };

  const getStatusColor = (email: EmailRecord) => {
    if (email.bouncedAt) {
      return 'text-red-600';
    }
    if (email.openedAt) {
      return 'text-green-600';
    }
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-md">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No emails sent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => {
        const isExpanded = expandedIds.has(email.id);
        
        return (
          <div key={email.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <button
              onClick={() => toggleExpanded(email.id)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="mt-1">
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-gray-900 truncate">
                    {email.subject}
                  </h4>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusIcon(email)}
                    <span className={`text-xs ${getStatusColor(email)}`}>
                      {getStatusText(email)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true })}
                </p>
              </div>
            </button>
            
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-3">
                  <div className="bg-gray-50 rounded-md p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {email.message}
                    </p>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    <p>Sent: {new Date(email.sentAt).toLocaleString()}</p>
                    {email.openedAt && (
                      <p>Opened: {new Date(email.openedAt).toLocaleString()}</p>
                    )}
                    {email.bouncedAt && (
                      <p className="text-red-600">
                        Bounced: {new Date(email.bouncedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EmailHistory;
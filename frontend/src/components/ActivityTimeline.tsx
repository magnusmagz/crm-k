import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  DocumentTextIcon, 
  CurrencyDollarIcon, 
  EnvelopeIcon, 
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeOpenIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface TimelineActivity {
  id: string;
  type: 'note' | 'deal' | 'email' | 'contact';
  subtype?: string;
  title: string;
  description: string;
  preview?: string;
  timestamp: string;
  data: any;
}

interface ActivityTimelineProps {
  contactId: string;
  onRefresh?: () => void;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ contactId, onRefresh }) => {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string[]>(['note', 'deal', 'email', 'contact']);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchActivities();
  }, [contactId, filter, page]);

  const fetchActivities = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/timeline/contact/${contactId}`, {
        params: {
          limit: ITEMS_PER_PAGE,
          offset: page * ITEMS_PER_PAGE,
          types: filter.join(',')
        }
      });
      
      if (page === 0) {
        setActivities(response.data.activities);
      } else {
        setActivities(prev => [...prev, ...response.data.activities]);
      }
      
      setTotal(response.data.total);
      setHasMore(response.data.activities.length === ITEMS_PER_PAGE);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (activity: TimelineActivity) => {
    switch (activity.type) {
      case 'note':
        return <DocumentTextIcon className="h-5 w-5 text-primary" />;
      case 'deal':
        if (activity.subtype === 'won') {
          return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
        } else if (activity.subtype === 'lost') {
          return <XCircleIcon className="h-5 w-5 text-red-600" />;
        }
        return <CurrencyDollarIcon className="h-5 w-5 text-purple-600" />;
      case 'email':
        if (activity.subtype === 'opened') {
          return <EnvelopeOpenIcon className="h-5 w-5 text-orange-600" />;
        } else if (activity.subtype === 'clicked') {
          return <CursorArrowRaysIcon className="h-5 w-5 text-green-600" />;
        }
        return <EnvelopeIcon className="h-5 w-5 text-indigo-600" />;
      case 'contact':
        return <UserIcon className="h-5 w-5 text-gray-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getActivityColor = (activity: TimelineActivity) => {
    switch (activity.type) {
      case 'note':
        return 'bg-blue-50 border-blue-200';
      case 'deal':
        if (activity.subtype === 'won') return 'bg-green-50 border-green-200';
        if (activity.subtype === 'lost') return 'bg-red-50 border-red-200';
        return 'bg-purple-50 border-purple-200';
      case 'email':
        if (activity.subtype === 'opened') return 'bg-orange-50 border-orange-200';
        if (activity.subtype === 'clicked') return 'bg-green-50 border-green-200';
        return 'bg-indigo-50 border-indigo-200';
      case 'contact':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const toggleFilter = (type: string) => {
    setPage(0);
    if (filter.includes(type)) {
      setFilter(filter.filter(f => f !== type));
    } else {
      setFilter([...filter, type]);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-500" />
            Activity Timeline
            {total > 0 && (
              <span className="text-sm text-gray-500 font-normal">
                ({total} activities)
              </span>
            )}
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-primary hover:text-blue-700"
            >
              Refresh
            </button>
          )}
        </div>
        
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleFilter('note')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filter.includes('note')
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => toggleFilter('deal')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filter.includes('deal')
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Deals
          </button>
          <button
            onClick={() => toggleFilter('email')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filter.includes('email')
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Emails
          </button>
          <button
            onClick={() => toggleFilter('contact')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filter.includes('contact')
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Contact Updates
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {error && (
          <div className="text-center py-8 text-red-600">
            {error}
          </div>
        )}

        {!error && activities.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            No activities found
          </div>
        )}

        {!error && activities.length > 0 && (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`relative flex gap-4 p-4 rounded-lg border ${getActivityColor(activity)}`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {activity.description}
                      </p>
                      {activity.preview && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {activity.preview}
                        </p>
                      )}
                    </div>
                    <time className="flex-shrink-0 text-xs text-gray-500">
                      {formatTimestamp(activity.timestamp)}
                    </time>
                  </div>

                  {/* Additional data based on type */}
                  {activity.type === 'deal' && activity.data.stage && (
                    <div className="mt-2">
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: activity.data.stage.color }}
                      >
                        {activity.data.stage.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Load more button */}
            {hasMore && !isLoading && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setPage(page + 1)}
                  className="text-sm text-primary hover:text-blue-700 font-medium"
                >
                  Load more activities
                </button>
              </div>
            )}

            {isLoading && page > 0 && (
              <div className="text-center py-4">
                <div className="inline-flex items-center text-sm text-gray-500">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading more...
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading && page === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-4 p-4 rounded-lg bg-gray-50">
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;
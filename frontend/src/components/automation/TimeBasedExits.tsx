import React from 'react';
import { ClockIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface TimeCondition {
  type: 'time_in_automation' | 'negative_condition' | 'activity_count';
  days?: number;
  count?: number;
  condition?: any;
  description?: string;
}

interface TimeBasedExitsProps {
  conditions: TimeCondition[];
  maxDurationDays?: number | null;
  onChange: (conditions: TimeCondition[], maxDurationDays?: number | null) => void;
  isReadOnly?: boolean;
}

const TimeBasedExits: React.FC<TimeBasedExitsProps> = ({
  conditions,
  maxDurationDays,
  onChange,
  isReadOnly = false
}) => {
  const updateMaxDuration = (value: string) => {
    const days = value ? parseInt(value, 10) : null;
    onChange(conditions, days);
  };

  const addTimeCondition = () => {
    const newCondition: TimeCondition = {
      type: 'time_in_automation',
      days: 30,
      description: 'Exit after 30 days in automation'
    };
    onChange([...conditions, newCondition], maxDurationDays);
  };

  const updateCondition = (index: number, updates: Partial<TimeCondition>) => {
    const updatedConditions = [...conditions];
    updatedConditions[index] = { ...updatedConditions[index], ...updates };
    onChange(updatedConditions, maxDurationDays);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index), maxDurationDays);
  };

  return (
    <div className="space-y-6">
      {/* Maximum Duration */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900">
              Maximum Duration
            </label>
            <p className="text-sm text-gray-500 mt-1 mb-3">
              Automatically exit all contacts after this many days
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={maxDurationDays || ''}
                onChange={(e) => updateMaxDuration(e.target.value)}
                disabled={isReadOnly}
                placeholder="No limit"
                min="1"
                max="365"
                className="w-24 px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <span className="text-sm text-gray-600">days</span>
              {maxDurationDays && (
                <button
                  onClick={() => updateMaxDuration('')}
                  disabled={isReadOnly}
                  className="text-sm text-gray-500 hover:text-gray-700 ml-4"
                >
                  Remove limit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time-Based Conditions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Time-Based Conditions</h4>
            <p className="text-sm text-gray-500 mt-1">
              Exit based on time spent or activity patterns
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={addTimeCondition}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Add Condition
            </button>
          )}
        </div>

        {conditions.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No time-based conditions configured</p>
          </div>
        )}

        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {condition.type === 'time_in_automation' && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Exit after</span>
                      <input
                        type="number"
                        value={condition.days || ''}
                        onChange={(e) => updateCondition(index, { 
                          days: parseInt(e.target.value, 10),
                          description: `Exit after ${e.target.value} days in automation`
                        })}
                        disabled={isReadOnly}
                        min="1"
                        max="365"
                        className="w-20 px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                      <span className="text-sm text-gray-600">days in automation</span>
                    </div>
                  )}

                  {condition.type === 'activity_count' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600">Exit after</span>
                        <input
                          type="number"
                          value={condition.count || ''}
                          onChange={(e) => updateCondition(index, { 
                            count: parseInt(e.target.value, 10) 
                          })}
                          disabled={isReadOnly}
                          min="1"
                          className="w-20 px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                        <span className="text-sm text-gray-600">activities</span>
                      </div>
                    </div>
                  )}

                  {condition.description && (
                    <p className="text-sm text-gray-500 mt-2">{condition.description}</p>
                  )}
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => removeCondition(index)}
                    className="text-gray-400 hover:text-red-600 ml-3"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ClockIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-primary-dark">Time-Based Exit Best Practices</h3>
            <div className="mt-2 text-sm text-gray-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Set reasonable time limits to prevent contacts from being stuck in automations</li>
                <li>Consider your typical sales cycle when setting maximum duration</li>
                <li>Use activity-based exits for engagement-focused workflows</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeBasedExits;
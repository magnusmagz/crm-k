import React from 'react';
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SafetyConfig {
  max_duration_days?: number;
  max_errors?: number;
  exit_on_unsubscribe?: boolean;
  exit_on_bounce?: boolean;
}

interface SafetyExitsProps {
  safetyConfig: SafetyConfig;
  enabled: boolean;
  onChange: (config: SafetyConfig, enabled?: boolean) => void;
  isReadOnly?: boolean;
}

const SafetyExits: React.FC<SafetyExitsProps> = ({
  safetyConfig,
  enabled,
  onChange,
  isReadOnly = false
}) => {
  const updateConfig = (updates: Partial<SafetyConfig>) => {
    onChange({ ...safetyConfig, ...updates });
  };

  const toggleEnabled = () => {
    onChange(safetyConfig, !enabled);
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Safety Exits */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <label className="text-sm font-medium text-gray-900">
                Safety Exits
              </label>
              <p className="text-sm text-gray-500">
                Protect contacts from stuck or problematic automations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleEnabled}
            disabled={isReadOnly}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${enabled ? 'bg-primary' : 'bg-gray-200'}
              ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                transition duration-200 ease-in-out
                ${enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>

      {enabled && (
        <div className="space-y-4">
          {/* Safety Duration */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Safety Net Duration
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Force exit after this many days regardless of other conditions
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={safetyConfig.max_duration_days || ''}
                onChange={(e) => updateConfig({ 
                  max_duration_days: e.target.value ? parseInt(e.target.value, 10) : undefined 
                })}
                disabled={isReadOnly}
                placeholder="90"
                min="1"
                max="365"
                className="w-24 text-sm rounded-md border-gray-300"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
          </div>

          {/* Error Threshold */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Error Threshold
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Exit if automation encounters this many errors
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={safetyConfig.max_errors || ''}
                onChange={(e) => updateConfig({ 
                  max_errors: e.target.value ? parseInt(e.target.value, 10) : undefined 
                })}
                disabled={isReadOnly}
                placeholder="3"
                min="1"
                max="10"
                className="w-24 text-sm rounded-md border-gray-300"
              />
              <span className="text-sm text-gray-600">errors</span>
            </div>
          </div>

          {/* Email Safety */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Email Safety</h4>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={safetyConfig.exit_on_unsubscribe || false}
                  onChange={(e) => updateConfig({ exit_on_unsubscribe: e.target.checked })}
                  disabled={isReadOnly}
                  className="h-4 w-4 text-primary border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Exit when contact unsubscribes from emails
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={safetyConfig.exit_on_bounce || false}
                  onChange={(e) => updateConfig({ exit_on_bounce: e.target.checked })}
                  disabled={isReadOnly}
                  className="h-4 w-4 text-primary border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Exit when email bounces (invalid address)
                </span>
              </label>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Safety Exit Behavior</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Safety exits are designed to prevent contacts from being stuck in broken or 
                    problematic automations. When a safety exit is triggered:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>The contact is immediately removed from the automation</li>
                    <li>The exit reason is logged for troubleshooting</li>
                    <li>No further actions will be executed for that contact</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!enabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Safety exits are disabled</p>
          <p className="text-sm text-gray-500">
            Enable safety exits to protect contacts from problematic automations
          </p>
        </div>
      )}
    </div>
  );
};

export default SafetyExits;
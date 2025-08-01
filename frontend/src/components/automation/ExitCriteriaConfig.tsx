import React, { useState, useEffect } from 'react';
import { 
  ArrowRightOnRectangleIcon, 
  FlagIcon, 
  ClockIcon, 
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import GoalBasedExits from './GoalBasedExits';
import TimeBasedExits from './TimeBasedExits';
import SafetyExits from './SafetyExits';

interface ExitCriteriaConfigProps {
  automationId?: string;
  exitCriteria?: any;
  maxDurationDays?: number | null;
  safetyExitEnabled?: boolean;
  onChange: (exitCriteria: any, maxDurationDays: number | null, safetyExitEnabled: boolean) => void;
  isReadOnly?: boolean;
}

const ExitCriteriaConfig: React.FC<ExitCriteriaConfigProps> = ({
  automationId,
  exitCriteria = {},
  maxDurationDays,
  safetyExitEnabled = true,
  onChange,
  isReadOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<'goals' | 'conditions' | 'safety'>('goals');
  const [localCriteria, setLocalCriteria] = useState(exitCriteria);
  const [localMaxDuration, setLocalMaxDuration] = useState(maxDurationDays);
  const [localSafetyEnabled, setLocalSafetyEnabled] = useState(safetyExitEnabled);

  useEffect(() => {
    setLocalCriteria(exitCriteria);
    setLocalMaxDuration(maxDurationDays);
    setLocalSafetyEnabled(safetyExitEnabled);
  }, [exitCriteria, maxDurationDays, safetyExitEnabled]);

  const handleCriteriaChange = (newCriteria: any) => {
    setLocalCriteria(newCriteria);
    onChange(newCriteria, localMaxDuration || null, localSafetyEnabled);
  };

  const handleMaxDurationChange = (days: number | null) => {
    setLocalMaxDuration(days);
    onChange(localCriteria, days, localSafetyEnabled);
  };

  const handleSafetyToggle = (enabled: boolean) => {
    setLocalSafetyEnabled(enabled);
    onChange(localCriteria, localMaxDuration || null, enabled);
  };

  const tabs = [
    { id: 'goals', label: 'Goal-Based Exits', icon: FlagIcon },
    { id: 'conditions', label: 'Time & Conditions', icon: ClockIcon },
    { id: 'safety', label: 'Safety Exits', icon: ShieldCheckIcon }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center">
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Exit Criteria</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Define when contacts should automatically exit this automation
          </p>
        </div>
        
        {/* Tabs */}
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                disabled={isReadOnly}
              >
                <Icon className={`
                  mr-2 h-5 w-5
                  ${activeTab === tab.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                `} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'goals' && (
          <GoalBasedExits
            goals={localCriteria.goals || []}
            onChange={(goals) => handleCriteriaChange({ ...localCriteria, goals })}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'conditions' && (
          <TimeBasedExits
            conditions={localCriteria.conditions || []}
            maxDurationDays={localMaxDuration}
            onChange={(conditions, maxDays) => {
              handleCriteriaChange({ ...localCriteria, conditions });
              if (maxDays !== undefined) {
                handleMaxDurationChange(maxDays);
              }
            }}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'safety' && (
          <SafetyExits
            safetyConfig={localCriteria.safety || {}}
            enabled={localSafetyEnabled}
            onChange={(safety, enabled) => {
              handleCriteriaChange({ ...localCriteria, safety });
              if (enabled !== undefined) {
                handleSafetyToggle(enabled);
              }
            }}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    </div>
  );
};

export default ExitCriteriaConfig;
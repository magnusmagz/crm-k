import React from 'react';
import { AutomationTrigger } from '../../types';
import { UserIcon, UserPlusIcon, CurrencyDollarIcon, ArrowPathIcon, ChartBarIcon, UserGroupIcon, AcademicCapIcon, CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAppMode } from '../../contexts/AppModeContext';

interface TriggerSelectorProps {
  trigger: AutomationTrigger;
  onChange: (trigger: AutomationTrigger) => void;
}

const TriggerSelector: React.FC<TriggerSelectorProps> = ({ trigger, onChange }) => {
  const { mode } = useAppMode();
  
  const salesTriggers = [
    {
      type: 'contact_created',
      label: 'Contact Created',
      description: 'When a new contact is added',
      icon: UserPlusIcon,
    },
    {
      type: 'contact_updated',
      label: 'Contact Updated',
      description: 'When a contact is modified',
      icon: UserIcon,
    },
    {
      type: 'deal_created',
      label: 'Deal Created',
      description: 'When a new deal is created',
      icon: CurrencyDollarIcon,
    },
    {
      type: 'deal_updated',
      label: 'Deal Updated',
      description: 'When a deal is modified',
      icon: ArrowPathIcon,
    },
    {
      type: 'deal_stage_changed',
      label: 'Deal Stage Changed',
      description: 'When a deal moves to a different stage',
      icon: ChartBarIcon,
    },
  ];
  
  const recruitingTriggers = [
    {
      type: 'candidate_added',
      label: 'Candidate Added',
      description: 'When a candidate applies for a position',
      icon: UserPlusIcon,
    },
    {
      type: 'candidate_updated',
      label: 'Candidate Updated',
      description: 'When candidate information is modified',
      icon: UserIcon,
    },
    {
      type: 'candidate_stage_changed',
      label: 'Candidate Stage Changed',
      description: 'When a candidate moves to a different stage',
      icon: ChartBarIcon,
    },
    {
      type: 'candidate_hired',
      label: 'Candidate Hired',
      description: 'When a candidate is marked as hired',
      icon: CheckCircleIcon,
    },
    {
      type: 'candidate_passed',
      label: 'Candidate Passed',
      description: 'When a candidate is passed on',
      icon: UserGroupIcon,
    },
    {
      type: 'interview_scheduled',
      label: 'Interview Scheduled',
      description: 'When an interview is scheduled',
      icon: CalendarIcon,
    },
    {
      type: 'position_created',
      label: 'Position Created',
      description: 'When a new position is created',
      icon: AcademicCapIcon,
    },
  ];
  
  const triggers = mode === 'recruiting' ? recruitingTriggers : salesTriggers;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {triggers.map((triggerOption) => {
        const Icon = triggerOption.icon;
        const isSelected = trigger.type === triggerOption.type;
        
        return (
          <button
            key={triggerOption.type}
            onClick={() => onChange({ type: triggerOption.type as AutomationTrigger['type'] })}
            className={`relative rounded-lg border p-4 text-left transition-all ${
              isSelected
                ? 'border-primary bg-gray-50 ring-2 ring-primary'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-start">
              <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
              <div className="ml-3">
                <p className={`text-sm font-medium ${isSelected ? 'text-primary-dark' : 'text-gray-700'}`}>
                  {triggerOption.label}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {triggerOption.description}
                </p>
              </div>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TriggerSelector;
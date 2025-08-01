import React from 'react';

// Temporary placeholder component to prevent build errors
interface ExitCriteriaConfigProps {
  automationId?: string;
  exitCriteria?: any;
  maxDurationDays?: number | null;
  safetyExitEnabled?: boolean;
  onChange: (exitCriteria: any, maxDurationDays: number | null, safetyExitEnabled: boolean) => void;
  isReadOnly?: boolean;
}

const ExitCriteriaConfig: React.FC<ExitCriteriaConfigProps> = ({ onChange }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Exit Criteria</h3>
      <p className="text-sm text-gray-600">
        Exit criteria configuration is temporarily disabled during unsubscribe implementation.
      </p>
    </div>
  );
};

export default ExitCriteriaConfig;
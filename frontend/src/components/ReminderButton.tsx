import React, { useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { QuickReminderModal } from './QuickReminderModal';

interface ReminderButtonProps {
  entityType: 'contact' | 'deal';
  entityId: string;
  entityName: string;
  variant?: 'button' | 'link' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ReminderButton: React.FC<ReminderButtonProps> = ({
  entityType,
  entityId,
  entityName,
  variant = 'button',
  size = 'md',
  className = ''
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-3 py-2 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-6 w-6';
      default:
        return 'h-4 w-4';
    }
  };

  const renderButton = () => {
    switch (variant) {
      case 'link':
        return (
          <button
            onClick={handleClick}
            className={`inline-flex items-center gap-1 text-primary hover:text-primary-dark transition-colors ${getSizeClasses()} ${className}`}
          >
            <BellIcon className={getIconSize()} />
            Set Reminder
          </button>
        );

      case 'icon':
        return (
          <button
            onClick={handleClick}
            className={`inline-flex items-center justify-center text-gray-500 hover:text-primary transition-colors ${getSizeClasses()} ${className}`}
            title="Set Reminder"
          >
            <BellIcon className={getIconSize()} />
          </button>
        );

      default:
        return (
          <button
            onClick={handleClick}
            className={`inline-flex items-center gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${getSizeClasses()} ${className}`}
          >
            <BellIcon className={getIconSize()} />
            Set Reminder
          </button>
        );
    }
  };

  return (
    <>
      {renderButton()}
      <QuickReminderModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
      />
    </>
  );
};
import React from 'react';
import { QuickReminderPopover } from './QuickReminderPopover';

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
  return (
    <QuickReminderPopover
      entityType={entityType}
      entityId={entityId}
      entityName={entityName}
      variant={variant}
      size={size}
      className={className}
    />
  );
};
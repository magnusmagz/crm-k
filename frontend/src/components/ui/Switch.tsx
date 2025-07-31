import React from 'react';
import { Switch as HeadlessSwitch } from '@headlessui/react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <HeadlessSwitch
        checked={checked}
        onChange={onChange}
        className={`${
          checked ? 'bg-primary' : 'bg-gray-300'
        } relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
      >
        <span
          className={`${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          } inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out`}
        />
      </HeadlessSwitch>
      {label && <span className="ml-3 text-sm text-gray-700">{label}</span>}
    </div>
  );
};
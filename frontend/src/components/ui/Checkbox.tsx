import React from 'react';
import { CheckIcon } from '@heroicons/react/20/solid';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, className = '' }) => {
  return (
    <label className={`flex items-center cursor-pointer ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`
          w-5 h-5 rounded border-2 transition-all duration-200
          ${checked 
            ? 'bg-primary border-primary' 
            : 'bg-white border-gray-300 hover:border-gray-400'
          }
        `}>
          {checked && (
            <CheckIcon className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
          )}
        </div>
      </div>
      {label && <span className="ml-3 text-sm text-gray-700">{label}</span>}
    </label>
  );
};
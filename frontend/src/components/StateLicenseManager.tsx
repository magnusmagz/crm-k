import React, { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { StateLicense } from '../types';

interface StateLicenseManagerProps {
  licenses: StateLicense[];
  onChange: (licenses: StateLicense[]) => void;
  disabled?: boolean;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

const StateLicenseManager: React.FC<StateLicenseManagerProps> = ({ licenses, onChange, disabled = false }) => {
  const [newState, setNewState] = useState('');
  const [newLicenseNumber, setNewLicenseNumber] = useState('');
  const [error, setError] = useState('');

  const usedStates = licenses.map(l => l.state);
  const availableStates = US_STATES.filter(state => !usedStates.includes(state.code));

  const handleAddLicense = () => {
    setError('');
    
    if (!newState) {
      setError('Please select a state');
      return;
    }
    
    if (!newLicenseNumber.trim()) {
      setError('Please enter a license number');
      return;
    }

    const newLicense: StateLicense = {
      state: newState,
      licenseNumber: newLicenseNumber.trim()
    };

    onChange([...licenses, newLicense]);
    setNewState('');
    setNewLicenseNumber('');
  };

  const handleRemoveLicense = (index: number) => {
    const updatedLicenses = licenses.filter((_, i) => i !== index);
    onChange(updatedLicenses);
  };

  const handleLicenseNumberChange = (index: number, value: string) => {
    const updatedLicenses = licenses.map((license, i) => 
      i === index ? { ...license, licenseNumber: value } : license
    );
    onChange(updatedLicenses);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          State Licenses
        </label>
        
        {licenses.length > 0 && (
          <div className="space-y-2 mb-4">
            {licenses.map((license, index) => (
              <div key={license.state} className="flex items-center gap-2">
                <div className="flex-shrink-0 w-20">
                  <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md">
                    {license.state}
                  </span>
                </div>
                <input
                  type="text"
                  value={license.licenseNumber}
                  onChange={(e) => handleLicenseNumberChange(index, e.target.value)}
                  disabled={disabled}
                  placeholder="License number"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLicense(index)}
                  disabled={disabled}
                  className="inline-flex items-center p-2 text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  aria-label={`Remove ${license.state} license`}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {availableStates.length > 0 && !disabled && (
          <div className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={newState}
                onChange={(e) => {
                  setNewState(e.target.value);
                  setError('');
                }}
                disabled={disabled}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select state</option>
                {availableStates.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newLicenseNumber}
                onChange={(e) => {
                  setNewLicenseNumber(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLicense();
                  }
                }}
                disabled={disabled}
                placeholder="License number (e.g., MLO1234)"
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddLicense}
              disabled={disabled || !newState || !newLicenseNumber}
              className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-300 disabled:cursor-not-allowed"
              aria-label="Add license"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        {licenses.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">No state licenses added yet</p>
        )}

        {availableStates.length === 0 && licenses.length > 0 && (
          <p className="text-sm text-gray-500 mt-2 italic">All states have been added</p>
        )}
      </div>
    </div>
  );
};

export default StateLicenseManager;
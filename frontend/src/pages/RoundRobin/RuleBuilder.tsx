import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { 
  PlusIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserGroupIcon,
  MapPinIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface RuleCondition {
  type: string;
  field: string;
  operator: string;
  value: string;
}

interface AssignmentRule {
  name: string;
  description: string;
  priority: number;
  conditions: {
    contactType: string;
    source: string;
    state: string;
    customConditions: RuleCondition[];
  };
  assignmentMethod: 'round_robin' | 'weighted' | 'availability';
  requireStateMatch: boolean;
  activeHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  officerIds: string[];
}

const RuleBuilder: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rule, setRule] = useState<AssignmentRule>({
    name: '',
    description: '',
    priority: 100,
    conditions: {
      contactType: 'all',
      source: 'all',
      state: 'all',
      customConditions: []
    },
    assignmentMethod: 'round_robin',
    requireStateMatch: false,
    officerIds: []
  });

  const [officers, setOfficers] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Condition type options
  const conditionTypes = [
    { value: 'contact_type', label: 'Contact Type', icon: DocumentTextIcon },
    { value: 'source', label: 'Lead Source', icon: UserGroupIcon },
    { value: 'state', label: 'State', icon: MapPinIcon },
    { value: 'created_time', label: 'Created Time', icon: ClockIcon }
  ];

  // Source options
  const sourceOptions = [
    { value: 'all', label: 'All Sources' },
    { value: 'website', label: 'Website' },
    { value: 'zillow', label: 'Zillow' },
    { value: 'redfin', label: 'Redfin' },
    { value: 'realtor', label: 'Realtor.com' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'google', label: 'Google Ads' },
    { value: 'referral', label: 'Referral' },
    { value: 'other', label: 'Other' }
  ];

  // Contact type options
  const contactTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'lead', label: 'Lead' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'client', label: 'Client' }
  ];

  // State options (simplified for demo)
  const stateOptions = [
    { value: 'all', label: 'All States' },
    { value: 'CA', label: 'California' },
    { value: 'TX', label: 'Texas' },
    { value: 'FL', label: 'Florida' },
    { value: 'NY', label: 'New York' },
    { value: 'AZ', label: 'Arizona' }
  ];

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      const response = await api.get('/round-robin/officers');
      setOfficers(response.data);
    } catch (err) {
      console.error('Failed to fetch officers:', err);
    }
  };

  const addCondition = () => {
    setRule({
      ...rule,
      conditions: {
        ...rule.conditions,
        customConditions: [
          ...rule.conditions.customConditions,
          { type: 'contact_type', field: '', operator: 'equals', value: '' }
        ]
      }
    });
  };

  const removeCondition = (index: number) => {
    const newConditions = [...rule.conditions.customConditions];
    newConditions.splice(index, 1);
    setRule({
      ...rule,
      conditions: {
        ...rule.conditions,
        customConditions: newConditions
      }
    });
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...rule.conditions.customConditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setRule({
      ...rule,
      conditions: {
        ...rule.conditions,
        customConditions: newConditions
      }
    });
  };

  const toggleOfficer = (officerId: string) => {
    if (rule.officerIds.includes(officerId)) {
      setRule({
        ...rule,
        officerIds: rule.officerIds.filter(id => id !== officerId)
      });
    } else {
      setRule({
        ...rule,
        officerIds: [...rule.officerIds, officerId]
      });
    }
  };

  const handleSave = async () => {
    if (!rule.name) {
      setError('Please enter a rule name');
      return;
    }

    if (rule.officerIds.length === 0) {
      setError('Please select at least one officer');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.post('/round-robin/rules', {
        ...rule,
        conditions: {
          contactType: rule.conditions.contactType,
          source: rule.conditions.source,
          state: rule.conditions.state
        }
      });

      navigate('/round-robin/rules');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create rule');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Assignment Rule</h1>
          <p className="mt-2 text-sm text-gray-600">
            Define conditions and select officers for automatic lead assignment
          </p>
        </div>
        <button
          onClick={() => navigate('/round-robin/rules')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Rule Configuration Card */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Rule Configuration</h2>
        
        <div className="space-y-4">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => setRule({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., California Leads Round Robin"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={rule.description}
              onChange={(e) => setRule({ ...rule, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              placeholder="Describe what this rule does..."
            />
          </div>

          {/* Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <input
                type="number"
                value={rule.priority}
                onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="100"
              />
              <p className="text-xs text-gray-500 mt-1">Higher priority rules are evaluated first</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Method
              </label>
              <select
                value={rule.assignmentMethod}
                onChange={(e) => setRule({ ...rule, assignmentMethod: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="round_robin">Round Robin</option>
                <option value="weighted">Weighted Distribution</option>
                <option value="availability">Based on Availability</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Conditions Card */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">When to Apply This Rule</h2>
        
        <div className="space-y-4">
          {/* Basic Conditions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Type
              </label>
              <select
                value={rule.conditions.contactType}
                onChange={(e) => setRule({
                  ...rule,
                  conditions: { ...rule.conditions, contactType: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {contactTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead Source
              </label>
              <select
                value={rule.conditions.source}
                onChange={(e) => setRule({
                  ...rule,
                  conditions: { ...rule.conditions, source: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sourceOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={rule.conditions.state}
                onChange={(e) => setRule({
                  ...rule,
                  conditions: { ...rule.conditions, state: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {stateOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* State Matching */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireStateMatch"
              checked={rule.requireStateMatch}
              onChange={(e) => setRule({ ...rule, requireStateMatch: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary accent-primary"
            />
            <label htmlFor="requireStateMatch" className="ml-2 text-sm text-gray-700">
              Only assign to officers licensed in the contact's state
            </label>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-primary hover:text-primary-dark"
          >
            {showAdvanced ? (
              <ChevronUpIcon className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 mr-1" />
            )}
            Advanced Conditions
          </button>

          {/* Advanced Conditions */}
          {showAdvanced && (
            <div className="border-t pt-4">
              <div className="space-y-3">
                {rule.conditions.customConditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <select
                      value={condition.type}
                      onChange={(e) => updateCondition(index, 'type', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {conditionTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                    </select>
                    
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Value"
                    />
                    
                    <button
                      onClick={() => removeCondition(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={addCondition}
                  className="inline-flex items-center text-sm text-primary hover:text-primary-dark"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Condition
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Officer Selection Card */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Select Officers ({rule.officerIds.length} selected)
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {officers.map(officer => (
            <div
              key={officer.id}
              onClick={() => toggleOfficer(officer.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                rule.officerIds.includes(officer.id)
                  ? 'border-primary bg-primary bg-opacity-5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    rule.officerIds.includes(officer.id) ? 'bg-primary' : 'bg-gray-400'
                  }`}>
                    {(officer.firstName?.[0] || officer.email[0]).toUpperCase()}{(officer.lastName?.[0] || '').toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {officer.firstName && officer.lastName 
                        ? `${officer.firstName} ${officer.lastName}`
                        : officer.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                      States: {officer.licensedStates?.join(', ') || 'None'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={rule.officerIds.includes(officer.id)}
                  onChange={() => {}}
                  className="rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                />
              </div>
            </div>
          ))}
        </div>

        {officers.length === 0 && (
          <p className="text-center text-gray-500 py-4">No officers available</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/round-robin/rules')}
          className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !rule.name || rule.officerIds.length === 0}
          className="px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating Rule...' : 'Create Rule'}
        </button>
      </div>
    </div>
  );
};

export default RuleBuilder;
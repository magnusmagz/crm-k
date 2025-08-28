import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  PlayIcon,
  PauseIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface AssignmentRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: {
    contactType: string;
    source: string;
    state: string;
  };
  assignmentMethod: string;
  requireStateMatch: boolean;
  officer_count: number;
  createdAt: string;
  updatedAt: string;
}

const AssignmentRules: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user && 'isAdmin' in user && user.isAdmin === true;

  useEffect(() => {
    if (isAdmin) {
      fetchRules();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchRules = async () => {
    try {
      const response = await api.get('/round-robin/rules');
      setRules(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load assignment rules');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string) => {
    try {
      await api.put(`/round-robin/rules/${ruleId}/toggle`);
      await fetchRules(); // Refresh the rules list
    } catch (err) {
      console.error('Error toggling rule status:', err);
      setError('Failed to toggle rule status');
    }
  };

  const resetCounters = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to reset the round-robin counters for this rule?')) {
      return;
    }
    
    try {
      await api.post(`/round-robin/rules/${ruleId}/reset`);
      alert('Counters reset successfully');
    } catch (err) {
      console.error('Error resetting counters:', err);
      setError('Failed to reset counters');
    }
  };

  const formatConditions = (conditions: AssignmentRule['conditions']) => {
    const parts = [];
    if (conditions.contactType && conditions.contactType !== 'all') {
      parts.push(`Type: ${conditions.contactType}`);
    }
    if (conditions.source && conditions.source !== 'all') {
      parts.push(`Source: ${conditions.source}`);
    }
    if (conditions.state && conditions.state !== 'all') {
      parts.push(`State: ${conditions.state}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'All contacts';
  };

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need administrator access to manage assignment rules.</p>
          <Link
            to="/round-robin"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assignment Rules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure how leads are automatically assigned to loan officers
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            to="/round-robin"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
          <button
            onClick={() => navigate('/round-robin/rules/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Rules List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {rules.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignment rules</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first assignment rule.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/round-robin/rules/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Rule
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {rules.map((rule) => (
              <li key={rule.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex items-center mr-4">
                        {rule.isActive ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                        )}
                        <span className={`ml-2 text-sm font-medium ${
                          rule.isActive ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                        {rule.description && (
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Priority:</span> {rule.priority}
                      </div>
                      <div>
                        <span className="font-medium">Method:</span> {rule.assignmentMethod.replace('_', ' ')}
                      </div>
                      <div>
                        <span className="font-medium">State Match:</span> {rule.requireStateMatch ? 'Required' : 'Optional'}
                      </div>
                      <div>
                        <span className="font-medium">Conditions:</span> {formatConditions(rule.conditions)}
                      </div>
                      <div>
                        <span className="font-medium">Officers:</span> {rule.officer_count}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span> {new Date(rule.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleRuleStatus(rule.id)}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md ${
                        rule.isActive
                          ? 'text-red-700 bg-red-100 hover:bg-red-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      }`}
                    >
                      {rule.isActive ? (
                        <>
                          <PauseIcon className="h-3 w-3 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-3 w-3 mr-1" />
                          Enable
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => resetCounters(rule.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      title="Reset round-robin counters"
                    >
                      <ArrowPathIcon className="h-3 w-3 mr-1" />
                      Reset
                    </button>
                    <button
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      disabled
                      title="Edit functionality coming soon"
                    >
                      <PencilIcon className="h-3 w-3 mr-1" />
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AssignmentRules;
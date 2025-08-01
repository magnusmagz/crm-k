import React, { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Goal {
  id?: string;
  type: 'field_value' | 'tag_applied' | 'deal_value' | 'custom_field';
  field?: string;
  operator?: string;
  value?: any;
  tags?: string[];
  match?: 'any' | 'all';
  fieldName?: string;
  description?: string;
}

interface GoalBasedExitsProps {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
  isReadOnly?: boolean;
}

const GoalBasedExits: React.FC<GoalBasedExitsProps> = ({
  goals,
  onChange,
  isReadOnly = false
}) => {
  const [showAddGoal, setShowAddGoal] = useState(false);

  const addGoal = () => {
    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      type: 'field_value',
      operator: 'equals'
    };
    onChange([...goals, newGoal]);
    setShowAddGoal(false);
  };

  const updateGoal = (index: number, updates: Partial<Goal>) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = { ...updatedGoals[index], ...updates };
    onChange(updatedGoals);
  };

  const removeGoal = (index: number) => {
    onChange(goals.filter((_, i) => i !== index));
  };

  const fieldOptions = [
    { value: 'status', label: 'Status' },
    { value: 'leadScore', label: 'Lead Score' },
    { value: 'lifecycleStage', label: 'Lifecycle Stage' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'company', label: 'Company' }
  ];

  const operatorOptions = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Goal-Based Exit Conditions</h4>
          <p className="text-sm text-gray-500 mt-1">
            Exit when contacts achieve specific goals or meet target criteria
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddGoal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Goal
          </button>
        )}
      </div>

      {goals.length === 0 && !showAddGoal && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No goal-based exits configured</p>
          {!isReadOnly && (
            <button
              onClick={() => setShowAddGoal(true)}
              className="mt-2 text-primary hover:text-primary-dark text-sm font-medium"
            >
              Add your first goal
            </button>
          )}
        </div>
      )}

      {/* Goal List */}
      <div className="space-y-3">
        {goals.map((goal, index) => (
          <div key={goal.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <select
                value={goal.type}
                onChange={(e) => updateGoal(index, { type: e.target.value as Goal['type'] })}
                disabled={isReadOnly}
                className="text-sm font-medium text-gray-700 bg-white rounded-md border-gray-300"
              >
                <option value="field_value">Field Value</option>
                <option value="tag_applied">Tag Applied</option>
                <option value="deal_value">Deal Value</option>
                <option value="custom_field">Custom Field</option>
              </select>
              {!isReadOnly && (
                <button
                  onClick={() => removeGoal(index)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Field Value Goal */}
            {goal.type === 'field_value' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={goal.field || ''}
                    onChange={(e) => updateGoal(index, { field: e.target.value })}
                    disabled={isReadOnly}
                    className="px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select field</option>
                    {fieldOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    value={goal.operator || ''}
                    onChange={(e) => updateGoal(index, { operator: e.target.value })}
                    disabled={isReadOnly}
                    className="px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select operator</option>
                    {operatorOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {!['is_empty', 'is_not_empty'].includes(goal.operator || '') && (
                    <input
                      type="text"
                      value={goal.value || ''}
                      onChange={(e) => updateGoal(index, { value: e.target.value })}
                      disabled={isReadOnly}
                      placeholder="Value"
                      className="px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Tag Applied Goal */}
            {goal.type === 'tag_applied' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={goal.tags?.join(', ') || ''}
                    onChange={(e) => updateGoal(index, { 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                    })}
                    disabled={isReadOnly}
                    placeholder="e.g., vip, priority, customer"
                    className="w-full px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="text-sm text-gray-600">Match:</label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="any"
                      checked={goal.match === 'any'}
                      onChange={(e) => updateGoal(index, { match: 'any' })}
                      disabled={isReadOnly}
                      className="text-primary"
                    />
                    <span className="ml-2 text-sm">Any tag</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={goal.match === 'all'}
                      onChange={(e) => updateGoal(index, { match: 'all' })}
                      disabled={isReadOnly}
                      className="text-primary"
                    />
                    <span className="ml-2 text-sm">All tags</span>
                  </label>
                </div>
              </div>
            )}

            {/* Deal Value Goal */}
            {goal.type === 'deal_value' && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={goal.operator || ''}
                  onChange={(e) => updateGoal(index, { operator: e.target.value })}
                  disabled={isReadOnly}
                  className="px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select operator</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="equals">Equals</option>
                  <option value="greater_or_equal">Greater or Equal</option>
                  <option value="less_or_equal">Less or Equal</option>
                </select>
                <input
                  type="number"
                  value={goal.value || ''}
                  onChange={(e) => updateGoal(index, { value: parseFloat(e.target.value) })}
                  disabled={isReadOnly}
                  placeholder="Amount"
                  className="px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            )}

            {/* Custom Field Goal */}
            {goal.type === 'custom_field' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={goal.fieldName || ''}
                  onChange={(e) => updateGoal(index, { fieldName: e.target.value })}
                  disabled={isReadOnly}
                  placeholder="Custom field name"
                  className="w-full text-sm rounded-md border-gray-300"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={goal.operator || ''}
                    onChange={(e) => updateGoal(index, { operator: e.target.value })}
                    disabled={isReadOnly}
                    className="px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select operator</option>
                    {operatorOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {!['is_empty', 'is_not_empty'].includes(goal.operator || '') && (
                    <input
                      type="text"
                      value={goal.value || ''}
                      onChange={(e) => updateGoal(index, { value: e.target.value })}
                      disabled={isReadOnly}
                      placeholder="Value"
                      className="px-4 py-3 text-sm rounded-md border-gray-300 focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mt-3">
              <input
                type="text"
                value={goal.description || ''}
                onChange={(e) => updateGoal(index, { description: e.target.value })}
                disabled={isReadOnly}
                placeholder="Description (optional)"
                className="w-full text-sm rounded-md border-gray-300"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add New Goal Form */}
      {showAddGoal && !isReadOnly && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h5 className="text-sm font-medium text-primary-dark">Add New Goal</h5>
            <button
              onClick={() => setShowAddGoal(false)}
              className="text-primary hover:text-primary-dark text-sm"
            >
              Cancel
            </button>
          </div>
          <button
            onClick={addGoal}
            className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark text-sm font-medium"
          >
            Add Goal Condition
          </button>
        </div>
      )}
    </div>
  );
};

export default GoalBasedExits;
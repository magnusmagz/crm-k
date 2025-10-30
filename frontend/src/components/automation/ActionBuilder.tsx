import React, { useState, useEffect } from 'react';
import { AutomationAction, Stage } from '../../types';
import { TrashIcon } from '@heroicons/react/24/outline';
import { automationsAPI } from '../../services/api';
import api from '../../services/api';

interface ActionBuilderProps {
  action: AutomationAction;
  onChange: (action: AutomationAction) => void;
  onRemove: () => void;
  triggerType: string;
  stages: Stage[];
}

interface Field {
  name: string;
  label: string;
  type: string;
  options?: string[];
  isCustom?: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  htmlOutput?: string;
}

const ActionBuilder: React.FC<ActionBuilderProps> = ({
  action,
  onChange,
  onRemove,
  triggerType,
  stages,
}) => {
  const [contactFields, setContactFields] = useState<Field[]>([]);
  const [dealFields, setDealFields] = useState<Field[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    fetchFields();
    if (action.type === 'send_email') {
      fetchEmailTemplates();
    }
  }, [triggerType, action.type]);

  const fetchFields = async () => {
    // Skip fetching for recruiting triggers as they use different field structures
    if (triggerType.includes('candidate') || triggerType.includes('position') || triggerType.includes('interview')) {
      setContactFields([]);
      setDealFields([]);
      return;
    }
    
    setIsLoadingFields(true);
    
    try {
      // Fetch contact fields
      const contactResponse = await automationsAPI.getFields('contact');
      setContactFields(contactResponse.data.fields);
      
      // Fetch deal fields if relevant
      if (triggerType.includes('deal')) {
        const dealResponse = await automationsAPI.getFields('deal');
        setDealFields(dealResponse.data.fields);
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const fetchEmailTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await api.get('/email-templates');
      setAvailableTemplates(response.data.filter((t: EmailTemplate) => t.category !== 'system'));
    } catch (error) {
      console.error('Error fetching email templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelection = async (templateId: string) => {
    if (!templateId) {
      onChange({
        ...action,
        config: { ...action.config, templateId: '', subject: '', body: '' }
      });
      return;
    }

    try {
      const response = await api.get(`/email-templates/${templateId}`);
      const template = response.data;
      
      onChange({
        ...action,
        config: {
          ...action.config,
          templateId,
          subject: template.subject || '',
          body: template.htmlOutput || '',
          templateName: template.name
        }
      });
    } catch (error) {
      console.error('Error fetching template details:', error);
    }
  };

  const getActionOptions = () => {
    const emailActions = [
      { value: 'send_email', label: 'Send Email' },
    ];

    const utilityActions = [
      { value: 'create_reminder', label: 'Create Reminder' },
    ];

    const contactActions = [
      { value: 'update_contact_field', label: 'Update Contact Field' },
      { value: 'add_contact_tag', label: 'Add Tag to Contact' },
    ];

    const dealActions = [
      { value: 'update_deal_field', label: 'Update Deal Field' },
      { value: 'move_deal_to_stage', label: 'Move Deal to Stage' },
    ];
    
    const recruitingActions = [
      { value: 'update_candidate_status', label: 'Update Candidate Status' },
      { value: 'move_candidate_to_stage', label: 'Move Candidate to Stage' },
      { value: 'update_candidate_rating', label: 'Update Candidate Rating' },
      { value: 'add_candidate_note', label: 'Add Note to Candidate' },
      { value: 'schedule_interview', label: 'Schedule Interview' },
      { value: 'assign_to_position', label: 'Assign to Position' },
    ];

    const customFieldAction = [
      { value: 'update_custom_field', label: 'Update Custom Field' },
    ];

    if (triggerType.includes('candidate') || triggerType.includes('position') || triggerType.includes('interview')) {
      return [...utilityActions, ...emailActions, ...recruitingActions, ...customFieldAction];
    } else if (triggerType.includes('contact')) {
      return [...utilityActions, ...emailActions, ...contactActions, ...customFieldAction];
    } else if (triggerType.includes('deal')) {
      return [...utilityActions, ...emailActions, ...dealActions, ...contactActions, ...customFieldAction];
    }
    return [...utilityActions, ...emailActions];
  };

  const getFieldValue = () => {
    const fields = action.type === 'update_contact_field' ? contactFields : dealFields;
    const selectedField = fields.find(f => f.name === action.config.field);
    
    if (!selectedField) {
      return (
        <input
          type="text"
          value={action.config.value || ''}
          onChange={(e) => onChange({
            ...action,
            config: { ...action.config, value: e.target.value }
          })}
          className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
          placeholder="New value"
        />
      );
    }

    // For select fields
    if (selectedField.type === 'select' && selectedField.options) {
      return (
        <select
          value={action.config.value || ''}
          onChange={(e) => onChange({
            ...action,
            config: { ...action.config, value: e.target.value }
          })}
          className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <option value="">Select value</option>
          {selectedField.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    // For checkbox fields
    if (selectedField.type === 'checkbox') {
      return (
        <select
          value={action.config.value || 'true'}
          onChange={(e) => onChange({
            ...action,
            config: { ...action.config, value: e.target.value }
          })}
          className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <option value="true">Checked</option>
          <option value="false">Unchecked</option>
        </select>
      );
    }

    // Default input
    return (
      <input
        type={selectedField.type === 'number' ? 'number' : selectedField.type === 'date' ? 'date' : 'text'}
        value={action.config.value || ''}
        onChange={(e) => onChange({
          ...action,
          config: { ...action.config, value: e.target.value }
        })}
        className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
        placeholder="New value"
      />
    );
  };

  const getVariablesByTrigger = () => {
    const baseVariables = ['firstName', 'lastName', 'email', 'phone', 'fullName'];
    
    if (triggerType.includes('candidate') || triggerType.includes('position') || triggerType.includes('interview')) {
      return [...baseVariables, 'candidateName', 'positionTitle', 'appliedAt', 'rating', 'status'];
    } else if (triggerType.includes('deal')) {
      return [...baseVariables, 'title', 'value', 'expectedCloseDate', 'deal.title', 'deal.value'];
    } else if (triggerType.includes('contact')) {
      return [...baseVariables, 'source', 'currentRole', 'currentEmployer'];
    }
    
    return baseVariables;
  };

  const insertVariable = (variable: string, field: 'subject' | 'body') => {
    const currentValue = action.config[field] || '';
    const newValue = currentValue + `{{${variable}}}`;
    
    onChange({
      ...action,
      config: { ...action.config, [field]: newValue }
    });
  };

  const renderActionConfig = () => {
    switch (action.type) {
      case 'send_email':
        const availableVariables = getVariablesByTrigger();
        
        return (
          <div className="space-y-4">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Template (Optional)
              </label>
              <select
                value={action.config.templateId || ''}
                onChange={(e) => handleTemplateSelection(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                disabled={loadingTemplates}
              >
                <option value="">
                  {loadingTemplates ? 'Loading templates...' : 'Create custom email'}
                </option>
                {availableTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}{template.subject ? ` - ${template.subject}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject
              </label>
              <input
                type="text"
                value={action.config.subject || ''}
                onChange={(e) => onChange({
                  ...action,
                  config: { ...action.config, subject: e.target.value }
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="e.g., Welcome {{firstName}}!"
              />
            </div>

            {/* Email Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Body
              </label>
              <textarea
                value={action.config.body || ''}
                onChange={(e) => onChange({
                  ...action,
                  config: { ...action.config, body: e.target.value }
                })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="Hi {{firstName || 'there'}},&#10;&#10;This is an automated message...&#10;&#10;Best regards,&#10;{{deal.title}} Team"
              />
            </div>

            {/* Variable Helper */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insert Variables
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {availableVariables.map(variable => (
                  <div key={variable} className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => insertVariable(variable, 'subject')}
                      className="px-2 py-1 bg-gray-100 text-primary-dark rounded hover:bg-gray-200 flex-1"
                      title={`Add {{${variable}}} to subject`}
                    >
                      📧 {variable}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable(variable, 'body')}
                      className="px-2 py-1 bg-gray-100 text-primary-dark rounded hover:bg-gray-200 flex-1"
                      title={`Add {{${variable}}} to body`}
                    >
                      📝 {variable}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Use {`{{variable || 'fallback'}}`} for optional values
              </p>
            </div>

            {/* Debug Preview */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-50 p-3 rounded-md border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Preview</h4>
                <div className="text-xs space-y-1">
                  <div><strong>Trigger:</strong> {triggerType}</div>
                  <div><strong>Subject:</strong> "{action.config.subject || '[Empty]'}"</div>
                  <div><strong>Body:</strong> "{(action.config.body?.substring(0, 100) || '[Empty]') + '...'}"</div>
                  <div><strong>Variables:</strong> {availableVariables.join(', ')}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'create_reminder':
        const reminderVariables = getVariablesByTrigger();

        return (
          <div className="space-y-4">
            {/* Reminder Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reminder Title
              </label>
              <input
                type="text"
                value={action.config.title || ''}
                onChange={(e) => onChange({
                  ...action,
                  config: { ...action.config, title: e.target.value }
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="e.g., Follow up with {{firstName}}"
              />
            </div>

            {/* Reminder Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={action.config.description || ''}
                onChange={(e) => onChange({
                  ...action,
                  config: { ...action.config, description: e.target.value }
                })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="Additional details about this reminder..."
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remind me...
              </label>
              <div className="space-y-2">
                {/* Quick relative time options */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '1 hour', value: '1h' },
                    { label: '1 day', value: '1d' },
                    { label: '1 week', value: '1w' },
                    { label: '1 month', value: '30d' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange({
                        ...action,
                        config: { ...action.config, relativeTime: option.value, absoluteTime: '' }
                      })}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        action.config.relativeTime === option.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Custom relative time */}
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-600">or in</span>
                  <input
                    type="number"
                    min="1"
                    value={action.config.relativeTime?.match(/^(\d+)/)?.[1] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const unit = action.config.relativeTime?.match(/[mhdw]$/)?.[0] || 'd';
                      onChange({
                        ...action,
                        config: { ...action.config, relativeTime: value ? `${value}${unit}` : '', absoluteTime: '' }
                      });
                    }}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="1"
                  />
                  <select
                    value={action.config.relativeTime?.match(/[mhdw]$/)?.[0] || 'd'}
                    onChange={(e) => {
                      const value = action.config.relativeTime?.match(/^(\d+)/)?.[1] || '1';
                      onChange({
                        ...action,
                        config: { ...action.config, relativeTime: `${value}${e.target.value}`, absoluteTime: '' }
                      });
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="m">minutes</option>
                    <option value="h">hours</option>
                    <option value="d">days</option>
                    <option value="w">weeks</option>
                  </select>
                </div>

                {/* Absolute date/time */}
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-600">or on</span>
                  <input
                    type="datetime-local"
                    value={action.config.absoluteTime || ''}
                    onChange={(e) => onChange({
                      ...action,
                      config: { ...action.config, absoluteTime: e.target.value, relativeTime: '' }
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Variable Helper */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insert Variables
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {reminderVariables.slice(0, 6).map(variable => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => {
                      const currentTitle = action.config.title || '';
                      onChange({
                        ...action,
                        config: { ...action.config, title: currentTitle + `{{${variable}}}` }
                      });
                    }}
                    className="px-2 py-1 bg-gray-100 text-primary-dark rounded hover:bg-gray-200"
                    title={`Add {{${variable}}} to title`}
                  >
                    {variable}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Reminder will be automatically linked to the contact/deal that triggered this automation
              </p>
            </div>

            {/* Preview */}
            {action.config.title && (
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Preview</h4>
                <div className="text-xs text-blue-800">
                  <div><strong>Title:</strong> {action.config.title}</div>
                  {action.config.description && (
                    <div><strong>Description:</strong> {action.config.description}</div>
                  )}
                  <div><strong>Time:</strong> {
                    action.config.relativeTime
                      ? `In ${action.config.relativeTime.replace(/(\d+)([mhdw])/, '$1 $2').replace('m', 'minute(s)').replace('h', 'hour(s)').replace('d', 'day(s)').replace('w', 'week(s)')}`
                      : action.config.absoluteTime
                        ? new Date(action.config.absoluteTime).toLocaleString()
                        : '1 day (default)'
                  }</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'update_contact_field':
        return (
          <div className="grid grid-cols-2 gap-3">
            <select
              value={action.config.field || ''}
              onChange={(e) => onChange({
                ...action,
                config: { ...action.config, field: e.target.value, value: '' }
              })}
              className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
              disabled={isLoadingFields}
            >
              <option value="">Select field</option>
              {contactFields.length > 0 && (
                <>
                  <optgroup label="Standard Fields">
                    {contactFields.filter(f => !f.isCustom).map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </optgroup>
                  {contactFields.some(f => f.isCustom) && (
                    <optgroup label="Custom Fields">
                      {contactFields.filter(f => f.isCustom).map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
            {getFieldValue()}
          </div>
        );

      case 'add_contact_tag':
        return (
          <input
            type="text"
            value={action.config.tags || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, tags: e.target.value }
            })}
            className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="Tag name"
          />
        );

      case 'update_deal_field':
        return (
          <div className="grid grid-cols-2 gap-3">
            <select
              value={action.config.field || ''}
              onChange={(e) => onChange({
                ...action,
                config: { ...action.config, field: e.target.value, value: '' }
              })}
              className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
              disabled={isLoadingFields}
            >
              <option value="">Select field</option>
              {dealFields.length > 0 && (
                <>
                  <optgroup label="Standard Fields">
                    {dealFields.filter(f => !f.isCustom).map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </optgroup>
                  {dealFields.some(f => f.isCustom) && (
                    <optgroup label="Custom Fields">
                      {dealFields.filter(f => f.isCustom).map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
            {getFieldValue()}
          </div>
        );

      case 'move_deal_to_stage':
        return (
          <select
            value={action.config.stageId || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, stageId: e.target.value }
            })}
            className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="">Select stage</option>
            {stages.filter(s => s.pipelineType === 'sales').map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        );
        
      // Recruiting Actions
      case 'update_candidate_status':
        return (
          <select
            value={action.config.status || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, status: e.target.value }
            })}
            className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="">Select status</option>
            <option value="active">Active</option>
            <option value="hired">Hired</option>
            <option value="passed">Passed</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        );
        
      case 'move_candidate_to_stage':
        return (
          <select
            value={action.config.stageId || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, stageId: e.target.value }
            })}
            className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="">Select stage</option>
            {stages.filter(s => s.pipelineType === 'recruiting').map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        );
        
      case 'update_candidate_rating':
        return (
          <select
            value={action.config.rating || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, rating: parseInt(e.target.value) }
            })}
            className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="">Select rating</option>
            <option value="1">1 Star</option>
            <option value="2">2 Stars</option>
            <option value="3">3 Stars</option>
            <option value="4">4 Stars</option>
            <option value="5">5 Stars</option>
          </select>
        );
        
      case 'add_candidate_note':
        return (
          <textarea
            value={action.config.note || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, note: e.target.value }
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="Enter note to add to candidate"
            rows={3}
          />
        );
        
      case 'schedule_interview':
        return (
          <input
            type="datetime-local"
            value={action.config.interviewDate || ''}
            onChange={(e) => onChange({
              ...action,
              config: { ...action.config, interviewDate: e.target.value }
            })}
            className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
          />
        );
        
      case 'assign_to_position':
        return (
          <div>
            <p className="text-sm text-gray-500 mb-2">Position ID:</p>
            <input
              type="text"
              value={action.config.positionId || ''}
              onChange={(e) => onChange({
                ...action,
                config: { ...action.config, positionId: e.target.value }
              })}
              className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="Enter position ID"
            />
          </div>
        );

      case 'update_custom_field':
        const allFields = [...contactFields, ...dealFields].filter(f => f.isCustom);
        const selectedField = allFields.find(f => f.name === action.config.fieldName);
        
        return (
          <div className="space-y-3">
            <select
              value={action.config.entityType || ''}
              onChange={(e) => onChange({
                ...action,
                config: { ...action.config, entityType: e.target.value, fieldName: '', value: '' }
              })}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="">Select entity type</option>
              <option value="contact">Contact</option>
              {triggerType.includes('deal') && <option value="deal">Deal</option>}
            </select>
            
            {action.config.entityType && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={action.config.fieldName || ''}
                  onChange={(e) => onChange({
                    ...action,
                    config: { ...action.config, fieldName: e.target.value.replace('customFields.', ''), value: '' }
                  })}
                  className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select custom field</option>
                  {(action.config.entityType === 'contact' ? contactFields : dealFields)
                    .filter(f => f.isCustom)
                    .map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                </select>
                
                {selectedField && getFieldValue()}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const actionOptions = getActionOptions();

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1 space-y-3">
        <select
          value={action.type}
          onChange={(e) => onChange({
            type: e.target.value as AutomationAction['type'],
            config: {}
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <option value="">Select action</option>
          {actionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {action.type && renderActionConfig()}
      </div>

      <button
        onClick={onRemove}
        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ActionBuilder;

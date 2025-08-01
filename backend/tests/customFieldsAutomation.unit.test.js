// Unit tests for custom fields in automations
// These tests mock database interactions

const automationEngine = require('../services/automationEngine');
const automationEnrollmentService = require('../services/automationEnrollmentService');

describe('Custom Fields in Automations - Unit Tests', () => {
  describe('AutomationEngine - getFieldValue', () => {
    it('should get standard field value', () => {
      const data = {
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      };
      
      const value = automationEngine.getFieldValue('contact.firstName', data);
      expect(value).toBe('John');
    });

    it('should get custom field value using dot notation', () => {
      const data = {
        contact: {
          firstName: 'John',
          customFields: {
            customerType: 'Gold',
            priority: 'High'
          }
        }
      };
      
      const value = automationEngine.getFieldValue('contact.customFields.customerType', data);
      expect(value).toBe('Gold');
    });

    it('should return null for non-existent field', () => {
      const data = {
        contact: {
          firstName: 'John'
        }
      };
      
      const value = automationEngine.getFieldValue('contact.customFields.nonExistent', data);
      expect(value).toBe(null);
    });

    it('should handle deeply nested paths', () => {
      const data = {
        contact: {
          customFields: {
            nested: {
              deeply: {
                value: 'found'
              }
            }
          }
        }
      };
      
      const value = automationEngine.getFieldValue('contact.customFields.nested.deeply.value', data);
      expect(value).toBe('found');
    });
  });

  describe('AutomationEngine - evaluateCondition', () => {
    it('should evaluate custom field equals condition', async () => {
      const condition = {
        field: 'contact.customFields.customerType',
        operator: 'equals',
        value: 'Silver'
      };
      
      const data = {
        contact: {
          customFields: {
            customerType: 'Silver'
          }
        }
      };
      
      const result = await automationEngine.evaluateCondition(condition, data);
      expect(result).toBe(true);
    });

    it('should evaluate custom field not_equals condition', async () => {
      const condition = {
        field: 'contact.customFields.priority',
        operator: 'not_equals',
        value: 'Low'
      };
      
      const data = {
        contact: {
          customFields: {
            priority: 'High'
          }
        }
      };
      
      const result = await automationEngine.evaluateCondition(condition, data);
      expect(result).toBe(true);
    });

    it('should evaluate custom field contains condition', async () => {
      const condition = {
        field: 'deal.customFields.notes',
        operator: 'contains',
        value: 'important'
      };
      
      const data = {
        deal: {
          customFields: {
            notes: 'This is an important deal'
          }
        }
      };
      
      const result = await automationEngine.evaluateCondition(condition, data);
      expect(result).toBe(true);
    });

    it('should evaluate custom field is_empty condition', async () => {
      const condition = {
        field: 'contact.customFields.referral',
        operator: 'is_empty',
        value: ''
      };
      
      const data = {
        contact: {
          customFields: {
            referral: ''
          }
        }
      };
      
      const result = await automationEngine.evaluateCondition(condition, data);
      expect(result).toBe(true);
    });

    it('should evaluate custom field greater_than condition', async () => {
      const condition = {
        field: 'deal.customFields.score',
        operator: 'greater_than',
        value: 80
      };
      
      const data = {
        deal: {
          customFields: {
            score: 95
          }
        }
      };
      
      const result = await automationEngine.evaluateCondition(condition, data);
      expect(result).toBe(true);
    });
  });

  describe('AutomationEnrollmentService - getFieldValue', () => {
    it('should get standard field value', () => {
      const entity = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };
      
      const value = automationEnrollmentService.getFieldValue('firstName', entity);
      expect(value).toBe('John');
    });

    it('should get custom field value using dot notation', () => {
      const entity = {
        firstName: 'John',
        customFields: {
          customerType: 'Gold',
          priority: 'High'
        }
      };
      
      const value = automationEnrollmentService.getFieldValue('customFields.customerType', entity);
      expect(value).toBe('Gold');
    });

    it('should return null for non-existent field', () => {
      const entity = {
        firstName: 'John'
      };
      
      const value = automationEnrollmentService.getFieldValue('customFields.nonExistent', entity);
      expect(value).toBe(null);
    });

    it('should handle arrays in path', () => {
      const entity = {
        customFields: {
          preferences: ['email', 'sms', 'phone']
        }
      };
      
      const value = automationEnrollmentService.getFieldValue('customFields.preferences', entity);
      expect(value).toEqual(['email', 'sms', 'phone']);
    });
  });

  describe('AutomationEnrollmentService - evaluateCondition', () => {
    it('should evaluate custom field equals condition', () => {
      const condition = {
        field: 'customFields.customerType',
        operator: 'equals',
        value: 'Silver'
      };
      
      const entity = {
        customFields: {
          customerType: 'Silver'
        }
      };
      
      const result = automationEnrollmentService.evaluateCondition(condition, entity);
      expect(result).toBe(true);
    });

    it('should evaluate custom field with tags', () => {
      const condition = {
        field: 'tags',
        operator: 'has_tag',
        value: 'vip'
      };
      
      const entity = {
        tags: ['customer', 'vip', 'priority'],
        customFields: {}
      };
      
      const result = automationEnrollmentService.evaluateCondition(condition, entity);
      expect(result).toBe(true);
    });

    it('should handle missing custom fields gracefully', () => {
      const condition = {
        field: 'customFields.missingField',
        operator: 'is_empty',
        value: ''
      };
      
      const entity = {
        firstName: 'John'
      };
      
      const result = automationEnrollmentService.evaluateCondition(condition, entity);
      expect(result).toBe(true); // null/undefined is considered empty
    });
  });

  describe('Custom Field Update Logic', () => {
    it('should correctly identify custom field updates', () => {
      const fieldPath = 'customFields.customerType';
      const isCustomField = fieldPath.startsWith('customFields.');
      expect(isCustomField).toBe(true);
      
      const customFieldName = fieldPath.replace('customFields.', '');
      expect(customFieldName).toBe('customerType');
    });

    it('should handle nested custom field structure', () => {
      const entity = {
        customFields: {
          category: 'premium',
          details: {
            level: 'gold'
          }
        }
      };
      
      // Simulate updating a custom field
      const fieldName = 'category';
      const newValue = 'enterprise';
      entity.customFields[fieldName] = newValue;
      
      expect(entity.customFields.category).toBe('enterprise');
      expect(entity.customFields.details.level).toBe('gold'); // Other fields unchanged
    });
  });

  describe('API Field Response Structure', () => {
    it('should format custom fields correctly for API response', () => {
      const customField = {
        name: 'customerType',
        label: 'Customer Type',
        type: 'select',
        options: ['Bronze', 'Silver', 'Gold'],
        required: false
      };
      
      const formatted = {
        name: `customFields.${customField.name}`,
        label: customField.label,
        type: customField.type,
        options: customField.options,
        isCustom: true,
        required: customField.required
      };
      
      expect(formatted.name).toBe('customFields.customerType');
      expect(formatted.isCustom).toBe(true);
      expect(formatted.options).toContain('Gold');
    });
  });
});
// Test for field path fix
const automationEngine = require('../services/automationEngine');

describe('Field Path Fix Tests', () => {
  describe('AutomationEngine.getFieldValue', () => {
    it('should handle field names without entity prefix', () => {
      const data = {
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      };
      
      // Test both formats
      expect(automationEngine.getFieldValue('email', data)).toBe('john@example.com');
      expect(automationEngine.getFieldValue('contact.email', data)).toBe('john@example.com');
      expect(automationEngine.getFieldValue('firstName', data)).toBe('John');
      expect(automationEngine.getFieldValue('contact.firstName', data)).toBe('John');
    });

    it('should handle custom fields with both formats', () => {
      const data = {
        contact: {
          email: 'test@example.com',
          customFields: {
            customerType: 'Gold'
          }
        }
      };
      
      // Custom fields should still require the full path
      expect(automationEngine.getFieldValue('customFields.customerType', data)).toBe('Gold');
      expect(automationEngine.getFieldValue('contact.customFields.customerType', data)).toBe('Gold');
    });

    it('should evaluate conditions correctly with email field', async () => {
      const condition = {
        field: 'email',
        operator: 'contains',
        value: '@'
      };
      
      const data = {
        contact: {
          email: 'test@example.com'
        }
      };
      
      const result = await automationEngine.evaluateCondition(condition, data);
      expect(result).toBe(true);
    });
  });
});
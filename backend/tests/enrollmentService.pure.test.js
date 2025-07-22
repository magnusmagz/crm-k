// Test enrollment service field evaluation
const automationEnrollmentService = require('../services/automationEnrollmentService');

describe('Automation Enrollment Service Tests', () => {
  describe('Field evaluation for enrollment', () => {
    it('should correctly evaluate email contains @ during enrollment', () => {
      const service = automationEnrollmentService;
      
      // Test contact entity (as it would be passed during enrollment)
      const contact = {
        id: '73ad755e-887e-4fc2-91c8-2f368d44cc1b',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        tags: []
      };
      
      // Test condition as it would be stored in the automation
      const condition = {
        field: 'email',
        operator: 'contains',
        value: '@'
      };
      
      const result = service.evaluateCondition(condition, contact);
      expect(result).toBe(true);
    });

    it('should handle field value extraction correctly', () => {
      const service = automationEnrollmentService;
      
      const contact = {
        id: '123',
        email: 'user@domain.com',
        firstName: 'John',
        customFields: {
          customerType: 'Gold'
        }
      };
      
      // Test standard fields
      expect(service.getFieldValue('email', contact)).toBe('user@domain.com');
      expect(service.getFieldValue('firstName', contact)).toBe('John');
      
      // Test custom fields
      expect(service.getFieldValue('customFields.customerType', contact)).toBe('Gold');
    });

    it('should evaluate conditions for contact without @ in email', () => {
      const service = automationEnrollmentService;
      
      const contact = {
        email: 'invalid-email'
      };
      
      const condition = {
        field: 'email',
        operator: 'contains',
        value: '@'
      };
      
      const result = service.evaluateCondition(condition, contact);
      expect(result).toBe(false);
    });

    it('should handle null email gracefully', () => {
      const service = automationEnrollmentService;
      
      const contact = {
        email: null
      };
      
      const condition = {
        field: 'email',
        operator: 'contains',
        value: '@'
      };
      
      const result = service.evaluateCondition(condition, contact);
      expect(result).toBe(false);
    });

    it('should evaluate multiple conditions correctly', async () => {
      const service = automationEnrollmentService;
      
      const contact = {
        email: 'test@example.com',
        firstName: 'John'
      };
      
      const conditions = [
        {
          field: 'email',
          operator: 'contains',
          value: '@'
        },
        {
          field: 'firstName',
          operator: 'equals',
          value: 'John',
          logic: 'AND'
        }
      ];
      
      // Note: evaluateConditions is async in the real implementation
      const result = await service.evaluateConditions(conditions, contact);
      expect(result).toBe(true);
    });

    it('should handle case-insensitive contains', () => {
      const service = automationEnrollmentService;
      
      const contact = {
        email: 'TEST@EXAMPLE.COM'
      };
      
      const condition = {
        field: 'email',
        operator: 'contains',
        value: 'example'
      };
      
      const result = service.evaluateCondition(condition, contact);
      expect(result).toBe(true);
    });
  });
});
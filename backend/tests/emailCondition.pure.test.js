// Test specifically for email contains @ condition
const automationEngine = require('../services/automationEngine');

describe('Email Condition Tests', () => {
  describe('Email contains @ automation', () => {
    it('should correctly evaluate email contains @ condition', async () => {
      const condition = {
        field: 'email',
        operator: 'contains',
        value: '@'
      };
      
      const dataWithEmail = {
        contact: {
          id: '73ad755e-887e-4fc2-91c8-2f368d44cc1b',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          tags: []
        }
      };
      
      // Test with email containing @
      const result1 = await automationEngine.evaluateCondition(condition, dataWithEmail);
      expect(result1).toBe(true);
      
      // Test with email without @
      const dataWithoutAt = {
        contact: {
          ...dataWithEmail.contact,
          email: 'invalid-email'
        }
      };
      const result2 = await automationEngine.evaluateCondition(condition, dataWithoutAt);
      expect(result2).toBe(false);
      
      // Test with no email
      const dataNoEmail = {
        contact: {
          ...dataWithEmail.contact,
          email: null
        }
      };
      const result3 = await automationEngine.evaluateCondition(condition, dataNoEmail);
      expect(result3).toBe(false);
    });

    it('should handle different field path formats', async () => {
      const data = {
        contact: {
          email: 'user@domain.com'
        }
      };
      
      // Test direct field access
      const value1 = automationEngine.getFieldValue('email', data);
      expect(value1).toBe('user@domain.com');
      
      // Test with entity prefix
      const value2 = automationEngine.getFieldValue('contact.email', data);
      expect(value2).toBe('user@domain.com');
    });

    it('should evaluate full automation conditions', async () => {
      const conditions = [
        {
          field: 'email',
          operator: 'contains',
          value: '@'
        }
      ];
      
      const data = {
        contact: {
          email: 'test@example.com'
        }
      };
      
      const evaluatedLog = [];
      const result = await automationEngine.evaluateConditions(conditions, data, evaluatedLog);
      
      expect(result).toBe(true);
      expect(evaluatedLog).toHaveLength(1);
      expect(evaluatedLog[0].result).toBe(true);
    });

    it('should handle case sensitivity correctly', async () => {
      const condition = {
        field: 'email',
        operator: 'contains',
        value: 'EXAMPLE'
      };
      
      const data = {
        contact: {
          email: 'test@example.com'
        }
      };
      
      // Should match case-insensitively
      const result = await automationEngine.evaluateCondition(condition, data);
      expect(result).toBe(true);
    });
  });
});
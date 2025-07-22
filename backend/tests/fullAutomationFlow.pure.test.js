// Test the full automation flow from trigger to execution
const automationEngine = require('../services/automationEngine');
const automationEnrollmentService = require('../services/automationEnrollmentService');

describe('Full Automation Flow Tests', () => {
  describe('Contact update automation with email contains @', () => {
    it('should process automation when contact is updated', async () => {
      // Mock automation as it would exist in database
      const automation = {
        id: 'ff9020fb-3931-4814-b08f-0ade563a9def',
        name: 'new auto',
        userId: 'user123',
        trigger: {
          type: 'contact_updated'
        },
        conditions: [
          {
            field: 'email',
            operator: 'contains',
            value: '@'
          }
        ],
        actions: [
          {
            type: 'add_contact_tag',
            config: {
              tags: 'test2'
            }
          }
        ],
        isActive: true,
        isMultiStep: false,
        executionCount: 0
      };

      // Mock event as it would be emitted
      const event = {
        type: 'contact_updated',
        userId: 'user123',
        data: {
          contact: {
            id: '73ad755e-887e-4fc2-91c8-2f368d44cc1b',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            tags: []
          },
          changedFields: ['email']
        }
      };

      // Test condition evaluation in automation engine
      const conditionsMet = await automationEngine.evaluateConditions(
        automation.conditions,
        event.data,
        []
      );
      expect(conditionsMet).toBe(true);

      // Test field value extraction
      const fieldValue = automationEngine.getFieldValue('email', event.data);
      expect(fieldValue).toBe('test@example.com');

      // Test specific condition
      const conditionResult = await automationEngine.evaluateCondition(
        automation.conditions[0],
        event.data
      );
      expect(conditionResult).toBe(true);
    });

    it('should evaluate enrollment criteria correctly', async () => {
      const contact = {
        id: '73ad755e-887e-4fc2-91c8-2f368d44cc1b',
        email: 'test@example.com',
        tags: []
      };

      const automation = {
        id: 'test-auto',
        conditions: [
          {
            field: 'email',
            operator: 'contains',
            value: '@'
          }
        ],
        isMultiStep: false
      };

      // Test enrollment service evaluation
      const conditionsMet = await automationEnrollmentService.evaluateConditions(
        automation.conditions,
        contact
      );
      expect(conditionsMet).toBe(true);

      // Test checkEnrollmentCriteria
      const shouldEnroll = await automationEnrollmentService.checkEnrollmentCriteria(
        automation,
        contact,
        'contact_updated',
        { contact }
      );
      expect(shouldEnroll).toBe(true);
    });

    it('should handle different event data structures', async () => {
      // Test with wrapped contact
      const wrappedData = {
        contact: {
          email: 'test@example.com'
        }
      };

      // Test with direct contact
      const directContact = {
        email: 'test@example.com'
      };

      const condition = {
        field: 'email',
        operator: 'contains',
        value: '@'
      };

      // Automation engine should handle wrapped data
      const result1 = await automationEngine.evaluateCondition(condition, wrappedData);
      expect(result1).toBe(true);

      // Enrollment service should handle direct entity
      const result2 = automationEnrollmentService.evaluateCondition(condition, directContact);
      expect(result2).toBe(true);
    });
  });
});
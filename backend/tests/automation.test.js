const { 
  User, 
  Contact, 
  Deal, 
  Stage, 
  Automation, 
  AutomationEnrollment,
  AutomationLog 
} = require('../models');
const automationEmitter = require('../services/eventEmitter');
const automationEngine = require('../services/automationEngineV2');
const { Op } = require('sequelize');

// Helper function to wait for automation processing
const waitForAutomation = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

describe('Automation System Tests', () => {
  let testUser;
  let testStages;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: `test-${Date.now()}@example.com`,
      password: 'testpass123',
      isVerified: true
    });

    // Create test stages
    const stageNames = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    testStages = [];
    for (let i = 0; i < stageNames.length; i++) {
      const stage = await Stage.create({
        userId: testUser.id,
        name: stageNames[i],
        order: i,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        isActive: true
      });
      testStages.push(stage);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await AutomationLog.destroy({ where: { userId: testUser.id } });
    await AutomationEnrollment.destroy({ where: { userId: testUser.id } });
    await Automation.destroy({ where: { userId: testUser.id } });
    await Deal.destroy({ where: { userId: testUser.id } });
    await Contact.destroy({ where: { userId: testUser.id } });
    await Stage.destroy({ where: { userId: testUser.id } });
    await User.destroy({ where: { id: testUser.id } });
  });

  describe('Contact Automations', () => {
    test('Should trigger automation on contact creation', async () => {
      // Create automation
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'New Contact Welcome',
        trigger: { type: 'contact_created' },
        conditions: [],
        actions: [{
          type: 'add_contact_tag',
          config: { tag: 'new-lead' }
        }],
        isActive: true,
        isMultiStep: false
      });

      // Create contact
      const contact = await Contact.create({
        userId: testUser.id,
        firstName: 'Test',
        lastName: 'Contact',
        email: 'test@example.com',
        tags: []
      });

      // Emit event
      automationEmitter.emitContactCreated(testUser.id, contact.toJSON());
      
      // Wait for processing
      await waitForAutomation();

      // Check enrollment
      const enrollment = await AutomationEnrollment.findOne({
        where: {
          automationId: automation.id,
          entityType: 'contact',
          entityId: contact.id
        }
      });

      expect(enrollment).toBeTruthy();
      expect(enrollment.status).toBe('completed');

      // Check if tag was added
      const updatedContact = await Contact.findByPk(contact.id);
      expect(updatedContact.tags).toContain('new-lead');

      // Check automation log
      const log = await AutomationLog.findOne({
        where: {
          automationId: automation.id,
          status: 'success'
        }
      });

      expect(log).toBeTruthy();
      expect(log.conditionsMet).toBe(true);
    });

    test('Should evaluate conditions correctly', async () => {
      // Create automation with conditions
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'VIP Contact',
        trigger: { type: 'contact_created' },
        conditions: [{
          field: 'company',
          operator: 'equals',
          value: 'Acme Corp'
        }],
        actions: [{
          type: 'add_contact_tag',
          config: { tag: 'vip' }
        }],
        isActive: true,
        isMultiStep: false
      });

      // Create contact that matches condition
      const vipContact = await Contact.create({
        userId: testUser.id,
        firstName: 'VIP',
        lastName: 'Contact',
        company: 'Acme Corp',
        tags: []
      });

      automationEmitter.emitContactCreated(testUser.id, vipContact.toJSON());
      await waitForAutomation();

      const updatedVip = await Contact.findByPk(vipContact.id);
      expect(updatedVip.tags).toContain('vip');

      // Create contact that doesn't match condition
      const regularContact = await Contact.create({
        userId: testUser.id,
        firstName: 'Regular',
        lastName: 'Contact',
        company: 'Other Corp',
        tags: []
      });

      automationEmitter.emitContactCreated(testUser.id, regularContact.toJSON());
      await waitForAutomation();

      const updatedRegular = await Contact.findByPk(regularContact.id);
      expect(updatedRegular.tags).not.toContain('vip');
    });

    test('Should handle contact update trigger', async () => {
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Contact Status Update',
        trigger: { type: 'contact_updated' },
        conditions: [{
          field: 'tags',
          operator: 'has_tag',
          value: 'hot-lead'
        }],
        actions: [{
          type: 'update_contact_field',
          config: { field: 'position', value: 'Priority Lead' }
        }],
        isActive: true,
        isMultiStep: false
      });

      const contact = await Contact.create({
        userId: testUser.id,
        firstName: 'Update',
        lastName: 'Test',
        tags: []
      });

      // Update contact to trigger automation
      await contact.update({ tags: ['hot-lead'] });
      automationEmitter.emitContactUpdated(testUser.id, contact.toJSON(), ['tags']);
      await waitForAutomation();

      const updated = await Contact.findByPk(contact.id);
      expect(updated.position).toBe('Priority Lead');
    });
  });

  describe('Deal Automations', () => {
    test('Should trigger automation on deal creation', async () => {
      const contact = await Contact.create({
        userId: testUser.id,
        firstName: 'Deal',
        lastName: 'Contact',
        tags: []
      });

      const automation = await Automation.create({
        userId: testUser.id,
        name: 'New Deal Created',
        trigger: { type: 'deal_created' },
        conditions: [],
        actions: [{
          type: 'add_contact_tag',
          config: { tag: 'has-deal' }
        }],
        isActive: true,
        isMultiStep: false
      });

      const deal = await Deal.create({
        userId: testUser.id,
        contactId: contact.id,
        stageId: testStages[0].id,
        name: 'Test Deal',
        value: 1000,
        status: 'open'
      });

      const dealWithAssociations = await Deal.findByPk(deal.id, {
        include: ['Contact', 'Stage']
      });

      automationEmitter.emitDealCreated(testUser.id, dealWithAssociations.toJSON());
      await waitForAutomation();

      const updatedContact = await Contact.findByPk(contact.id);
      expect(updatedContact.tags).toContain('has-deal');
    });

    test('Should trigger automation on deal stage change', async () => {
      const contact = await Contact.create({
        userId: testUser.id,
        firstName: 'Stage',
        lastName: 'Test',
        tags: []
      });

      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Deal Stage Changed',
        trigger: { type: 'deal_stage_changed' },
        conditions: [],
        actions: [{
          type: 'add_contact_tag',
          config: { tag: 'stagechanged' }
        }],
        isActive: true,
        isMultiStep: false
      });

      const deal = await Deal.create({
        userId: testUser.id,
        contactId: contact.id,
        stageId: testStages[0].id,
        name: 'Stage Change Deal',
        value: 5000,
        status: 'open'
      });

      // Change stage
      const previousStage = testStages[0];
      const newStage = testStages[1];
      
      await deal.update({ stageId: newStage.id });
      
      const dealWithAssociations = await Deal.findByPk(deal.id, {
        include: ['Contact', 'Stage']
      });

      automationEmitter.emitDealStageChanged(
        testUser.id,
        dealWithAssociations.toJSON(),
        previousStage.toJSON(),
        newStage.toJSON()
      );
      
      await waitForAutomation();

      const updatedContact = await Contact.findByPk(contact.id);
      expect(updatedContact.tags).toContain('stagechanged');
    });

    test('Should handle deal-specific actions', async () => {
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Update Deal Status',
        trigger: { type: 'deal_created' },
        conditions: [{
          field: 'value',
          operator: 'greater_than',
          value: 10000
        }],
        actions: [{
          type: 'update_deal_field',
          config: { field: 'notes', value: 'High value deal - priority!' }
        }],
        isActive: true,
        isMultiStep: false
      });

      const deal = await Deal.create({
        userId: testUser.id,
        stageId: testStages[0].id,
        name: 'High Value Deal',
        value: 15000,
        status: 'open'
      });

      automationEmitter.emitDealCreated(testUser.id, deal.toJSON());
      await waitForAutomation();

      const updated = await Deal.findByPk(deal.id);
      expect(updated.notes).toBe('High value deal - priority!');
    });

    test('Should move deal to different stage', async () => {
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Auto-qualify Deal',
        trigger: { type: 'deal_updated' },
        conditions: [{
          field: 'value',
          operator: 'greater_than',
          value: 5000
        }],
        actions: [{
          type: 'move_deal_to_stage',
          config: { stageId: testStages[1].id }
        }],
        isActive: true,
        isMultiStep: false
      });

      const deal = await Deal.create({
        userId: testUser.id,
        stageId: testStages[0].id,
        name: 'Auto-qualify Deal',
        value: 3000,
        status: 'open'
      });

      // Update deal value to trigger automation
      await deal.update({ value: 6000 });
      automationEmitter.emitDealUpdated(testUser.id, deal.toJSON(), ['value']);
      await waitForAutomation();

      const updated = await Deal.findByPk(deal.id);
      expect(updated.stageId).toBe(testStages[1].id);
    });
  });

  describe('Complex Conditions', () => {
    test('Should handle multiple conditions with AND logic', async () => {
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Complex AND Conditions',
        trigger: { type: 'contact_created' },
        conditions: [
          {
            field: 'company',
            operator: 'equals',
            value: 'Tech Corp',
            logic: 'AND'
          },
          {
            field: 'email',
            operator: 'contains',
            value: '@techcorp.com',
            logic: 'AND'
          }
        ],
        actions: [{
          type: 'add_contact_tag',
          config: { tag: 'verified-tech-corp' }
        }],
        isActive: true,
        isMultiStep: false
      });

      // Contact that matches all conditions
      const matchingContact = await Contact.create({
        userId: testUser.id,
        firstName: 'Tech',
        lastName: 'Employee',
        email: 'employee@techcorp.com',
        company: 'Tech Corp',
        tags: []
      });

      automationEmitter.emitContactCreated(testUser.id, matchingContact.toJSON());
      await waitForAutomation();

      const updated = await Contact.findByPk(matchingContact.id);
      expect(updated.tags).toContain('verified-tech-corp');

      // Contact that only matches one condition
      const partialMatch = await Contact.create({
        userId: testUser.id,
        firstName: 'Other',
        lastName: 'Person',
        email: 'person@gmail.com',
        company: 'Tech Corp',
        tags: []
      });

      automationEmitter.emitContactCreated(testUser.id, partialMatch.toJSON());
      await waitForAutomation();

      const notUpdated = await Contact.findByPk(partialMatch.id);
      expect(notUpdated.tags).not.toContain('verified-tech-corp');
    });

    test('Should handle tag operations correctly', async () => {
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Tag Operations',
        trigger: { type: 'contact_updated' },
        conditions: [
          {
            field: 'tags',
            operator: 'has_tag',
            value: 'customer'
          },
          {
            field: 'tags',
            operator: 'not_has_tag',
            value: 'churned',
            logic: 'AND'
          }
        ],
        actions: [{
          type: 'add_contact_tag',
          config: { tag: 'active-customer' }
        }],
        isActive: true,
        isMultiStep: false
      });

      const contact = await Contact.create({
        userId: testUser.id,
        firstName: 'Tag',
        lastName: 'Test',
        tags: []
      });

      // Add customer tag
      await contact.update({ tags: ['customer'] });
      automationEmitter.emitContactUpdated(testUser.id, contact.toJSON(), ['tags']);
      await waitForAutomation();

      const updated = await Contact.findByPk(contact.id);
      expect(updated.tags).toContain('active-customer');

      // Add churned tag - should not trigger again
      await contact.update({ tags: ['customer', 'churned'] });
      automationEmitter.emitContactUpdated(testUser.id, contact.toJSON(), ['tags']);
      await waitForAutomation();

      // Should not add the tag again
      const final = await Contact.findByPk(contact.id);
      const activeCustomerCount = final.tags.filter(t => t === 'active-customer').length;
      expect(activeCustomerCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid action configurations', async () => {
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Invalid Action Config',
        trigger: { type: 'contact_created' },
        conditions: [],
        actions: [{
          type: 'update_contact_field',
          config: {} // Missing required field and value
        }],
        isActive: true,
        isMultiStep: false
      });

      const contact = await Contact.create({
        userId: testUser.id,
        firstName: 'Error',
        lastName: 'Test',
        tags: []
      });

      automationEmitter.emitContactCreated(testUser.id, contact.toJSON());
      await waitForAutomation();

      // Check that enrollment failed
      const enrollment = await AutomationEnrollment.findOne({
        where: {
          automationId: automation.id,
          entityType: 'contact',
          entityId: contact.id
        }
      });

      expect(enrollment.status).toBe('failed');

      // Check error log
      const log = await AutomationLog.findOne({
        where: {
          automationId: automation.id,
          status: 'failed'
        }
      });

      expect(log).toBeTruthy();
      expect(log.error).toContain('Invalid update_contact_field config');
    });

    test('Should not process inactive automations', async () => {
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Inactive Automation',
        trigger: { type: 'contact_created' },
        conditions: [],
        actions: [{
          type: 'add_contact_tag',
          config: { tag: 'should-not-add' }
        }],
        isActive: false, // Inactive
        isMultiStep: false
      });

      const contact = await Contact.create({
        userId: testUser.id,
        firstName: 'Inactive',
        lastName: 'Test',
        tags: []
      });

      automationEmitter.emitContactCreated(testUser.id, contact.toJSON());
      await waitForAutomation();

      // Should not have enrollment
      const enrollment = await AutomationEnrollment.findOne({
        where: {
          automationId: automation.id,
          entityType: 'contact',
          entityId: contact.id
        }
      });

      expect(enrollment).toBeFalsy();

      // Contact should not have tag
      const unchanged = await Contact.findByPk(contact.id);
      expect(unchanged.tags).not.toContain('should-not-add');
    });
  });

  describe('Automation Statistics', () => {
    test('Should track execution counts correctly', async () => {
      const automation = await Automation.create({
        userId: testUser.id,
        name: 'Stats Test',
        trigger: { type: 'contact_created' },
        conditions: [],
        actions: [{
          type: 'add_contact_tag',
          config: { tag: 'counted' }
        }],
        isActive: true,
        isMultiStep: false,
        executionCount: 0,
        enrolledCount: 0,
        completedEnrollments: 0
      });

      // Create multiple contacts
      for (let i = 0; i < 3; i++) {
        const contact = await Contact.create({
          userId: testUser.id,
          firstName: `Stats${i}`,
          lastName: 'Test',
          tags: []
        });

        automationEmitter.emitContactCreated(testUser.id, contact.toJSON());
        await waitForAutomation(500);
      }

      // Check updated stats
      const updated = await Automation.findByPk(automation.id);
      expect(updated.enrolledCount).toBe(3);
      expect(updated.completedEnrollments).toBe(3);

      // Check enrollments
      const enrollments = await AutomationEnrollment.findAll({
        where: {
          automationId: automation.id,
          status: 'completed'
        }
      });

      expect(enrollments.length).toBe(3);
    });
  });
});
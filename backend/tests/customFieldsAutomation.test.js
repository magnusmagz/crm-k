const request = require('supertest');
const app = require('../server');
const { sequelize, User, Contact, Deal, CustomField, Automation, AutomationLog } = require('../models');
const automationEngine = require('../services/automationEngine');
const automationEnrollmentService = require('../services/automationEnrollmentService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Custom Fields in Automations', () => {
  let user;
  let authToken;
  let contact;
  let deal;
  let contactCustomField;
  let dealCustomField;

  beforeEach(async () => {
    // Clear all tables
    await AutomationLog.destroy({ where: {}, force: true });
    await Automation.destroy({ where: {}, force: true });
    await Deal.destroy({ where: {}, force: true });
    await Contact.destroy({ where: {}, force: true });
    await CustomField.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create user directly in database
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await User.create({
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User'
    });
    
    // Generate auth token
    authToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );

    // Create custom fields
    contactCustomField = await CustomField.create({
      userId: user.id,
      name: 'customerType',
      label: 'Customer Type',
      type: 'select',
      options: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      entityType: 'contact',
      required: false
    });

    dealCustomField = await CustomField.create({
      userId: user.id,
      name: 'priority',
      label: 'Priority',
      type: 'select',
      options: ['Low', 'Medium', 'High', 'Critical'],
      entityType: 'deal',
      required: false
    });

    // Create contact with custom field
    contact = await Contact.create({
      userId: user.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      customFields: {
        customerType: 'Silver'
      }
    });

    // Create deal with custom field
    deal = await Deal.create({
      userId: user.id,
      name: 'Test Deal',
      value: 10000,
      contactId: contact.id,
      customFields: {
        priority: 'High'
      }
    });
  });

  describe('GET /api/automations/fields/:entityType', () => {
    it('should return all fields including custom fields for contacts', async () => {
      const response = await request(app)
        .get('/api/automations/fields/contact')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entityType).toBe('contact');
      expect(response.body.fields).toContainEqual(
        expect.objectContaining({
          name: 'customFields.customerType',
          label: 'Customer Type',
          type: 'select',
          options: ['Bronze', 'Silver', 'Gold', 'Platinum'],
          isCustom: true
        })
      );
    });

    it('should return all fields including custom fields for deals', async () => {
      const response = await request(app)
        .get('/api/automations/fields/deal')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entityType).toBe('deal');
      expect(response.body.fields).toContainEqual(
        expect.objectContaining({
          name: 'customFields.priority',
          label: 'Priority',
          type: 'select',
          options: ['Low', 'Medium', 'High', 'Critical'],
          isCustom: true
        })
      );
    });

    it('should return 400 for invalid entity type', async () => {
      const response = await request(app)
        .get('/api/automations/fields/invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid entity type');
    });
  });

  describe('Automation Engine - Custom Field Conditions', () => {
    it('should evaluate custom field conditions correctly', async () => {
      const automation = await Automation.create({
        userId: user.id,
        name: 'Test Custom Field Condition',
        trigger: { type: 'contact_updated' },
        conditions: [
          {
            field: 'customFields.customerType',
            operator: 'equals',
            value: 'Silver'
          }
        ],
        actions: [
          {
            type: 'add_contact_tag',
            config: { tags: 'silver-customer' }
          }
        ],
        isActive: true
      });

      const event = {
        type: 'contact_updated',
        userId: user.id,
        data: {
          contact: await Contact.findByPk(contact.id)
        }
      };

      await automationEngine.processEvent(event);

      // Check if tag was added
      const updatedContact = await Contact.findByPk(contact.id);
      expect(updatedContact.tags).toContain('silver-customer');

      // Check automation log
      const log = await AutomationLog.findOne({
        where: { automationId: automation.id }
      });
      expect(log.conditionsMet).toBe(true);
      expect(log.status).toBe('success');
    });

    it('should handle multiple custom field conditions', async () => {
      const automation = await Automation.create({
        userId: user.id,
        name: 'Test Multiple Conditions',
        trigger: { type: 'deal_updated' },
        conditions: [
          {
            field: 'customFields.priority',
            operator: 'equals',
            value: 'High'
          },
          {
            field: 'value',
            operator: 'greater_than',
            value: 5000,
            logic: 'AND'
          }
        ],
        actions: [
          {
            type: 'update_deal_field',
            config: { field: 'status', value: 'won' }
          }
        ],
        isActive: true
      });

      const event = {
        type: 'deal_updated',
        userId: user.id,
        data: {
          deal: await Deal.findByPk(deal.id, { include: ['Contact', 'Stage'] })
        }
      };

      await automationEngine.processEvent(event);

      // Check automation log
      const log = await AutomationLog.findOne({
        where: { automationId: automation.id }
      });
      expect(log.conditionsMet).toBe(true);
    });
  });

  describe('Automation Engine - Custom Field Actions', () => {
    it('should update contact custom field using update_contact_field action', async () => {
      const automation = await Automation.create({
        userId: user.id,
        name: 'Update Contact Custom Field',
        trigger: { type: 'contact_updated' },
        conditions: [],
        actions: [
          {
            type: 'update_contact_field',
            config: { 
              field: 'customFields.customerType', 
              value: 'Gold' 
            }
          }
        ],
        isActive: true
      });

      const event = {
        type: 'contact_updated',
        userId: user.id,
        data: {
          contact: await Contact.findByPk(contact.id)
        }
      };

      await automationEngine.processEvent(event);

      // Check if custom field was updated
      const updatedContact = await Contact.findByPk(contact.id);
      expect(updatedContact.customFields.customerType).toBe('Gold');
    });

    it('should update deal custom field using update_deal_field action', async () => {
      const automation = await Automation.create({
        userId: user.id,
        name: 'Update Deal Custom Field',
        trigger: { type: 'deal_updated' },
        conditions: [],
        actions: [
          {
            type: 'update_deal_field',
            config: { 
              field: 'customFields.priority', 
              value: 'Critical' 
            }
          }
        ],
        isActive: true
      });

      const event = {
        type: 'deal_updated',
        userId: user.id,
        data: {
          deal: await Deal.findByPk(deal.id, { include: ['Contact', 'Stage'] })
        }
      };

      await automationEngine.processEvent(event);

      // Check if custom field was updated
      const updatedDeal = await Deal.findByPk(deal.id);
      expect(updatedDeal.customFields.priority).toBe('Critical');
    });

    it('should update custom field using update_custom_field action', async () => {
      const automation = await Automation.create({
        userId: user.id,
        name: 'Update Custom Field Directly',
        trigger: { type: 'contact_updated' },
        conditions: [],
        actions: [
          {
            type: 'update_custom_field',
            config: { 
              entityType: 'contact',
              fieldName: 'customerType', 
              value: 'Platinum' 
            }
          }
        ],
        isActive: true
      });

      const event = {
        type: 'contact_updated',
        userId: user.id,
        data: {
          contact: await Contact.findByPk(contact.id)
        }
      };

      await automationEngine.processEvent(event);

      // Check if custom field was updated
      const updatedContact = await Contact.findByPk(contact.id);
      expect(updatedContact.customFields.customerType).toBe('Platinum');
    });
  });

  describe('Automation Enrollment Service - Custom Fields', () => {
    it('should evaluate custom field conditions in enrollment', async () => {
      const service = automationEnrollmentService;
      
      const automation = {
        id: 'test-automation',
        conditions: [
          {
            field: 'customFields.customerType',
            operator: 'equals',
            value: 'Silver'
          }
        ]
      };

      const contactEntity = await Contact.findByPk(contact.id);
      const shouldEnroll = await service.checkEnrollmentCriteria(
        automation,
        contactEntity,
        'contact_updated',
        { contact: contactEntity }
      );

      expect(shouldEnroll).toBe(true);
    });

    it('should handle nested custom field paths', () => {
      const service = automationEnrollmentService;
      
      const entity = {
        id: '123',
        name: 'Test',
        customFields: {
          nested: {
            value: 'test'
          }
        }
      };

      const value = service.getFieldValue('customFields.nested.value', entity);
      expect(value).toBe('test');
    });

    it('should return null for non-existent field paths', () => {
      const service = automationEnrollmentService;
      
      const entity = {
        id: '123',
        name: 'Test'
      };

      const value = service.getFieldValue('customFields.nonExistent', entity);
      expect(value).toBe(null);
    });
  });

  describe('Integration - End to End Custom Field Automation', () => {
    it('should create and execute automation with custom field condition and action', async () => {
      // Create automation via API
      const automationResponse = await request(app)
        .post('/api/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Upgrade Silver to Gold',
          description: 'Automatically upgrade silver customers to gold',
          trigger: { type: 'contact_updated' },
          conditions: [
            {
              field: 'customFields.customerType',
              operator: 'equals',
              value: 'Silver'
            }
          ],
          actions: [
            {
              type: 'update_contact_field',
              config: {
                field: 'customFields.customerType',
                value: 'Gold'
              }
            },
            {
              type: 'add_contact_tag',
              config: {
                tags: 'upgraded-to-gold'
              }
            }
          ]
        });

      expect(automationResponse.status).toBe(201);
      const automation = automationResponse.body.automation;

      // Trigger the automation
      const event = {
        type: 'contact_updated',
        userId: user.id,
        data: {
          contact: await Contact.findByPk(contact.id)
        }
      };

      await automationEngine.processEvent(event);

      // Verify results
      const updatedContact = await Contact.findByPk(contact.id);
      expect(updatedContact.customFields.customerType).toBe('Gold');
      expect(updatedContact.tags).toContain('upgraded-to-gold');

      // Verify automation log
      const log = await AutomationLog.findOne({
        where: { automationId: automation.id }
      });
      expect(log).toBeTruthy();
      expect(log.status).toBe('success');
      expect(log.conditionsMet).toBe(true);
    });
  });
});
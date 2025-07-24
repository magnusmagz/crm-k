const request = require('supertest');
const app = require('../server');
const { sequelize, User, Contact, Deal, Stage, Pipeline } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

describe('Import Deduplication Tests', () => {
  let authToken;
  let testUser;
  let testStage;

  beforeAll(async () => {
    // Clear database
    await sequelize.sync({ force: true });

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    testUser = await User.create({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User'
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Create a default pipeline and stage
    const pipeline = await Pipeline.create({
      userId: testUser.id,
      name: 'Sales Pipeline',
      isDefault: true
    });

    testStage = await Stage.create({
      userId: testUser.id,
      pipelineId: pipeline.id,
      name: 'Proposal',
      order: 1,
      color: '#3B82F6'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Contact Import Deduplication', () => {
    beforeEach(async () => {
      // Clear contacts before each test
      await Contact.destroy({ where: { userId: testUser.id } });
    });

    test('Skip strategy - should skip duplicate contacts', async () => {
      // Create existing contact
      await Contact.create({
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });

      // Import CSV with duplicate
      const csvContent = `First Name,Last Name,Email,Company
John,Doe,john@example.com,Acme Corp
Jane,Smith,jane@example.com,Tech Co
John,Doe,john@example.com,Updated Corp`;

      const response = await request(app)
        .post('/api/contacts/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'First Name': 'firstName',
          'Last Name': 'lastName',
          'Email': 'email',
          'Company': 'company'
        }))
        .field('duplicateStrategy', 'skip');

      expect(response.status).toBe(200);
      expect(response.body.results.created).toBe(1); // Only Jane
      expect(response.body.results.skipped).toBe(2); // Both Johns

      // Verify database
      const contacts = await Contact.findAll({ where: { userId: testUser.id } });
      expect(contacts.length).toBe(2);
      
      const john = contacts.find(c => c.email === 'john@example.com');
      expect(john.company).toBe('Acme Corp'); // Original not updated
    });

    test('Update strategy - should update existing contacts', async () => {
      // Create existing contact
      await Contact.create({
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Old Corp'
      });

      // Import CSV with updates
      const csvContent = `First Name,Last Name,Email,Company,Phone
John,Doe,john@example.com,New Corp,555-1234
Jane,Smith,jane@example.com,Tech Co,555-5678`;

      const response = await request(app)
        .post('/api/contacts/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'First Name': 'firstName',
          'Last Name': 'lastName',
          'Email': 'email',
          'Company': 'company',
          'Phone': 'phone'
        }))
        .field('duplicateStrategy', 'update');

      expect(response.status).toBe(200);
      expect(response.body.results.created).toBe(1); // Jane
      expect(response.body.results.updated).toBe(1); // John

      // Verify updates
      const john = await Contact.findOne({ 
        where: { email: 'john@example.com', userId: testUser.id } 
      });
      expect(john.company).toBe('New Corp');
      expect(john.phone).toBe('555-1234');
    });

    test('Create strategy - should create duplicates', async () => {
      // Create existing contact
      await Contact.create({
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });

      // Import CSV with duplicate
      const csvContent = `First Name,Last Name,Email
John,Doe,john@example.com
John,Doe,john@example.com`;

      const response = await request(app)
        .post('/api/contacts/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'First Name': 'firstName',
          'Last Name': 'lastName',
          'Email': 'email'
        }))
        .field('duplicateStrategy', 'create');

      expect(response.status).toBe(200);
      expect(response.body.results.created).toBe(2);

      // Verify all created
      const contacts = await Contact.findAll({ 
        where: { email: 'john@example.com', userId: testUser.id } 
      });
      expect(contacts.length).toBe(3); // 1 existing + 2 imported
    });

    test('Deduplication by email (case-insensitive)', async () => {
      await Contact.create({
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'John@Example.com'
      });

      const csvContent = `First Name,Last Name,Email
John,Doe,john@example.com
Johnny,Doe,JOHN@EXAMPLE.COM`;

      const response = await request(app)
        .post('/api/contacts/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'First Name': 'firstName',
          'Last Name': 'lastName',
          'Email': 'email'
        }))
        .field('duplicateStrategy', 'skip');

      expect(response.status).toBe(200);
      expect(response.body.results.skipped).toBe(2);
      expect(response.body.results.created).toBe(0);
    });
  });

  describe('Deal Import Deduplication', () => {
    let testContact;

    beforeEach(async () => {
      // Clear deals and create test contact
      await Deal.destroy({ where: { userId: testUser.id } });
      await Contact.destroy({ where: { userId: testUser.id } });
      
      testContact = await Contact.create({
        userId: testUser.id,
        firstName: 'Test',
        lastName: 'Contact',
        email: 'test@example.com'
      });
    });

    test('Skip strategy - should skip duplicate deals', async () => {
      // Create existing deal
      await Deal.create({
        userId: testUser.id,
        name: 'Website Redesign',
        value: 5000,
        stageId: testStage.id,
        contactId: testContact.id
      });

      // Import CSV with duplicate
      const csvContent = `Deal Name,Value,Contact Email
Website Redesign,6000,test@example.com
Mobile App,10000,test@example.com
Website Redesign,7000,test@example.com`;

      const response = await request(app)
        .post('/api/deals/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'Deal Name': 'name',
          'Value': 'value',
          'Contact Email': 'contactEmail'
        }))
        .field('duplicateStrategy', 'skip')
        .field('contactStrategy', 'match')
        .field('defaultStageId', testStage.id);

      expect(response.status).toBe(200);
      expect(response.body.results.created).toBe(1); // Only Mobile App
      expect(response.body.results.skipped).toBe(2); // Both Website Redesigns

      // Verify original value unchanged
      const deal = await Deal.findOne({ 
        where: { name: 'Website Redesign', userId: testUser.id } 
      });
      expect(deal.value).toBe('5000.00');
    });

    test('Update strategy - should update existing deals', async () => {
      // Create existing deal
      await Deal.create({
        userId: testUser.id,
        name: 'Website Redesign',
        value: 5000,
        stageId: testStage.id,
        contactId: testContact.id,
        notes: 'Initial notes'
      });

      // Import CSV with updates
      const csvContent = `Deal Name,Value,Contact Email,Notes
Website Redesign,8000,test@example.com,Updated notes
New Deal,3000,test@example.com,New deal notes`;

      const response = await request(app)
        .post('/api/deals/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'Deal Name': 'name',
          'Value': 'value',
          'Contact Email': 'contactEmail',
          'Notes': 'notes'
        }))
        .field('duplicateStrategy', 'update')
        .field('contactStrategy', 'match')
        .field('defaultStageId', testStage.id);

      expect(response.status).toBe(200);
      expect(response.body.results.created).toBe(1); // New Deal
      expect(response.body.results.updated).toBe(1); // Website Redesign

      // Verify update
      const deal = await Deal.findOne({ 
        where: { name: 'Website Redesign', userId: testUser.id } 
      });
      expect(deal.value).toBe('8000.00');
      expect(deal.notes).toBe('Updated notes');
    });

    test('Deduplication considers both name and contact', async () => {
      // Create another contact
      const contact2 = await Contact.create({
        userId: testUser.id,
        firstName: 'Another',
        lastName: 'Contact',
        email: 'another@example.com'
      });

      // Create deal with same name but different contact
      await Deal.create({
        userId: testUser.id,
        name: 'Website Redesign',
        value: 5000,
        stageId: testStage.id,
        contactId: testContact.id
      });

      // Import same deal name but different contact
      const csvContent = `Deal Name,Value,Contact Email
Website Redesign,6000,another@example.com`;

      const response = await request(app)
        .post('/api/deals/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'Deal Name': 'name',
          'Value': 'value',
          'Contact Email': 'contactEmail'
        }))
        .field('duplicateStrategy', 'skip')
        .field('contactStrategy', 'match')
        .field('defaultStageId', testStage.id);

      expect(response.status).toBe(200);
      expect(response.body.results.created).toBe(1); // Should create because different contact
      expect(response.body.results.skipped).toBe(0);

      // Verify both deals exist
      const deals = await Deal.findAll({ 
        where: { name: 'Website Redesign', userId: testUser.id } 
      });
      expect(deals.length).toBe(2);
    });

    test('Contact creation during deal import', async () => {
      const csvContent = `Deal Name,Value,Contact Email,First Name,Last Name
New Deal,5000,newcontact@example.com,New,Contact
Another Deal,3000,another@example.com,Another,Person`;

      const response = await request(app)
        .post('/api/deals/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'Deal Name': 'name',
          'Value': 'value',
          'Contact Email': 'contactEmail',
          'First Name': 'contactFirstName',
          'Last Name': 'contactLastName'
        }))
        .field('duplicateStrategy', 'skip')
        .field('contactStrategy', 'create')
        .field('defaultStageId', testStage.id);

      expect(response.status).toBe(200);
      expect(response.body.results.created).toBe(2);

      // Verify contacts were created
      const contacts = await Contact.findAll({ 
        where: { userId: testUser.id } 
      });
      expect(contacts.length).toBe(3); // 1 existing + 2 new

      const newContact = contacts.find(c => c.email === 'newcontact@example.com');
      expect(newContact.firstName).toBe('New');
      expect(newContact.lastName).toBe('Contact');
    });
  });

  describe('Large File Deduplication', () => {
    test('Chunked import respects deduplication', async () => {
      // Create a large CSV (600 rows to trigger chunked import)
      const rows = ['First Name,Last Name,Email,Company'];
      
      // Add some duplicates throughout
      for (let i = 0; i < 600; i++) {
        if (i % 100 === 0) {
          rows.push('John,Doe,john@example.com,Company ' + i);
        } else {
          rows.push(`User${i},Test${i},user${i}@example.com,Company ${i}`);
        }
      }
      
      const csvContent = rows.join('\n');

      const response = await request(app)
        .post('/api/contacts/import/start')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'large.csv')
        .field('fieldMapping', JSON.stringify({
          'First Name': 'firstName',
          'Last Name': 'lastName',
          'Email': 'email',
          'Company': 'company'
        }))
        .field('duplicateStrategy', 'skip');

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBeDefined();

      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check job status
      const statusResponse = await request(app)
        .get(`/api/contacts/import/status/${response.body.jobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.body.status).toBe('completed');
      expect(statusResponse.body.created).toBe(595); // 600 total - 5 duplicates (johns) = 595
      expect(statusResponse.body.skipped).toBe(5); // 5 duplicate johns
    });
  });
});
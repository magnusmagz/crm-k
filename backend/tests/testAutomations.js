#!/usr/bin/env node

/**
 * Manual Automation Testing Script
 * This script tests various automation scenarios without requiring Jest
 */

const { 
  User, 
  Contact, 
  Deal, 
  Stage, 
  Automation, 
  AutomationEnrollment,
  AutomationLog,
  sequelize 
} = require('../models');
const automationEmitter = require('../services/eventEmitter');
const automationEngine = require('../services/automationEngineV2');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'bright');
  console.log('='.repeat(50));
}

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : '❌';
  const color = status === 'pass' ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function waitForAutomation(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupTestData(userId) {
  await AutomationLog.destroy({ where: { userId } });
  await AutomationEnrollment.destroy({ where: { userId } });
  await Automation.destroy({ where: { userId } });
  await Deal.destroy({ where: { userId } });
  await Contact.destroy({ where: { userId } });
  await Stage.destroy({ where: { userId } });
  await User.destroy({ where: { id: userId } });
}

async function runTests() {
  let testUser;
  let testStages = [];
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    logSection('AUTOMATION SYSTEM TEST SUITE');
    log('Starting tests...', 'cyan');

    // Setup test data
    logSection('Test Setup');
    
    testUser = await User.create({
      email: `test-${Date.now()}@example.com`,
      password: 'testpass123',
      isVerified: true
    });
    log('Created test user', 'green');

    // Create stages
    const stageNames = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
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
    log(`Created ${testStages.length} stages`, 'green');

    // Test 1: Contact Creation Automation
    logSection('Test 1: Contact Creation Automation');
    
    const contactCreationAuto = await Automation.create({
      userId: testUser.id,
      name: 'Welcome New Contacts',
      trigger: { type: 'contact_created' },
      conditions: [],
      actions: [{
        type: 'add_contact_tag',
        config: { tag: 'new-lead' }
      }],
      isActive: true,
      isMultiStep: false
    });

    const testContact1 = await Contact.create({
      userId: testUser.id,
      firstName: 'Test',
      lastName: 'Contact',
      email: 'test@example.com',
      tags: []
    });

    automationEmitter.emitContactCreated(testUser.id, testContact1.toJSON());
    await waitForAutomation();

    const updatedContact1 = await Contact.findByPk(testContact1.id);
    if (updatedContact1.tags.includes('new-lead')) {
      logTest('Contact creation trigger', 'pass', 'Tag "new-lead" added successfully');
      testsPassed++;
    } else {
      logTest('Contact creation trigger', 'fail', 'Tag not added');
      testsFailed++;
    }

    // Test 2: Conditional Automation
    logSection('Test 2: Conditional Automation');
    
    const conditionalAuto = await Automation.create({
      userId: testUser.id,
      name: 'VIP Customer Detection',
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

    const vipContact = await Contact.create({
      userId: testUser.id,
      firstName: 'VIP',
      lastName: 'Customer',
      company: 'Acme Corp',
      tags: []
    });

    automationEmitter.emitContactCreated(testUser.id, vipContact.toJSON());
    await waitForAutomation();

    const updatedVIP = await Contact.findByPk(vipContact.id);
    if (updatedVIP.tags.includes('vip')) {
      logTest('Conditional automation (matching)', 'pass', 'VIP tag added for Acme Corp');
      testsPassed++;
    } else {
      logTest('Conditional automation (matching)', 'fail', 'VIP tag not added');
      testsFailed++;
    }

    // Test non-matching condition
    const regularContact = await Contact.create({
      userId: testUser.id,
      firstName: 'Regular',
      lastName: 'Customer',
      company: 'Other Corp',
      tags: []
    });

    automationEmitter.emitContactCreated(testUser.id, regularContact.toJSON());
    await waitForAutomation();

    const updatedRegular = await Contact.findByPk(regularContact.id);
    if (!updatedRegular.tags.includes('vip')) {
      logTest('Conditional automation (non-matching)', 'pass', 'VIP tag correctly not added');
      testsPassed++;
    } else {
      logTest('Conditional automation (non-matching)', 'fail', 'VIP tag incorrectly added');
      testsFailed++;
    }

    // Test 3: Deal Stage Change Automation
    logSection('Test 3: Deal Stage Change Automation');
    
    const dealContact = await Contact.create({
      userId: testUser.id,
      firstName: 'Deal',
      lastName: 'Contact',
      tags: []
    });

    const stageChangeAuto = await Automation.create({
      userId: testUser.id,
      name: 'Deal Progressed',
      trigger: { type: 'deal_stage_changed' },
      conditions: [],
      actions: [{
        type: 'add_contact_tag',
        config: { tag: 'deal-progressed' }
      }],
      isActive: true,
      isMultiStep: false
    });

    const testDeal = await Deal.create({
      userId: testUser.id,
      contactId: dealContact.id,
      stageId: testStages[0].id,
      name: 'Test Deal',
      value: 5000,
      status: 'open'
    });

    // Change stage
    await testDeal.update({ stageId: testStages[1].id });
    const dealWithAssoc = await Deal.findByPk(testDeal.id, {
      include: ['Contact', 'Stage']
    });

    automationEmitter.emitDealStageChanged(
      testUser.id,
      dealWithAssoc.toJSON(),
      testStages[0].toJSON(),
      testStages[1].toJSON()
    );
    
    await waitForAutomation();

    const updatedDealContact = await Contact.findByPk(dealContact.id);
    if (updatedDealContact.tags.includes('deal-progressed')) {
      logTest('Deal stage change trigger', 'pass', 'Tag added on stage change');
      testsPassed++;
    } else {
      logTest('Deal stage change trigger', 'fail', 'Tag not added on stage change');
      testsFailed++;
    }

    // Test 4: Multiple Conditions (AND logic)
    logSection('Test 4: Multiple Conditions with AND Logic');
    
    const multiConditionAuto = await Automation.create({
      userId: testUser.id,
      name: 'Hot Lead Detection',
      trigger: { type: 'contact_updated' },
      conditions: [
        {
          field: 'tags',
          operator: 'has_tag',
          value: 'interested',
          logic: 'AND'
        },
        {
          field: 'company',
          operator: 'is_not_empty',
          value: '',
          logic: 'AND'
        }
      ],
      actions: [{
        type: 'add_contact_tag',
        config: { tag: 'hot-lead' }
      }],
      isActive: true,
      isMultiStep: false
    });

    const potentialLead = await Contact.create({
      userId: testUser.id,
      firstName: 'Potential',
      lastName: 'Lead',
      company: 'Tech Startup',
      tags: []
    });

    // Update to trigger automation
    await potentialLead.update({ tags: ['interested'] });
    automationEmitter.emitContactUpdated(testUser.id, potentialLead.toJSON(), ['tags']);
    await waitForAutomation();

    const updatedLead = await Contact.findByPk(potentialLead.id);
    if (updatedLead.tags.includes('hot-lead')) {
      logTest('Multiple AND conditions', 'pass', 'Hot lead tag added correctly');
      testsPassed++;
    } else {
      logTest('Multiple AND conditions', 'fail', 'Hot lead tag not added');
      testsFailed++;
    }

    // Test 5: Deal Value Automation
    logSection('Test 5: Deal Value-Based Automation');
    
    const dealValueAuto = await Automation.create({
      userId: testUser.id,
      name: 'High Value Deal Alert',
      trigger: { type: 'deal_created' },
      conditions: [{
        field: 'value',
        operator: 'greater_than',
        value: 10000
      }],
      actions: [{
        type: 'update_deal_field',
        config: { field: 'notes', value: 'HIGH PRIORITY - Large deal value!' }
      }],
      isActive: true,
      isMultiStep: false
    });

    const highValueDeal = await Deal.create({
      userId: testUser.id,
      stageId: testStages[0].id,
      name: 'Enterprise Deal',
      value: 50000,
      status: 'open'
    });

    automationEmitter.emitDealCreated(testUser.id, highValueDeal.toJSON());
    await waitForAutomation();

    const updatedDeal = await Deal.findByPk(highValueDeal.id);
    if (updatedDeal.notes === 'HIGH PRIORITY - Large deal value!') {
      logTest('Deal value condition', 'pass', 'High value deal marked correctly');
      testsPassed++;
    } else {
      logTest('Deal value condition', 'fail', 'Deal notes not updated');
      testsFailed++;
    }

    // Test 6: Check Automation Statistics
    logSection('Test 6: Automation Statistics');
    
    const statsAuto = await Automation.findByPk(contactCreationAuto.id);
    if (statsAuto.enrolledCount > 0 && statsAuto.completedEnrollments > 0) {
      logTest('Automation statistics tracking', 'pass', 
        `Enrolled: ${statsAuto.enrolledCount}, Completed: ${statsAuto.completedEnrollments}`);
      testsPassed++;
    } else {
      logTest('Automation statistics tracking', 'fail', 'Statistics not tracked');
      testsFailed++;
    }

    // Check logs
    const logs = await AutomationLog.count({
      where: { 
        userId: testUser.id,
        status: 'success'
      }
    });
    
    log(`\n📊 Total successful automation executions: ${logs}`, 'cyan');

    // Summary
    logSection('TEST SUMMARY');
    log(`Tests Passed: ${testsPassed}`, 'green');
    log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
    log(`Total Tests: ${testsPassed + testsFailed}`, 'bright');
    
    const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
    log(`Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');

  } catch (error) {
    log('\n❌ Test suite error:', 'red');
    console.error(error);
    testsFailed++;
  } finally {
    // Cleanup
    logSection('Cleanup');
    if (testUser) {
      await cleanupTestData(testUser.id);
      log('Test data cleaned up', 'green');
    }
    
    // Close database connection
    await sequelize.close();
    log('Database connection closed', 'green');
    
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

// Run tests
log('🧪 CRM Automation Test Suite', 'bright');
log('Testing automation engine functionality...', 'cyan');

runTests().catch(error => {
  log('Fatal error:', 'red');
  console.error(error);
  process.exit(1);
});
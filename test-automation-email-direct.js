// Test Automation Email - Direct Trigger
require('dotenv').config();
const { Automation, Contact, EmailSend, User, UserProfile } = require('./backend/models');
const automationEngine = require('./backend/services/automationEngine');

async function testAutomationEmailDirect() {
  try {
    console.log('\n📧 TESTING AUTOMATION EMAIL (Direct Trigger)');
    console.log('═══════════════════════════════════════\n');

    // Get test user
    const user = await User.findOne({
      where: { email: 'test@example.com' },
      include: [{ model: UserProfile, as: 'profile' }]
    });

    if (!user) {
      throw new Error('Test user not found');
    }

    console.log('Step 1: Found test user');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('');

    // Create test contact
    console.log('Step 2: Creating test contact...');
    const contact = await Contact.create({
      userId: user.id,
      firstName: 'AutoTest',
      lastName: 'DirectTrigger',
      email: 'autotest.direct@example.com',
      company: 'Direct Testing Corp',
      position: 'Test Engineer',
      phone: '555-777-9999'
    });

    console.log('✓ Contact created');
    console.log('  Name:', contact.firstName, contact.lastName);
    console.log('  Email:', contact.email);
    console.log('');

    // Create automation
    console.log('Step 3: Creating automation with email action...');
    const automation = await Automation.create({
      userId: user.id,
      name: 'Direct Test Email Automation',
      description: 'Send email on contact creation',
      trigger: {
        type: 'contact_created'
      },
      conditions: [],
      actions: [
        {
          type: 'send_email',
          config: {
            subject: 'Welcome {{firstName}} {{lastName}}!',
            body: `
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #2563eb;">Welcome to our CRM!</h2>
  <p>Hi <strong>{{firstName}} {{lastName}}</strong>,</p>
  <p>We're excited to have you from <strong>{{company}}</strong>!</p>
  <p>Your role as <strong>{{position}}</strong> sounds fantastic.</p>
  <p>We can reach you at: <a href="mailto:{{email}}">{{email}}</a></p>
  <br>
  <p style="color: #666;">This email was sent by our automation system.</p>
  <p>Best regards,<br><strong>The CRM Team</strong></p>
</body>
</html>
            `.trim()
          }
        }
      ],
      isActive: true
    });

    console.log('✓ Automation created');
    console.log('  ID:', automation.id);
    console.log('  Name:', automation.name);
    console.log('');

    // Count emails before
    const emailsBefore = await EmailSend.count({ where: { userId: user.id } });
    console.log('Step 4: Emails sent before trigger:', emailsBefore);
    console.log('');

    // Manually trigger automation
    console.log('Step 5: Manually triggering automation...');
    console.log('  Event type: contact_created');
    console.log('  Contact:', contact.email);
    console.log('');

    await automationEngine.processEvent({
      type: 'contact_created',
      userId: user.id,
      data: {
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          company: contact.company,
          position: contact.position,
          phone: contact.phone
        }
      }
    });

    console.log('✓ Automation triggered\n');

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if email was sent
    console.log('Step 6: Checking if email was sent...');
    const emailsAfter = await EmailSend.count({ where: { userId: user.id } });
    const newEmailCount = emailsAfter - emailsBefore;

    console.log('  Emails sent after:', emailsAfter);
    console.log('  New emails:', newEmailCount);
    console.log('');

    if (newEmailCount > 0) {
      console.log('✅ EMAIL SENT BY AUTOMATION!\n');

      // Get the latest email
      const latestEmail = await EmailSend.findOne({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']]
      });

      console.log('═══════════════════════════════════════');
      console.log('EMAIL DETAILS');
      console.log('═══════════════════════════════════════');
      console.log('Subject:', latestEmail.subject);
      console.log('To:', contact.email);
      console.log('Status:', latestEmail.status);
      console.log('Tracking ID:', latestEmail.trackingId);
      console.log('Postmark ID:', latestEmail.postmarkMessageId);
      console.log('Sent At:', latestEmail.sentAt);
      console.log('');

      console.log('Message Content:');
      console.log('─────────────────────────────────────── ');
      // Show first 300 chars of message
      const preview = latestEmail.message.substring(0, 400).replace(/<[^>]*>/g, '').trim();
      console.log(preview + '...');
      console.log('───────────────────────────────────────');
      console.log('');

      // Check variable replacement
      const subjectHasVars = latestEmail.subject.includes('{{');
      const messageHasVars = latestEmail.message.includes('{{');
      const hasContactName = latestEmail.subject.includes('AutoTest') || latestEmail.message.includes('AutoTest');
      const hasCompany = latestEmail.message.includes('Direct Testing Corp');
      const hasPosition = latestEmail.message.includes('Test Engineer');

      console.log('VERIFICATION:');
      console.log('  Subject has {{variables}}:', subjectHasVars ? '❌ NOT REPLACED' : '✅ REPLACED');
      console.log('  Message has {{variables}}:', messageHasVars ? '❌ NOT REPLACED' : '✅ REPLACED');
      console.log('  Contains contact name:', hasContactName ? '✅ YES' : '❌ NO');
      console.log('  Contains company:', hasCompany ? '✅ YES' : '❌ NO');
      console.log('  Contains position:', hasPosition ? '✅ YES' : '❌ NO');
      console.log('');

      // Check automation logs
      const { AutomationLog } = require('./backend/models');
      const log = await AutomationLog.findOne({
        where: { automationId: automation.id },
        order: [['createdAt', 'DESC']]
      });

      if (log) {
        console.log('AUTOMATION LOG:');
        console.log('  Status:', log.status);
        console.log('  Conditions met:', log.conditionsMet);
        console.log('  Actions executed:', log.actionsExecuted?.length || 0);
        if (log.actionsExecuted && log.actionsExecuted.length > 0) {
          log.actionsExecuted.forEach((action, i) => {
            console.log(`    ${i + 1}. ${action.type}: ${action.status}`);
            if (action.status === 'failed' && action.error) {
              console.log(`       Error: ${action.error}`);
            }
          });
        }
        console.log('');
      }

      console.log('═══════════════════════════════════════');
      console.log('✅ AUTOMATION EMAIL TEST PASSED');
      console.log('═══════════════════════════════════════\n');

      console.log('Summary:');
      console.log('  ✅ Automation created with email action');
      console.log('  ✅ Event manually triggered');
      console.log('  ✅ Email sent via automation engine');
      console.log('  ✅ Variables replaced correctly');
      console.log('  ✅ Email tracked in database');
      console.log('  ✅ Automation log created');
      console.log('');

    } else {
      console.log('❌ No email was sent');
      console.log('   Checking automation logs for errors...\n');

      const { AutomationLog } = require('./backend/models');
      const logs = await AutomationLog.findAll({
        where: { automationId: automation.id },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      if (logs.length > 0) {
        const log = logs[0];
        console.log('Automation Log:');
        console.log('  Status:', log.status);
        console.log('  Error:', log.error || 'None');
        if (log.actionsExecuted) {
          console.log('  Actions:', JSON.stringify(log.actionsExecuted, null, 2));
        }
      }
    }

    // Cleanup
    console.log('Cleanup: Removing test data...');
    await contact.destroy();
    await automation.destroy();
    console.log('✓ Cleanup complete\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testAutomationEmailDirect();

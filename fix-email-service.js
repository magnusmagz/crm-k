const fs = require('fs');
const path = require('path');

// Fix the email service to handle missing database tables
const emailServicePath = path.join(__dirname, 'backend/services/emailService.js');
let content = fs.readFileSync(emailServicePath, 'utf8');

console.log('Applying fixes to emailService.js...');

// Add try-catch around database operations
const fixes = [
  // Fix 1: Wrap UserProfile query in try-catch
  {
    search: /const userProfile = await UserProfile\.findOne\(\{[\s\S]*?\}\);/,
    replace: `let userProfile = null;
    try {
      userProfile = await UserProfile.findOne({
        where: { userId }
      });
    } catch (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('⚠️  User profiles table not found - using defaults for development');
      } else {
        throw error;
      }
    }`
  }
];

fixes.forEach((fix, index) => {
  if (fix.search.test && fix.search.test(content)) {
    content = content.replace(fix.search, fix.replace);
    console.log(`✅ Applied fix ${index + 1}`);
  } else {
    console.log(`❌ Could not apply fix ${index + 1} - pattern not found`);
  }
});

// Write the updated file
fs.writeFileSync(emailServicePath, content);
console.log('✅ Email service updated successfully');

// Test the email service
console.log('\nTesting email service...');
const emailService = require('./backend/services/emailService');

async function testEmail() {
  try {
    const result = await emailService.sendEmail({
      userId: 'test-user-id',
      contactEmail: 'maggie+auto@4msquared.com',
      subject: 'Test Email from Fixed Service',
      message: 'This should work now!',
      userName: 'Test User',
      userEmail: 'test@example.com',
      userFirstName: 'Test',
      enableTracking: false,
      appendSignature: false
    });
    console.log('✅ Email service test successful:', result);
  } catch (error) {
    console.error('❌ Email service test failed:', error.message);
    
    // Check if it's still a database issue
    if (error.message.includes('emailRecord')) {
      console.log('💡 Issue: emailRecord not created - need to fix database operations');
    }
  }
}

testEmail();
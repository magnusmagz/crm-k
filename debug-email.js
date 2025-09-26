const emailService = require('./backend/services/emailService');

// Test email sending directly
async function debugEmailSending() {
  console.log('🔍 Debug: Testing email service for maggie+auto@4msquared.com');
  
  try {
    // Test basic email sending
    const result = await emailService.sendEmail({
      userId: 'test-user-id',
      contactEmail: 'maggie+auto@4msquared.com',
      subject: 'Test Email from Automation Debug',
      message: 'This is a test email to debug the automation email sending.',
      userName: 'Debug Test',
      userEmail: 'debug@crmkiller.com',
      userFirstName: 'Debug',
      enableTracking: false,
      appendSignature: false
    });
    
    console.log('✅ Email service result:', result);
    
    // Check if email service has any specific validation for this email
    console.log('\n🔍 Testing email validation...');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidFormat = emailRegex.test('maggie+auto@4msquared.com');
    console.log('Email format valid:', isValidFormat);
    
  } catch (error) {
    console.error('❌ Email sending failed:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    });
    
    // Check if it's a database issue
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n💡 This appears to be a database table issue. The email service requires certain tables to exist.');
    }
  }
}

// Run the debug
debugEmailSending();
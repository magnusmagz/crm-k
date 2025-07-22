/**
 * Debug automation failures for a specific contact
 * 
 * This script provides API endpoints to debug automation failures:
 * 
 * 1. GET /automations/debug/entity/contact/{contactId} - Get debug logs for a contact
 * 2. GET /automations/{automationId}/logs - Get logs for a specific automation
 * 3. GET /automations/{automationId}/enrollments - Get enrollment info
 * 4. POST /automations/enrollment/{enrollmentId}/process - Manually process an enrollment
 * 
 * Usage:
 * 1. First, get debug logs for the contact to see all automation activity
 * 2. Check specific automation logs if needed
 * 3. Look at enrollment status
 * 4. Manually process stuck enrollments if necessary
 */

const axios = require('axios');

class AutomationDebugAPI {
  constructor(baseURL, authToken) {
    this.baseURL = baseURL;
    this.headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Get debug logs for a specific contact
  async getContactDebugLogs(contactId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/automations/debug/entity/contact/${contactId}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching contact debug logs:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get logs for a specific automation
  async getAutomationLogs(automationId, limit = 100) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/automations/${automationId}/logs?limit=${limit}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching automation logs:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get enrollment summary for an automation
  async getAutomationEnrollments(automationId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/automations/${automationId}/enrollments`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching enrollments:', error.response?.data || error.message);
      throw error;
    }
  }

  // Manually process a stuck enrollment
  async processEnrollment(enrollmentId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/automations/enrollment/${enrollmentId}/process`,
        {},
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error processing enrollment:', error.response?.data || error.message);
      throw error;
    }
  }

  // Debug a contact's automation failures
  async debugContactAutomations(contactId) {
    console.log(`\n=== Debugging Automations for Contact: ${contactId} ===\n`);

    try {
      // 1. Get debug logs
      console.log('1. Fetching debug logs...');
      const debugData = await this.getContactDebugLogs(contactId);
      
      console.log(`\nFound ${debugData.debugLogs.length} debug logs`);
      console.log(`Found ${debugData.enrollments.length} enrollments`);
      
      // 2. Analyze enrollments
      console.log('\n2. Analyzing enrollments...');
      for (const enrollment of debugData.enrollments) {
        console.log(`\n- Enrollment: ${enrollment.id}`);
        console.log(`  Automation: ${enrollment.Automation?.name || 'Unknown'}`);
        console.log(`  Status: ${enrollment.status}`);
        console.log(`  Created: ${enrollment.createdAt}`);
        
        if (enrollment.status === 'failed') {
          console.log(`  ❌ FAILED - Check metadata for errors`);
        } else if (enrollment.status === 'active' && new Date(enrollment.nextStepAt) < new Date()) {
          console.log(`  ⚠️  STUCK - Next step was due at ${enrollment.nextStepAt}`);
          console.log(`  💡 Consider manually processing this enrollment`);
        }
      }

      // 3. Analyze debug logs
      if (debugData.debugLogs.length > 0) {
        console.log('\n3. Recent debug events:');
        const recentLogs = debugData.debugLogs.slice(0, 10);
        for (const log of recentLogs) {
          console.log(`\n[${log.timestamp}] ${log.event}`);
          if (log.level === 'error') {
            console.log(`  ❌ ERROR: ${JSON.stringify(log.data)}`);
          } else if (log.event === 'CONDITION_EVALUATION' && !log.data.result) {
            console.log(`  ❌ Condition failed: ${log.data.evaluation}`);
          }
        }
      }

      // 4. Provide recommendations
      console.log('\n4. Recommendations:');
      
      const stuckEnrollments = debugData.enrollments.filter(e => 
        e.status === 'active' && new Date(e.nextStepAt) < new Date()
      );
      
      if (stuckEnrollments.length > 0) {
        console.log(`\n⚠️  Found ${stuckEnrollments.length} stuck enrollment(s)`);
        console.log('To process them manually:');
        for (const enrollment of stuckEnrollments) {
          console.log(`  await api.processEnrollment('${enrollment.id}')`);
        }
      }

      if (!debugData.debugMode) {
        console.log('\n💡 Debug mode is disabled. Enable it for more detailed logs:');
        console.log('   Set AUTOMATION_DEBUG=true in environment variables');
      }

      return debugData;

    } catch (error) {
      console.error('Debug failed:', error.message);
      throw error;
    }
  }
}

// Example usage
async function example() {
  const api = new AutomationDebugAPI('http://localhost:3000', 'your-auth-token');
  
  // Debug specific contact
  const contactId = '73ad755e-887e-4fc2-91c8-2f368d44cc1b';
  await api.debugContactAutomations(contactId);
  
  // Process a stuck enrollment manually
  // const enrollmentId = 'enrollment-id-here';
  // const result = await api.processEnrollment(enrollmentId);
  // console.log('Processing result:', result);
}

// Export for use in other scripts
module.exports = AutomationDebugAPI;

// If running directly
if (require.main === module) {
  const [,, action, ...args] = process.argv;
  
  if (!action) {
    console.log('Usage:');
    console.log('  node debugAutomationAPI.js debug-contact <contactId> <baseURL> <authToken>');
    console.log('  node debugAutomationAPI.js process-enrollment <enrollmentId> <baseURL> <authToken>');
    process.exit(1);
  }
  
  const baseURL = args[1] || 'http://localhost:3000';
  const authToken = args[2] || process.env.AUTH_TOKEN;
  
  if (!authToken) {
    console.error('Auth token required. Set AUTH_TOKEN env variable or pass as argument.');
    process.exit(1);
  }
  
  const api = new AutomationDebugAPI(baseURL, authToken);
  
  switch (action) {
    case 'debug-contact':
      if (!args[0]) {
        console.error('Contact ID required');
        process.exit(1);
      }
      api.debugContactAutomations(args[0])
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'process-enrollment':
      if (!args[0]) {
        console.error('Enrollment ID required');
        process.exit(1);
      }
      api.processEnrollment(args[0])
        .then(result => {
          console.log('Success:', result);
          process.exit(0);
        })
        .catch(() => process.exit(1));
      break;
      
    default:
      console.error(`Unknown action: ${action}`);
      process.exit(1);
  }
}
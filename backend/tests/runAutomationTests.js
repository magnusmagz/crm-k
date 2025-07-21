#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🧪 Running Automation Tests...\n');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.AUTOMATION_DEBUG = 'true';

// Load test environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

// Run Jest with automation test file
const jestCommand = 'npx jest backend/tests/automation.test.js --runInBand --forceExit';

const testProcess = exec(jestCommand, (error, stdout, stderr) => {
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  
  if (error) {
    console.error(`\n❌ Tests failed with error: ${error.message}`);
    process.exit(1);
  } else {
    console.log('\n✅ All automation tests passed!');
    process.exit(0);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test run interrupted');
  testProcess.kill();
  process.exit(1);
});
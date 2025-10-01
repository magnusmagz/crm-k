/**
 * Push Notification Setup Verification Script
 *
 * This script verifies that the Web Push notification infrastructure
 * is properly set up and configured.
 *
 * Usage: node backend/scripts/verify-push-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('  Push Notification Setup Verification');
console.log('========================================\n');

let errors = 0;
let warnings = 0;

// Check 1: Verify web-push package is installed
console.log('✓ Checking dependencies...');
try {
  require('web-push');
  console.log('  ✓ web-push package installed');
} catch (error) {
  console.error('  ✗ web-push package NOT installed');
  console.error('    Run: npm install web-push --save');
  errors++;
}

// Check 2: Verify environment variables
console.log('\n✓ Checking environment variables...');
const requiredEnvVars = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'];
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  ✓ ${varName} is set`);
  } else {
    console.warn(`  ⚠ ${varName} is NOT set`);
    warnings++;
  }
});

if (warnings > 0) {
  console.log('\n  Note: Environment variables are required for push notifications to work.');
  console.log('  Run: node backend/scripts/generate-vapid-keys.js');
}

// Check 3: Verify service module loads
console.log('\n✓ Checking service module...');
try {
  const pushService = require('../services/pushNotificationService');
  console.log('  ✓ pushNotificationService.js loads');

  if (typeof pushService.sendPushNotification === 'function') {
    console.log('  ✓ sendPushNotification() function exists');
  }
  if (typeof pushService.sendToUser === 'function') {
    console.log('  ✓ sendToUser() function exists');
  }
  if (typeof pushService.sendToUsers === 'function') {
    console.log('  ✓ sendToUsers() function exists');
  }
  if (typeof pushService.getVapidPublicKey === 'function') {
    console.log('  ✓ getVapidPublicKey() function exists');
  }
  if (typeof pushService.isPushConfigured === 'function') {
    console.log('  ✓ isPushConfigured() function exists');
  }

  console.log(`  ℹ Push configured: ${pushService.isPushConfigured()}`);
} catch (error) {
  console.error('  ✗ Error loading pushNotificationService.js');
  console.error('    ', error.message);
  errors++;
}

// Check 4: Verify model loads
console.log('\n✓ Checking database models...');
try {
  const { PushSubscription, User } = require('../models');
  console.log('  ✓ PushSubscription model loads');
  console.log('  ✓ User model loads');

  if (typeof PushSubscription.prototype.toWebPushFormat === 'function') {
    console.log('  ✓ PushSubscription.toWebPushFormat() method exists');
  }
} catch (error) {
  console.error('  ✗ Error loading models');
  console.error('    ', error.message);
  errors++;
}

// Check 5: Verify routes file exists
console.log('\n✓ Checking API routes...');
const routesPath = path.join(__dirname, '../routes/push.js');
if (fs.existsSync(routesPath)) {
  console.log('  ✓ push.js routes file exists');
  try {
    require('../routes/push');
    console.log('  ✓ push.js routes load');
  } catch (error) {
    console.error('  ✗ Error loading push routes');
    console.error('    ', error.message);
    errors++;
  }
} else {
  console.error('  ✗ push.js routes file NOT found');
  errors++;
}

// Check 6: Verify migration file exists
console.log('\n✓ Checking database migration...');
const migrationPath = path.join(__dirname, '../migrations/20251001000000-create-push-subscriptions.js');
if (fs.existsSync(migrationPath)) {
  console.log('  ✓ create-push-subscriptions migration exists');
} else {
  console.error('  ✗ Migration file NOT found');
  errors++;
}

// Check 7: Verify server.js has push routes
console.log('\n✓ Checking server integration...');
const serverPath = path.join(__dirname, '../server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  if (serverContent.includes("require('./routes/push')")) {
    console.log('  ✓ Push routes imported in server.js');
  } else {
    console.error('  ✗ Push routes NOT imported in server.js');
    errors++;
  }
  if (serverContent.includes("app.use('/api/push'")) {
    console.log('  ✓ Push routes registered at /api/push');
  } else {
    console.error('  ✗ Push routes NOT registered in server.js');
    errors++;
  }
}

// Check 8: Verify models/index.js includes PushSubscription
console.log('\n✓ Checking model registration...');
const modelsIndexPath = path.join(__dirname, '../models/index.js');
if (fs.existsSync(modelsIndexPath)) {
  const modelsContent = fs.readFileSync(modelsIndexPath, 'utf8');
  if (modelsContent.includes('PushSubscription')) {
    console.log('  ✓ PushSubscription registered in models/index.js');
  } else {
    console.error('  ✗ PushSubscription NOT registered in models/index.js');
    errors++;
  }
  if (modelsContent.includes('pushSubscriptions')) {
    console.log('  ✓ User ↔ PushSubscription association exists');
  } else {
    console.warn('  ⚠ User ↔ PushSubscription association may be missing');
    warnings++;
  }
}

// Summary
console.log('\n========================================');
console.log('  Verification Summary');
console.log('========================================');
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors === 0 && warnings === 0) {
  console.log('\n✅ All checks passed! Push notifications are ready.');
  console.log('\nNext steps:');
  console.log('1. Run database migration: npm run migrate');
  console.log('2. Configure VAPID keys if not done');
  console.log('3. Start server: npm run server');
  console.log('4. Test: curl http://localhost:5000/api/push/vapid-public-key\n');
} else if (errors === 0) {
  console.log('\n⚠ Setup is functional but has warnings.');
  console.log('Review warnings above and configure as needed.\n');
} else {
  console.log('\n❌ Setup has errors that need to be fixed.');
  console.log('Review errors above and fix before proceeding.\n');
  process.exit(1);
}

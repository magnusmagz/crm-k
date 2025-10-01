/**
 * VAPID Key Generation Script for Web Push Notifications
 *
 * This script generates a pair of VAPID (Voluntary Application Server Identification) keys
 * required for Web Push API authentication. Run once and save the keys securely.
 *
 * Usage:
 *   node backend/scripts/generate-vapid-keys.js
 *
 * The generated keys should be stored in Heroku config vars (or .env for local):
 *   VAPID_PUBLIC_KEY  - Share with frontend/service worker
 *   VAPID_PRIVATE_KEY - Keep secret, server-side only
 *   VAPID_SUBJECT     - mailto:your-email@example.com or https://your-domain.com
 */

const webpush = require('web-push');

console.log('\n========================================');
console.log('  VAPID Key Generation for Web Push');
console.log('========================================\n');

try {
  // Generate VAPID key pair
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('VAPID keys generated successfully!\n');
  console.log('Copy these values to your Heroku Config Vars or .env file:\n');
  console.log('----------------------------------------');
  console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  console.log('----------------------------------------');
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
  console.log('----------------------------------------');
  console.log('VAPID_SUBJECT=mailto:your-email@example.com');
  console.log('----------------------------------------\n');

  console.log('IMPORTANT SECURITY NOTES:');
  console.log('1. The PRIVATE KEY must be kept secret - never commit it to git');
  console.log('2. Store keys in Heroku Config Vars for production');
  console.log('3. Store keys in .env for local development (already in .gitignore)');
  console.log('4. Update VAPID_SUBJECT with your actual email or domain');
  console.log('5. These keys will identify your application to push services\n');

  console.log('Next Steps:');
  console.log('1. Add these three environment variables to Heroku:');
  console.log('   heroku config:set VAPID_PUBLIC_KEY="<public_key>"');
  console.log('   heroku config:set VAPID_PRIVATE_KEY="<private_key>"');
  console.log('   heroku config:set VAPID_SUBJECT="mailto:your-email@example.com"');
  console.log('2. For local development, add to backend/.env file');
  console.log('3. Run the database migration to create push_subscriptions table');
  console.log('4. Restart your server\n');

} catch (error) {
  console.error('Error generating VAPID keys:', error);
  process.exit(1);
}

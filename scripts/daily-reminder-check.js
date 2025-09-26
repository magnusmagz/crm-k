#!/usr/bin/env node

/**
 * Daily reminder check script
 * This can be run by Heroku Scheduler or any cron system
 *
 * To run manually: node scripts/daily-reminder-check.js
 * For Heroku Scheduler: Add "node scripts/daily-reminder-check.js" as a job
 */

const https = require('https');
const http = require('http');

const APP_URL = process.env.APP_URL || 'https://maggie-crm-088fbe4fea30.herokuapp.com';
const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret';

console.log(`Starting daily reminder check at ${new Date().toISOString()}`);

const url = new URL(`${APP_URL}/api/cron/daily-reminder-check?secret=${CRON_SECRET}`);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

const req = client.get(url.toString(), (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Daily reminder check result:', result);

      if (result.success) {
        console.log(`✅ Success: Created ${result.remindersCreated || 0} reminders`);
        process.exit(0);
      } else {
        console.error('❌ Check failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to parse response:', error);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error);
  process.exit(1);
});

req.setTimeout(30000, () => {
  console.error('Request timeout after 30 seconds');
  req.destroy();
  process.exit(1);
});

req.end();
// Test Email System Setup Script
require('dotenv').config();
const { User, Contact, UserProfile, sequelize } = require('./backend/models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function setupTestData() {
  try {
    console.log('🔧 Setting up test data for email system...\n');

    // Check if test user exists
    let testUser = await User.findOne({ where: { email: 'test@example.com' } });

    if (!testUser) {
      console.log('Creating test user...');

      // Let the User model's beforeCreate hook hash the password
      testUser = await User.create({
        id: uuidv4(),
        email: 'test@example.com',
        password: 'password123', // Pass plain text, model will hash it
        isVerified: true,
        isActive: true,
        isAdmin: false
      });

      console.log('✓ Test user created:', testUser.email);
      console.log('  Password: password123\n');
    } else {
      console.log('✓ Test user already exists:', testUser.email, '\n');
    }

    // Create/update user profile with email signature
    let profile = await UserProfile.findOne({ where: { userId: testUser.id } });

    if (!profile) {
      console.log('Creating user profile with email signature...');
      profile = await UserProfile.create({
        userId: testUser.id,
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
        phone: '555-123-4567',
        website: 'https://example.com',
        emailSignature: {
          enabled: true,
          layout: 'modern',
          fields: {
            name: { show: true, value: 'Test User' },
            title: { show: true, value: 'Sales Manager' },
            email: { show: true, value: 'test@example.com' },
            phone: { show: true, value: '555-123-4567' },
            company: { show: true, value: 'Test Company' },
            address: { show: false, value: '' }
          },
          style: {
            primaryColor: '#2563eb',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px'
          },
          social: {
            linkedin: { show: false, url: '' },
            twitter: { show: false, url: '' }
          },
          includeLogo: false,
          includePhoto: false,
          includeSocial: false
        }
      });
      console.log('✓ User profile created with email signature\n');
    } else {
      console.log('✓ User profile already exists\n');
    }

    // Check for test contacts
    const contactCount = await Contact.count({ where: { userId: testUser.id } });

    if (contactCount === 0) {
      console.log('Creating test contacts...');

      const testContacts = [
        {
          userId: testUser.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-111-2222',
          company: 'Acme Corp',
          position: 'CEO',
          status: 'active'
        },
        {
          userId: testUser.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '555-333-4444',
          company: 'Tech Inc',
          position: 'CTO',
          status: 'active'
        },
        {
          userId: testUser.id,
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob.johnson@example.com',
          phone: '555-555-6666',
          company: 'StartupXYZ',
          position: 'Founder',
          status: 'active'
        }
      ];

      for (const contactData of testContacts) {
        const contact = await Contact.create(contactData);
        console.log(`✓ Created contact: ${contact.firstName} ${contact.lastName} (${contact.email})`);
      }
      console.log('');
    } else {
      console.log(`✓ ${contactCount} test contacts already exist\n`);
    }

    // Display summary
    console.log('═══════════════════════════════════════');
    console.log('📧 TEST DATA SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('User ID:', testUser.id);
    console.log('Email:', testUser.email);
    console.log('Password: password123');
    console.log('');

    const contacts = await Contact.findAll({
      where: { userId: testUser.id },
      attributes: ['id', 'firstName', 'lastName', 'email']
    });

    console.log('Contacts:');
    contacts.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} - ${c.email}`);
      console.log(`     ID: ${c.id}`);
    });
    console.log('');

    console.log('Email Configuration:');
    console.log('  POSTMARK_API_KEY:', process.env.POSTMARK_API_KEY === 'POSTMARK_API_TEST' ? 'TEST MODE ✓' : 'Live API Key');
    console.log('  EMAIL_DOMAIN:', process.env.EMAIL_DOMAIN);
    console.log('  APP_URL:', process.env.APP_URL);
    console.log('═══════════════════════════════════════\n');

    console.log('✅ Setup complete! Ready to test email system.\n');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

setupTestData();

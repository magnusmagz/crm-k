// Debug script to test the duplicates endpoint directly
const express = require('express');
const { Contact, Deal, sequelize } = require('./models');
const { Op } = require('sequelize');
require('dotenv').config();

async function testDuplicateQuery() {
  console.log('🔍 Testing Duplicate Search Query Directly');
  console.log('=========================================\n');

  try {
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');

    console.log('2. Testing basic Contact query...');
    const contactCount = await Contact.count();
    console.log(`✅ Found ${contactCount} total contacts\n`);

    console.log('3. Testing the exact duplicate search query...');
    const searchTerm = 'test';
    const userId = 'f4a33b3d-1187-4fe7-8720-5d82ccd65f7b'; // Replace with actual user ID
    
    console.log(`Search term: "${searchTerm}"`);
    console.log(`User ID: ${userId}\n`);

    // This is the exact query from the duplicates endpoint
    const contacts = await Contact.findAll({
      where: {
        userId: userId,
        [Op.or]: [
          // Email exact match (case-insensitive)
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('email')),
            searchTerm.toLowerCase()
          ),
          // Email contains
          { email: { [Op.iLike]: `%${searchTerm}%` } },
          // Name fuzzy match
          sequelize.where(
            sequelize.fn('LOWER', 
              sequelize.fn('CONCAT', 
                sequelize.col('firstName'), 
                ' ', 
                sequelize.col('lastName')
              )
            ),
            { [Op.iLike]: `%${searchTerm}%` }
          ),
          // First name only
          { firstName: { [Op.iLike]: `%${searchTerm}%` } },
          // Last name only
          { lastName: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    console.log(`✅ Query executed successfully! Found ${contacts.length} contacts\n`);

    if (contacts.length > 0) {
      console.log('Sample results:');
      contacts.slice(0, 3).forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      });
      console.log('');
    }

    console.log('4. Testing deal count subquery...');
    const contactIds = contacts.map(c => c.id);
    
    if (contactIds.length > 0) {
      const dealCounts = await Deal.findAll({
        where: { 
          contactId: contactIds,
          userId: userId 
        },
        attributes: [
          'contactId',
          [Deal.sequelize.fn('COUNT', Deal.sequelize.col('id')), 'dealCount']
        ],
        group: ['contactId'],
        raw: true
      });
      
      console.log(`✅ Deal count query successful! Found deals for ${dealCounts.length} contacts\n`);
    } else {
      console.log('⚠️  No contacts found, skipping deal count query\n');
    }

    console.log('5. Testing with different search terms...');
    const testTerms = ['john', 'doe', '@', 'test@example.com'];
    
    for (const term of testTerms) {
      try {
        const results = await Contact.findAll({
          where: {
            userId: userId,
            [Op.or]: [
              { email: { [Op.iLike]: `%${term}%` } },
              { firstName: { [Op.iLike]: `%${term}%` } },
              { lastName: { [Op.iLike]: `%${term}%` } }
            ]
          },
          limit: 5
        });
        console.log(`  "${term}" → ${results.length} results ✅`);
      } catch (error) {
        console.log(`  "${term}" → ERROR: ${error.message} ❌`);
      }
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.original) {
      console.error('Original error:', error.original);
    }
    
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    await sequelize.close();
  }
}

// Check if we're in the right environment
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('- Using local DB:', !!process.env.DB_NAME);
console.log('');

testDuplicateQuery();
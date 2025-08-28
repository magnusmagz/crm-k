'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Sales Co organization
    const salesCoId = uuidv4();
    
    await queryInterface.bulkInsert('organizations', [{
      id: salesCoId,
      name: 'Sales Co.',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Hash password for all users (using 'password123' as default)
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create users
    const users = [
      {
        id: uuidv4(),
        email: 'andy@salesco.com',
        password: hashedPassword,
        organizationId: salesCoId,
        isAdmin: true,
        isLoanOfficer: true,
        licensedStates: ['TX', 'CA', 'FL', 'NY'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'amy@salesco.com',
        password: hashedPassword,
        organizationId: salesCoId,
        isAdmin: false,
        isLoanOfficer: true,
        licensedStates: ['TX', 'OK', 'NM', 'LA'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'arnold@salesco.com',
        password: hashedPassword,
        organizationId: salesCoId,
        isAdmin: false,
        isLoanOfficer: true,
        licensedStates: ['CA', 'OR', 'WA', 'NV'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('users', users);

    // Create user profiles for each user
    const userProfiles = users.map(user => ({
      id: uuidv4(),
      user_id: user.id,
      firstName: user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1),
      lastName: user.isAdmin ? 'Admin' : 'Officer',
      primaryColor: '#1f2937',
      crmName: 'Sales Co. CRM',
      emailSignature: `Best regards,\n${user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)}`,
      signatureEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await queryInterface.bulkInsert('user_profiles', userProfiles);

    // Create a default round-robin rule for Sales Co
    const defaultRuleId = uuidv4();
    
    await queryInterface.bulkInsert('assignment_rules', [{
      id: defaultRuleId,
      organizationId: salesCoId,
      name: 'Default Round Robin',
      conditions: JSON.stringify({
        contactType: 'lead',
        source: 'all'
      }),
      isActive: true,
      priority: 100,
      assignmentMethod: 'round_robin',
      requireStateMatch: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Set up round-robin queue for all loan officers
    const roundRobinQueues = users.map((user, index) => ({
      id: uuidv4(),
      ruleId: defaultRuleId,
      userId: user.id,
      lastAssignedAt: null,
      assignmentCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await queryInterface.bulkInsert('round_robin_queues', roundRobinQueues);

    console.log('✅ Sales Co. organization created');
    console.log('✅ Users created:');
    console.log('   - Andy (admin): andy@salesco.com');
    console.log('   - Amy: amy@salesco.com');
    console.log('   - Arnold: arnold@salesco.com');
    console.log('   Default password for all users: password123');
    console.log('✅ Default round-robin rule created');
  },

  down: async (queryInterface, Sequelize) => {
    // Get Sales Co ID
    const org = await queryInterface.rawSelect('organizations', {
      where: { name: 'Sales Co.' }
    }, ['id']);

    if (org) {
      // Delete in correct order due to foreign keys
      await queryInterface.bulkDelete('round_robin_queues', {
        ruleId: {
          [Sequelize.Op.in]: queryInterface.rawSelect('assignment_rules', {
            where: { organizationId: org }
          }, ['id'])
        }
      });

      await queryInterface.bulkDelete('assignment_rules', {
        organizationId: org
      });

      await queryInterface.bulkDelete('user_profiles', {
        user_id: {
          [Sequelize.Op.in]: queryInterface.rawSelect('users', {
            where: { organizationId: org }
          }, ['id'])
        }
      });

      await queryInterface.bulkDelete('users', {
        organizationId: org
      });

      await queryInterface.bulkDelete('organizations', {
        id: org
      });
    }
  }
};
const { sequelize } = require('../models');

async function listUsers() {
  try {
    const users = await sequelize.query(
      `SELECT email, "isAdmin", "isLoanOfficer", "licensedStates" 
       FROM users 
       WHERE "organizationId" IS NOT NULL
       ORDER BY "isAdmin" DESC NULLS LAST, email`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n========================================');
    console.log('Sales Co. Users:');
    console.log('========================================');
    users.forEach(u => {
      const adminStatus = u.isAdmin === true ? '✅ ADMIN' : u.isAdmin === false ? '❌ Not Admin' : '➖ Regular User';
      console.log(`  ${u.email}:`);
      console.log(`    Role: ${adminStatus}`);
      console.log(`    Loan Officer: ${u.isLoanOfficer ? 'Yes' : 'No'}`);
      console.log(`    Licensed States: [${u.licensedStates.join(', ')}]`);
    });
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
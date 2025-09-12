const { sequelize } = require('../models');

async function listUsers() {
  try {
    const users = await sequelize.query(
      `SELECT email, "is_admin", "is_loan_officer", "licensed_states" 
       FROM users 
       WHERE "organization_id" IS NOT NULL
       ORDER BY "is_admin" DESC NULLS LAST, email`,
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
const { sequelize } = require('../models');

async function fixAdminStatus() {
  try {
    console.log('Checking and fixing admin status...');
    
    // First, let's see all users
    const users = await sequelize.query(`
      SELECT id, email, "is_admin", "is_loan_officer", "organization_id"
      FROM users
      ORDER BY email
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\nCurrent users:');
    users.forEach(user => {
      console.log(`- ${user.email}: Admin=${user.isAdmin}, LoanOfficer=${user.isLoanOfficer}`);
    });
    
    // Update maggie@gmail.com to be admin
    const result = await sequelize.query(`
      UPDATE users 
      SET "is_admin" = true 
      WHERE email = 'maggie@gmail.com'
      RETURNING email, "is_admin"
    `, { type: sequelize.QueryTypes.UPDATE });
    
    if (result[0].length > 0) {
      console.log(`\n✅ Updated ${result[0][0].email} to admin status`);
    } else {
      console.log('\n⚠️  User maggie@gmail.com not found');
      
      // Try to find and update the main user (first user created)
      const mainUserResult = await sequelize.query(`
        UPDATE users 
        SET "is_admin" = true 
        WHERE id = (SELECT id FROM users ORDER BY "createdAt" ASC LIMIT 1)
        RETURNING email, "is_admin"
      `, { type: sequelize.QueryTypes.UPDATE });
      
      if (mainUserResult[0].length > 0) {
        console.log(`✅ Updated ${mainUserResult[0][0].email} to admin status (first user)`);
      }
    }
    
    // Verify the changes
    const updatedUsers = await sequelize.query(`
      SELECT id, email, "is_admin", "is_loan_officer"
      FROM users
      WHERE "is_admin" = true
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\nAdmin users after update:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.email}: Admin=${user.isAdmin}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdminStatus();
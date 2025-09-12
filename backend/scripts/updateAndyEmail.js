const { sequelize } = require('../models');

async function updateAndyEmail() {
  try {
    console.log('Updating Andy\'s email to andy@crmkiller.com...');
    
    // Update Andy's email
    const result = await sequelize.query(`
      UPDATE users 
      SET email = 'andy@crmkiller.com'
      WHERE email = 'andy@example.com' OR email = 'andy@gmail.com'
      RETURNING id, email
    `, { type: sequelize.QueryTypes.UPDATE });
    
    if (result[0].length > 0) {
      console.log(`✅ Updated email to: ${result[0][0].email}`);
    } else {
      console.log('⚠️  No user found with andy@example.com or andy@gmail.com');
      
      // Let's check what Andy's current email is
      const users = await sequelize.query(`
        SELECT id, email 
        FROM users 
        WHERE email LIKE '%andy%'
      `, { type: sequelize.QueryTypes.SELECT });
      
      if (users.length > 0) {
        console.log('\nFound users with "andy" in email:');
        users.forEach(user => {
          console.log(`- ${user.email} (id: ${user.id})`);
        });
        
        // Update the first one
        const updateResult = await sequelize.query(`
          UPDATE users 
          SET email = 'andy@crmkiller.com'
          WHERE id = :id
          RETURNING email
        `, { 
          type: sequelize.QueryTypes.UPDATE,
          replacements: { id: users[0].id }
        });
        
        console.log(`\n✅ Updated ${users[0].email} to andy@crmkiller.com`);
      } else {
        console.log('No users found with "andy" in email');
      }
    }
    
    // Verify the update
    const verifyResult = await sequelize.query(`
      SELECT id, email, "is_admin", "is_loan_officer"
      FROM users
      WHERE email = 'andy@crmkiller.com'
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (verifyResult.length > 0) {
      console.log('\n✅ Verification successful:');
      console.log(`Email: ${verifyResult[0].email}`);
      console.log(`Admin: ${verifyResult[0].isAdmin}`);
      console.log(`Loan Officer: ${verifyResult[0].isLoanOfficer}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAndyEmail();
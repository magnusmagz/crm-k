const { sequelize } = require('../models');

async function addSuperAdminField() {
  try {
    console.log('🔧 Adding isSuperAdmin field to users table...');
    
    // Check if isSuperAdmin column already exists
    const tableInfo = await sequelize.getQueryInterface().describeTable('users');
    
    if (!tableInfo.isSuperAdmin && !tableInfo.is_super_admin) {
      // Add isSuperAdmin column to users table
      await sequelize.getQueryInterface().addColumn('users', 'isSuperAdmin', {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      
      console.log('✅ Added isSuperAdmin column to users table');
    } else {
      console.log('✅ isSuperAdmin column already exists');
    }
    
    // Make specific users super admins based on email
    const superAdminEmails = [
      'maggie@4msquared.com',
      'maggie+1@4msquared.com', 
      'maggie+2@4msquared.com',
      'maggie+3@4msquared.com'
    ];
    
    for (const email of superAdminEmails) {
      try {
        const [results, metadata] = await sequelize.query(`
          UPDATE users 
          SET "isSuperAdmin" = true 
          WHERE email = :email AND ("isSuperAdmin" IS NULL OR "isSuperAdmin" = false)
        `, {
          replacements: { email },
          type: sequelize.QueryTypes.UPDATE
        });
        
        if (metadata.rowCount > 0) {
          console.log(`✅ Made ${email} a super admin`);
        } else {
          // Check if user exists
          const [users] = await sequelize.query(`
            SELECT email, "isSuperAdmin" FROM users WHERE email = :email
          `, {
            replacements: { email },
            type: sequelize.QueryTypes.SELECT
          });
          
          if (users.length > 0) {
            console.log(`ℹ️  ${email} is already a super admin`);
          } else {
            console.log(`⚠️  User ${email} not found in database`);
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not update ${email}: ${error.message}`);
      }
    }
    
    // Add index for performance
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS users_is_super_admin_idx 
        ON users ("isSuperAdmin")
      `);
      console.log('✅ Added index for isSuperAdmin column');
    } catch (error) {
      console.log(`⚠️  Could not add index: ${error.message}`);
    }
    
    // Verify super admins
    const [superAdmins] = await sequelize.query(`
      SELECT email, "is_admin", "isSuperAdmin" 
      FROM users 
      WHERE "isSuperAdmin" = true
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('\n📋 Super Admins in system:');
    if (superAdmins.length === 0) {
      console.log('   No super admins found');
    } else {
      superAdmins.forEach(admin => {
        console.log(`   • ${admin.email} (Admin: ${admin.isAdmin}, Super Admin: ${admin.isSuperAdmin})`);
      });
    }
    
    console.log('\n✅ Super admin setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding super admin field:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  addSuperAdminField();
}

module.exports = addSuperAdminField;
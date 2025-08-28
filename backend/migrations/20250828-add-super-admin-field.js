'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if isSuperAdmin column already exists
      const tableInfo = await queryInterface.describeTable('users');
      
      if (!tableInfo.isSuperAdmin && !tableInfo.is_super_admin) {
        // Add isSuperAdmin column to users table
        await queryInterface.addColumn('users', 'isSuperAdmin', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Indicates if user has super admin privileges across all organizations'
        }, { transaction });
        
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
          const [updatedCount] = await queryInterface.sequelize.query(`
            UPDATE users 
            SET "isSuperAdmin" = true 
            WHERE email = :email AND "isSuperAdmin" IS NOT true
          `, {
            replacements: { email },
            transaction,
            type: queryInterface.sequelize.QueryTypes.UPDATE
          });
          
          if (updatedCount > 0) {
            console.log(`✅ Made ${email} a super admin`);
          } else {
            // Check if user exists
            const [users] = await queryInterface.sequelize.query(`
              SELECT email, "isSuperAdmin" FROM users WHERE email = :email
            `, {
              replacements: { email },
              transaction,
              type: queryInterface.sequelize.QueryTypes.SELECT
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
        await queryInterface.addIndex('users', ['isSuperAdmin'], {
          name: 'users_is_super_admin_idx',
          transaction
        });
        console.log('✅ Added index for isSuperAdmin column');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`⚠️  Could not add index: ${error.message}`);
        }
      }
      
      console.log('✅ Super admin setup completed successfully');
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Super admin setup failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove index
      try {
        await queryInterface.removeIndex('users', 'users_is_super_admin_idx', { transaction });
        console.log('✅ Removed isSuperAdmin index');
      } catch (error) {
        console.log(`⚠️  Could not remove index: ${error.message}`);
      }
      
      // Remove isSuperAdmin column
      try {
        await queryInterface.removeColumn('users', 'isSuperAdmin', { transaction });
        console.log('✅ Removed isSuperAdmin column');
      } catch (error) {
        console.log(`⚠️  Could not remove column: ${error.message}`);
      }
      
      console.log('✅ Super admin rollback completed');
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Super admin rollback failed:', error);
      throw error;
    }
  }
};
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if created_at and updated_at columns exist
      const tableInfo = await queryInterface.describeTable('organizations');
      
      // Add created_at column if it doesn't exist or is nullable
      if (!tableInfo.created_at || tableInfo.created_at.allowNull) {
        // If column exists but is nullable, first set default values for existing records
        if (tableInfo.created_at) {
          await queryInterface.sequelize.query(`
            UPDATE organizations 
            SET "createdAt" = NOW() 
            WHERE "createdAt" IS NULL
          `, { transaction });
          
          // Then make it non-nullable
          await queryInterface.changeColumn('organizations', 'createdAt', {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          }, { transaction });
        } else {
          // Add the column with default values
          await queryInterface.addColumn('organizations', 'createdAt', {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          }, { transaction });
          
          // Set created date for existing records
          await queryInterface.sequelize.query(`
            UPDATE organizations 
            SET "createdAt" = NOW() 
            WHERE "createdAt" IS NULL
          `, { transaction });
        }
      }
      
      // Add updated_at column if it doesn't exist
      if (!tableInfo.updated_at && !tableInfo.updatedAt) {
        await queryInterface.addColumn('organizations', 'updatedAt', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }, { transaction });
        
        // Set updated date for existing records
        await queryInterface.sequelize.query(`
          UPDATE organizations 
          SET "updatedAt" = NOW()
        `, { transaction });
      }
      
      // Add branding fields if they don't exist
      if (!tableInfo.crm_name) {
        await queryInterface.addColumn('organizations', 'crm_name', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.primary_color) {
        await queryInterface.addColumn('organizations', 'primary_color', {
          type: Sequelize.STRING(7),
          allowNull: true,
          defaultValue: '#6366f1'
        }, { transaction });
      }
      
      // Add management fields
      if (!tableInfo.is_active) {
        await queryInterface.addColumn('organizations', 'is_active', {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false
        }, { transaction });
      }
      
      if (!tableInfo.created_by) {
        await queryInterface.addColumn('organizations', 'created_by', {
          type: Sequelize.UUID,
          allowNull: true
        }, { transaction });
      }
      
      // Add settings field
      if (!tableInfo.settings) {
        await queryInterface.addColumn('organizations', 'settings', {
          type: Sequelize.JSONB,
          defaultValue: {
            allowUserRegistration: false,
            requireEmailVerification: true,
            defaultUserRole: 'user',
            maxUsers: null,
            features: {
              roundRobin: true,
              emailTemplates: true,
              customFields: true,
              recruiting: true
            }
          }
        }, { transaction });
      }
      
      // Add contact information fields
      if (!tableInfo.contact_email) {
        await queryInterface.addColumn('organizations', 'contact_email', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.contact_phone) {
        await queryInterface.addColumn('organizations', 'contact_phone', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.website) {
        await queryInterface.addColumn('organizations', 'website', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }
      
      // Add address fields
      if (!tableInfo.address) {
        await queryInterface.addColumn('organizations', 'address', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.city) {
        await queryInterface.addColumn('organizations', 'city', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.state) {
        await queryInterface.addColumn('organizations', 'state', {
          type: Sequelize.STRING(2),
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.zip_code) {
        await queryInterface.addColumn('organizations', 'zip_code', {
          type: Sequelize.STRING(10),
          allowNull: true
        }, { transaction });
      }
      
      // Add statistics fields
      if (!tableInfo.user_count) {
        await queryInterface.addColumn('organizations', 'user_count', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        }, { transaction });
      }
      
      if (!tableInfo.contact_count) {
        await queryInterface.addColumn('organizations', 'contact_count', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        }, { transaction });
      }
      
      // Update existing organizations with default values
      await queryInterface.sequelize.query(`
        UPDATE organizations 
        SET 
          crm_name = COALESCE(crm_name, name),
          primary_color = COALESCE(primary_color, '#6366f1'),
          is_active = COALESCE(is_active, true),
          settings = COALESCE(settings, '{"allowUserRegistration":false,"requireEmailVerification":true,"defaultUserRole":"user","maxUsers":null,"features":{"roundRobin":true,"emailTemplates":true,"customFields":true,"recruiting":true}}'::jsonb),
          user_count = COALESCE(user_count, 0),
          contact_count = COALESCE(contact_count, 0)
        WHERE crm_name IS NULL OR primary_color IS NULL OR is_active IS NULL OR settings IS NULL
      `, { transaction });
      
      console.log('✅ Organizations table enhanced successfully');
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove added columns (keep createdAt and updatedAt as they're standard)
      const columnsToRemove = [
        'crm_name', 'primary_color', 'is_active', 'created_by', 'settings',
        'contact_email', 'contact_phone', 'website', 'address', 'city', 
        'state', 'zip_code', 'user_count', 'contact_count'
      ];
      
      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('organizations', column, { transaction });
        } catch (error) {
          console.log(`Column ${column} doesn't exist or couldn't be removed:`, error.message);
        }
      }
      
      console.log('✅ Organizations table rollback completed');
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
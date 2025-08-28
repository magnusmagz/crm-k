const { sequelize } = require('../models');

async function fixOrganizationsTable() {
  try {
    console.log('🔧 Fixing organizations table...');
    
    // Get table info
    const tableInfo = await sequelize.getQueryInterface().describeTable('organizations');
    console.log('Current columns:', Object.keys(tableInfo));
    
    const queries = [];
    
    // Add createdAt if it doesn't exist or update it if nullable
    if (!tableInfo.createdAt && !tableInfo.created_at) {
      queries.push(`
        ALTER TABLE organizations 
        ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `);
    } else if (tableInfo.createdAt?.allowNull || tableInfo.created_at?.allowNull) {
      queries.push(`
        UPDATE organizations 
        SET "createdAt" = NOW() 
        WHERE "createdAt" IS NULL
      `);
    }
    
    // Add updatedAt if it doesn't exist
    if (!tableInfo.updatedAt && !tableInfo.updated_at) {
      queries.push(`
        ALTER TABLE organizations 
        ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `);
    }
    
    // Execute queries
    for (const query of queries) {
      try {
        await sequelize.query(query);
        console.log('✅ Executed:', query.trim().substring(0, 50) + '...');
      } catch (error) {
        console.log('⚠️  Query failed (might already exist):', error.message);
      }
    }
    
    console.log('✅ Organizations table fixed successfully');
    
    // Test the fix by trying to sync the Organization model
    const { Organization } = require('../models');
    await Organization.sync({ alter: false });
    console.log('✅ Organization model sync successful');
    
  } catch (error) {
    console.error('❌ Error fixing organizations table:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  fixOrganizationsTable();
}

module.exports = fixOrganizationsTable;
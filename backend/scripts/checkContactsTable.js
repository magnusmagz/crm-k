require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../models');

async function checkTable() {
  try {
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contacts'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Contacts Table Columns:\n');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n✅ Total columns:', columns.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkTable();
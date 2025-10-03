// Script to add primary_color column to organizations table if it doesn't exist
const { sequelize } = require('../models');

async function fixPrimaryColorColumn() {
  try {
    console.log('Checking organizations table structure...');

    // Check if primary_color column exists
    const [results] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name = 'primary_color';
    `);

    if (results.length === 0) {
      console.log('primary_color column does not exist. Adding it now...');

      await sequelize.query(`
        ALTER TABLE organizations
        ADD COLUMN primary_color VARCHAR(7) DEFAULT '#6366f1';
      `);

      console.log('✅ primary_color column added successfully!');
    } else {
      console.log('✅ primary_color column already exists.');
    }

    // Update existing records to have the default color
    await sequelize.query(`
      UPDATE organizations
      SET primary_color = '#6366f1'
      WHERE primary_color IS NULL;
    `);

    console.log('✅ Updated null values to default color.');

    process.exit(0);
  } catch (error) {
    console.error('Error fixing primary_color column:', error);
    process.exit(1);
  }
}

fixPrimaryColorColumn();

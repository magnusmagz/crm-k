const { sequelize } = require('../models');
const migration = require('./20250730132533-add-theme-customization-fields');

async function runMigration() {
  try {
    console.log('Running migration: add-theme-customization-fields...');
    
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
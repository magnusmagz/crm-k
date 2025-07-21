const { sequelize } = require('../models');
const migration = require('./20250121000001-add-custom-fields-to-deals');

async function runMigration() {
  try {
    console.log('Running migration: add-custom-fields-to-deals...');
    
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
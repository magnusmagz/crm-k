'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if custom_fields column already exists
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'deals' 
      AND column_name = 'custom_fields'
    `);
    
    if (results.length === 0) {
      // Add customFields column to deals table
      await queryInterface.addColumn('deals', 'custom_fields', {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      });
    }

    // Check if entity_type column already exists
    const [entityTypeResults] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'custom_fields' 
      AND column_name = 'entity_type'
    `);
    
    if (entityTypeResults.length === 0) {
      // Add entityType column to custom_fields table to support both contacts and deals
      await queryInterface.addColumn('custom_fields', 'entity_type', {
        type: Sequelize.ENUM('contact', 'deal'),
        defaultValue: 'contact',
        allowNull: false
      });
    }

    // Update existing custom fields to be contact type
    await queryInterface.sequelize.query(`
      UPDATE custom_fields 
      SET entity_type = 'contact' 
      WHERE entity_type IS NULL
    `);

    // Remove the old unique constraint
    await queryInterface.removeIndex('custom_fields', ['user_id', 'name']);

    // Add new unique constraint that includes entity_type
    await queryInterface.addIndex('custom_fields', {
      unique: true,
      fields: ['user_id', 'entity_type', 'name'],
      name: 'custom_fields_user_entity_name_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new index
    await queryInterface.removeIndex('custom_fields', 'custom_fields_user_entity_name_unique');

    // Add back the old index
    await queryInterface.addIndex('custom_fields', {
      unique: true,
      fields: ['user_id', 'name']
    });

    // Remove entityType column
    await queryInterface.removeColumn('custom_fields', 'entity_type');

    // Drop the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_custom_fields_entity_type";');

    // Remove customFields from deals
    await queryInterface.removeColumn('deals', 'custom_fields');
  }
};
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add companyId to contacts table
    await queryInterface.addColumn('contacts', 'company_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add companyId to deals table
    await queryInterface.addColumn('deals', 'company_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add indexes
    await queryInterface.addIndex('contacts', ['company_id']);
    await queryInterface.addIndex('deals', ['company_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('contacts', ['company_id']);
    await queryInterface.removeIndex('deals', ['company_id']);

    // Remove columns
    await queryInterface.removeColumn('contacts', 'company_id');
    await queryInterface.removeColumn('deals', 'company_id');
  }
};

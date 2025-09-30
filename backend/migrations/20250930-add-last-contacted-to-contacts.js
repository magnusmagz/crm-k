'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add last_contacted field to contacts table
    await queryInterface.addColumn('contacts', 'last_contacted', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contacts', 'last_contacted');
  }
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('contacts', 'company', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('contacts', 'position', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contacts', 'company');
    await queryInterface.removeColumn('contacts', 'position');
  }
};
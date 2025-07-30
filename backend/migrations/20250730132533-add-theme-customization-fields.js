'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user_profiles', 'primary_color', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '#1f2937'
    });

    await queryInterface.addColumn('user_profiles', 'crm_name', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'CRM Killer'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user_profiles', 'primary_color');
    await queryInterface.removeColumn('user_profiles', 'crm_name');
  }
};
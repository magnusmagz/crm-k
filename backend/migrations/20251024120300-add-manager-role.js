'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add is_manager column to users table
    await queryInterface.addColumn('users', 'is_manager', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Indicates if user is a manager who can see team data'
    });

    console.log('✓ Added is_manager column to users table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'is_manager');
  }
};

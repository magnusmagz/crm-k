'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add weekly_activity_goal column to users table
    await queryInterface.addColumn('users', 'weekly_activity_goal', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50,
      comment: 'Weekly activity goal for dashboard tracking'
    });

    console.log('✓ Added weekly_activity_goal column to users table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'weekly_activity_goal');
  }
};

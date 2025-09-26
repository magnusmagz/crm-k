'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user_profiles', 'enable_auto_reminders', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });

    await queryInterface.addColumn('user_profiles', 'reminder_days_threshold', {
      type: Sequelize.INTEGER,
      defaultValue: 5,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user_profiles', 'enable_auto_reminders');
    await queryInterface.removeColumn('user_profiles', 'reminder_days_threshold');
  }
};
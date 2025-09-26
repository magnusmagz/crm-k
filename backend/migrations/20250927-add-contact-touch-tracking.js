'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add last_contacted_at field to contacts table
    await queryInterface.addColumn('contacts', 'last_contacted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });

    // Add index for efficient queries
    await queryInterface.addIndex('contacts', ['user_id', 'last_contacted_at'], {
      name: 'idx_contacts_user_last_contacted'
    });

    // Add automated reminder preferences to user_profiles
    await queryInterface.addColumn('user_profiles', 'reminder_days_threshold', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5 // Default to 5 days
    });

    await queryInterface.addColumn('user_profiles', 'enable_auto_reminders', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    // Initialize last_contacted_at to created_at for existing contacts
    await queryInterface.sequelize.query(`
      UPDATE contacts
      SET last_contacted_at = created_at
      WHERE last_contacted_at IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contacts', 'last_contacted_at');
    await queryInterface.removeIndex('contacts', 'idx_contacts_user_last_contacted');
    await queryInterface.removeColumn('user_profiles', 'reminder_days_threshold');
    await queryInterface.removeColumn('user_profiles', 'enable_auto_reminders');
  }
};
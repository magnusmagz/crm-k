'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add NMLS ID to user_profiles table
    await queryInterface.addColumn('user_profiles', 'nmls_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'NMLS ID for loan officers'
    });

    // Add state licenses as JSONB to store array of license objects
    await queryInterface.addColumn('user_profiles', 'state_licenses', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of state licenses with state code and license number'
    });

    console.log('✅ Added loan officer fields to user_profiles table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user_profiles', 'nmls_id');
    await queryInterface.removeColumn('user_profiles', 'state_licenses');
    
    console.log('✅ Removed loan officer fields from user_profiles table');
  }
};
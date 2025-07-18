'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user_profiles', 'profilePhoto', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Base64 encoded profile photo'
    });
    
    await queryInterface.addColumn('user_profiles', 'companyLogo', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Base64 encoded company logo'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user_profiles', 'profilePhoto');
    await queryInterface.removeColumn('user_profiles', 'companyLogo');
  }
};
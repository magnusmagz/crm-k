'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all user profiles with email signatures
    const profiles = await queryInterface.sequelize.query(
      'SELECT id, email_signature FROM user_profiles WHERE email_signature IS NOT NULL',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Update each profile to add fieldOrder
    for (const profile of profiles) {
      const signature = profile.email_signature;
      
      // Add default field order if not present
      if (!signature.fieldOrder) {
        signature.fieldOrder = ['name', 'title', 'email', 'phone', 'company', 'address'];
      }
      
      await queryInterface.sequelize.query(
        'UPDATE user_profiles SET email_signature = :signature WHERE id = :id',
        {
          replacements: {
            signature: JSON.stringify(signature),
            id: profile.id
          }
        }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Get all user profiles with email signatures
    const profiles = await queryInterface.sequelize.query(
      'SELECT id, email_signature FROM user_profiles WHERE email_signature IS NOT NULL',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Update each profile to remove fieldOrder
    for (const profile of profiles) {
      const signature = profile.email_signature;
      
      // Remove field order
      delete signature.fieldOrder;
      
      await queryInterface.sequelize.query(
        'UPDATE user_profiles SET email_signature = :signature WHERE id = :id',
        {
          replacements: {
            signature: JSON.stringify(signature),
            id: profile.id
          }
        }
      );
    }
  }
};
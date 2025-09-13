'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Update all users with null or false is_active to true
    // This preserves any users that were intentionally deactivated (is_active = false)
    // but activates users with null values (which should be active by default)

    await queryInterface.sequelize.query(`
      UPDATE users
      SET is_active = true
      WHERE is_active IS NULL;
    `);

    console.log('✅ Activated all users with null is_active status');

    // Log how many users were updated
    const [results] = await queryInterface.sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_active = true) as active_count,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
        COUNT(*) as total_count
      FROM users;
    `);

    if (results && results[0]) {
      console.log(`📊 User status after migration:`);
      console.log(`   Active users: ${results[0].active_count}`);
      console.log(`   Inactive users: ${results[0].inactive_count}`);
      console.log(`   Total users: ${results[0].total_count}`);
    }
  },

  async down(queryInterface, Sequelize) {
    // We can't reliably reverse this migration since we don't know
    // which users had null values before
    console.log('⚠️  This migration cannot be reversed');
  }
};
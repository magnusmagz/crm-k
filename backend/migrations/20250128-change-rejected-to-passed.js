'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, update any existing 'rejected' values to 'passed'
    await queryInterface.sequelize.query(`
      UPDATE recruiting_pipeline 
      SET status = 'passed' 
      WHERE status = 'rejected'
    `);

    // Then alter the enum to replace 'rejected' with 'passed'
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_recruiting_pipeline_status" RENAME TO "enum_recruiting_pipeline_status_old";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_recruiting_pipeline_status" AS ENUM('active', 'hired', 'passed', 'withdrawn');
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE recruiting_pipeline 
      ALTER COLUMN status TYPE "enum_recruiting_pipeline_status" 
      USING status::text::"enum_recruiting_pipeline_status";
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE "enum_recruiting_pipeline_status_old";
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert the enum change
    await queryInterface.sequelize.query(`
      UPDATE recruiting_pipeline 
      SET status = 'rejected' 
      WHERE status = 'passed'
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_recruiting_pipeline_status" RENAME TO "enum_recruiting_pipeline_status_old";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_recruiting_pipeline_status" AS ENUM('active', 'hired', 'rejected', 'withdrawn');
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE recruiting_pipeline 
      ALTER COLUMN status TYPE "enum_recruiting_pipeline_status" 
      USING status::text::"enum_recruiting_pipeline_status";
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE "enum_recruiting_pipeline_status_old";
    `);
  }
};
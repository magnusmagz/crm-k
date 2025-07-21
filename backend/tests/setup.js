const { sequelize } = require('../models');

// Increase timeout for database operations
jest.setTimeout(30000);

// Setup test database
beforeAll(async () => {
  try {
    // Sync database with force to ensure clean state
    await sequelize.sync({ force: true });
    console.log('Test database synced');
  } catch (error) {
    console.error('Failed to sync test database:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await sequelize.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Failed to close database connection:', error);
  }
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
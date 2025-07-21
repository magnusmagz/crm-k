module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/tests/**',
    '!backend/migrations/**',
    '!backend/seeders/**',
    '!backend/config/**'
  ],
  testMatch: [
    '**/backend/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.js'],
  testTimeout: 30000,
  verbose: true
};
const request = require('supertest');
const { sequelize, User, UserProfile } = require('../models');
const app = require('../server');
const jwt = require('jsonwebtoken');

describe('User Profile API', () => {
  let authToken;
  let testUser;
  let testProfile;

  beforeAll(async () => {
    // Ensure database is synced
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      isVerified: true
    });

    // Create user profile
    testProfile = await UserProfile.create({
      userId: testUser.id,
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
      phone: '123-456-7890',
      website: 'https://example.com'
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterEach(async () => {
    // Clean up
    await UserProfile.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.profile).toBeDefined();
      expect(response.body.profile.firstName).toBe('Test');
      expect(response.body.profile.lastName).toBe('User');
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update basic profile fields', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        companyName: 'New Company',
        phone: '987-654-3210'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.profile.firstName).toBe('Updated');
      expect(response.body.profile.lastName).toBe('Name');
      expect(response.body.profile.companyName).toBe('New Company');
    });

    it('should update primaryColor and crmName fields', async () => {
      const updateData = {
        primaryColor: '#FF5733',
        crmName: 'My Custom CRM'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.profile.primaryColor).toBe('#FF5733');
      expect(response.body.profile.crmName).toBe('My Custom CRM');

      // Verify the data was actually saved
      const updatedProfile = await UserProfile.findOne({
        where: { userId: testUser.id }
      });
      expect(updatedProfile.primaryColor).toBe('#FF5733');
      expect(updatedProfile.crmName).toBe('My Custom CRM');
    });

    it('should validate primaryColor format', async () => {
      const updateData = {
        primaryColor: 'invalid-color'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('Invalid hex color format');
    });

    it('should validate crmName length', async () => {
      const updateData = {
        crmName: 'A'.repeat(51) // 51 characters, exceeds limit
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('CRM name must be between 1 and 50 characters');
    });

    it('should handle profile photo and company logo updates', async () => {
      const updateData = {
        profilePhoto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        companyLogo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.profile.profilePhoto).toBeDefined();
      expect(response.body.profile.companyLogo).toBeDefined();
    });

    it('should update all fields together', async () => {
      const updateData = {
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Acme Corp',
        phone: '555-0123',
        website: 'https://acme.com',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        },
        primaryColor: '#3B82F6',
        crmName: 'Acme CRM',
        profilePhoto: 'data:image/png;base64,test',
        companyLogo: 'data:image/png;base64,test'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      
      // Verify all fields were updated
      const updatedProfile = await UserProfile.findOne({
        where: { userId: testUser.id }
      });
      
      expect(updatedProfile.firstName).toBe('John');
      expect(updatedProfile.lastName).toBe('Doe');
      expect(updatedProfile.companyName).toBe('Acme Corp');
      expect(updatedProfile.phone).toBe('555-0123');
      expect(updatedProfile.website).toBe('https://acme.com');
      expect(updatedProfile.primaryColor).toBe('#3B82F6');
      expect(updatedProfile.crmName).toBe('Acme CRM');
      expect(updatedProfile.address.street).toBe('123 Main St');
      expect(updatedProfile.address.city).toBe('Anytown');
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .put('/api/users/profile')
        .send({ firstName: 'Test' })
        .expect(401);
    });
  });
});

// Helper function to run a single test
if (require.main === module) {
  // Run the test
  const jest = require('jest');
  jest.run(['--testPathPattern=userProfile.test.js']);
}
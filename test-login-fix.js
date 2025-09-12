const { User } = require('./backend/models');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    console.log('Testing user creation with raw SQL...');
    
    // First, let's see what columns exist
    const [results] = await User.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name;
    `);
    
    console.log('Available columns in users table:');
    results.forEach(row => console.log(' -', row.column_name));
    
    // Now try to create a user with minimal fields
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    await User.sequelize.query(`
      INSERT INTO users (id, email, password, is_verified, "isActive", is_super_admin, created_at, updated_at)
      VALUES (gen_random_uuid(), 'demo@demo.com', '${hashedPassword}', true, true, false, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING;
    `);
    
    console.log('✓ Test user created successfully!');
    console.log('Login with: email=demo@demo.com, password=demo123');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

createTestUser();
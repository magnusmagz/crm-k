const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost:5432/crm_db', {
  logging: false
});

async function seedUsers() {
  try {
    // Check if users already exist
    const [existingUsers] = await sequelize.query("SELECT COUNT(*) FROM users");
    if (existingUsers[0].count > 0) {
      console.log('Users already exist in database');
      const [users] = await sequelize.query("SELECT email FROM users");
      console.log('Existing users:');
      users.forEach(u => console.log(`  - ${u.email}`));
      process.exit(0);
    }

    // Create organization
    const orgId = require('crypto').randomUUID();
    await sequelize.query(
      `INSERT INTO organizations (id, name, "createdAt", "updatedAt") 
       VALUES (:id, :name, NOW(), NOW())`,
      { replacements: { id: orgId, name: 'Sales Co.' } }
    );

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create users
    const users = [
      { email: 'andy@salesco.com', name: 'Andy Admin', role: 'admin' },
      { email: 'amy@salesco.com', name: 'Amy Officer', role: 'user' },
      { email: 'arnold@salesco.com', name: 'Arnold Officer', role: 'user' }
    ];

    for (const user of users) {
      const userId = require('crypto').randomUUID();
      await sequelize.query(
        `INSERT INTO users (id, email, password, name, role, organization_id, "createdAt", "updatedAt")
         VALUES (:id, :email, :password, :name, :role, :orgId, NOW(), NOW())`,
        {
          replacements: {
            id: userId,
            email: user.email,
            password: hashedPassword,
            name: user.name,
            role: user.role,
            orgId: orgId
          }
        }
      );
    }

    console.log('✅ Test users created successfully!');
    console.log('\nYou can log in with:');
    console.log('  Email: andy@salesco.com (admin)');
    console.log('  Email: amy@salesco.com');
    console.log('  Email: arnold@salesco.com');
    console.log('  Password: password123 (for all users)');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
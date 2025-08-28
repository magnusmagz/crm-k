const { sequelize } = require('../models');

async function addUserManagementColumns() {
  try {
    console.log('Adding user management columns...');
    
    // Add requirePasswordChange column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "requirePasswordChange" BOOLEAN DEFAULT false
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('Column requirePasswordChange already exists');
      } else throw err;
    });
    
    // Add isActive column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('Column isActive already exists');
      } else throw err;
    });
    
    // Add inviteToken column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "inviteToken" VARCHAR(255)
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('Column inviteToken already exists');
      } else throw err;
    });
    
    // Add inviteExpires column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "inviteExpires" TIMESTAMP WITH TIME ZONE
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('Column inviteExpires already exists');
      } else throw err;
    });
    
    // Add firstName column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255)
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('Column firstName already exists');
      } else throw err;
    });
    
    // Add lastName column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255)
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('Column lastName already exists');
      } else throw err;
    });
    
    // Update EmailSends table to allow null contactId
    await sequelize.query(`
      ALTER TABLE email_sends 
      ALTER COLUMN "contactId" DROP NOT NULL
    `).catch(err => {
      if (err.message.includes('cannot be null')) {
        console.log('Column contactId already allows null');
      } else if (err.message.includes('does not exist')) {
        console.log('email_sends table does not exist yet');
      } else throw err;
    });
    
    console.log('\n✅ Successfully added user management columns!');
    console.log('\nColumns added:');
    console.log('  - requirePasswordChange (BOOLEAN)');
    console.log('  - isActive (BOOLEAN)');
    console.log('  - inviteToken (VARCHAR)');
    console.log('  - inviteExpires (TIMESTAMP)');
    console.log('  - firstName (VARCHAR)');
    console.log('  - lastName (VARCHAR)');
    console.log('  - email_sends.contactId now allows NULL');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addUserManagementColumns();
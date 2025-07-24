'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, let's check if there are any deals without contacts
    const [results] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as count FROM deals WHERE "contactId" IS NULL`
    );
    
    const nullContactCount = results[0].count;
    
    if (nullContactCount > 0) {
      console.log(`Found ${nullContactCount} deals without contacts.`);
      console.log('Please assign contacts to these deals before making contactId required.');
      
      // For now, we'll just log the deals without contacts
      const [dealsWithoutContacts] = await queryInterface.sequelize.query(
        `SELECT id, name, "userId" FROM deals WHERE "contactId" IS NULL LIMIT 10`
      );
      
      console.log('First 10 deals without contacts:');
      dealsWithoutContacts.forEach(deal => {
        console.log(`- Deal "${deal.name}" (ID: ${deal.id})`);
      });
      
      // Note: In a production environment, you might want to:
      // 1. Create a default "Unknown" contact for each user
      // 2. Assign all orphaned deals to that contact
      // 3. Then make the field non-nullable
      
      // For now, we'll skip making the field non-nullable if there are orphaned deals
      console.log('\nSkipping migration: Please assign contacts to all deals first.');
      return;
    }
    
    // If all deals have contacts, make the field non-nullable
    await queryInterface.changeColumn('deals', 'contactId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      }
    });
    
    console.log('Successfully made contactId required for deals.');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: make contactId nullable again
    await queryInterface.changeColumn('deals', 'contactId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'contacts',
        key: 'id'
      }
    });
  }
};
const { Deal, Contact, Stage } = require('../models');

async function checkDeal998() {
  try {
    console.log('\n=== SEARCHING FOR DEAL 998 ===\n');
    
    // Search by ID first
    let deal = await Deal.findByPk('998', {
      include: [
        {
          model: Contact,
          attributes: ['id', 'firstName', 'lastName', 'email', 'company']
        },
        {
          model: Stage,
          attributes: ['id', 'name', 'color']
        }
      ]
    });
    
    if (!deal) {
      console.log('Deal with ID 998 not found.');
      
      // Try searching by name containing "998"
      console.log('\nSearching for deals with "998" in the name...');
      const deals = await Deal.findAll({
        where: {
          name: {
            [require('sequelize').Op.iLike]: '%998%'
          }
        },
        include: [
          {
            model: Contact,
            attributes: ['id', 'firstName', 'lastName', 'email', 'company']
          },
          {
            model: Stage,
            attributes: ['id', 'name', 'color']
          }
        ]
      });
      
      if (deals.length > 0) {
        console.log(`\nFound ${deals.length} deal(s) with "998" in the name:`);
        deals.forEach((d, index) => {
          console.log(`\nDeal ${index + 1}:`);
          console.log(`  ID: ${d.id}`);
          console.log(`  Name: ${d.name}`);
          console.log(`  Value: $${d.value || 0}`);
          console.log(`  Status: ${d.status}`);
          console.log(`  Stage: ${d.Stage?.name || 'N/A'}`);
          console.log(`  Contact ID: ${d.contactId || 'None'}`);
          if (d.Contact) {
            console.log(`  Contact: ${d.Contact.firstName} ${d.Contact.lastName} (${d.Contact.email})`);
            console.log(`  Company: ${d.Contact.company || 'N/A'}`);
          } else {
            console.log(`  Contact: Not associated`);
          }
        });
      } else {
        console.log('No deals found with "998" in the name.');
      }
    } else {
      console.log('Deal 998 found!');
      console.log('\n=== DEAL DETAILS ===');
      console.log(`ID: ${deal.id}`);
      console.log(`Name: ${deal.name}`);
      console.log(`Value: $${deal.value || 0}`);
      console.log(`Status: ${deal.status}`);
      console.log(`Stage: ${deal.Stage?.name || 'N/A'}`);
      console.log(`Created: ${deal.createdAt}`);
      console.log(`Updated: ${deal.updatedAt}`);
      
      console.log('\n=== CONTACT ASSOCIATION ===');
      console.log(`Contact ID: ${deal.contactId || 'None'}`);
      
      if (deal.Contact) {
        console.log(`\nAssociated Contact:`);
        console.log(`  Name: ${deal.Contact.firstName} ${deal.Contact.lastName}`);
        console.log(`  Email: ${deal.Contact.email}`);
        console.log(`  Company: ${deal.Contact.company || 'N/A'}`);
        console.log(`  Contact ID: ${deal.Contact.id}`);
      } else {
        console.log('\nNo contact associated with this deal.');
      }
      
      // Check custom fields
      if (deal.customFields && Object.keys(deal.customFields).length > 0) {
        console.log('\n=== CUSTOM FIELDS ===');
        console.log(JSON.stringify(deal.customFields, null, 2));
      }
    }
    
    // Also check if there are any numeric IDs that might be 998
    console.log('\n=== CHECKING NUMERIC REFERENCES ===');
    const numericDeals = await Deal.findAll({
      attributes: ['id', 'name', 'contactId'],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    console.log('\nRecent deals (checking if any use numeric-like IDs):');
    numericDeals.forEach(d => {
      // Check if the ID when parsed as a number equals 998
      const idStr = d.id.toString();
      if (idStr === '998' || idStr.includes('998')) {
        console.log(`  Found deal with ID containing 998: ${d.id} - ${d.name}`);
      }
    });
    
  } catch (error) {
    console.error('Error searching for deal 998:', error);
    console.error(error.stack);
  } finally {
    process.exit();
  }
}

// Run the check
checkDeal998();
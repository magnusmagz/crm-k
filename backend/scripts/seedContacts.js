require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Contact, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

const firstNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Jessica',
  'Robert', 'Jennifer', 'William', 'Lisa', 'Richard', 'Mary', 'Thomas',
  'Patricia', 'Charles', 'Linda', 'Joseph', 'Barbara', 'Mark', 'Elizabeth',
  'Paul', 'Susan', 'Steven', 'Karen', 'Andrew', 'Nancy', 'Daniel', 'Margaret'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const companies = [
  'Tech Innovations Inc', 'Global Solutions LLC', 'Prime Ventures', 'NextGen Systems',
  'Digital Dynamics', 'Cloud Nine Technologies', 'Apex Corporation', 'Bright Future Co',
  'Summit Partners', 'Vertex Industries', 'Quantum Leap LLC', 'Horizon Enterprises',
  'Stellar Solutions', 'Phoenix Group', 'Atlas Holdings'
];

const positions = [
  'CEO', 'CTO', 'CFO', 'VP of Sales', 'Marketing Director', 'Product Manager',
  'Software Engineer', 'Sales Manager', 'Operations Manager', 'Business Analyst',
  'Account Executive', 'Project Manager', 'HR Director', 'Controller', 'Consultant'
];

const sources = [
  'Website', 'Referral', 'LinkedIn', 'Trade Show', 'Email Campaign', 
  'Cold Call', 'Partner', 'Social Media', 'Webinar', 'Direct Mail'
];

const states = [
  'CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI',
  'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI',
  'CO', 'MN', 'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'NV'
];

const contactTypes = ['lead', 'prospect', 'customer', 'lead', 'lead']; // More leads for testing

async function seedContacts() {
  try {
    console.log('\n🌱 Seeding contacts for Andy...\n');
    
    // Get Andy's user info
    const andy = await User.findOne({
      where: { email: 'andy@salesco.com' }
    });
    
    if (!andy) {
      console.error('❌ Andy not found!');
      return;
    }
    
    console.log(`✅ Found Andy (ID: ${andy.id})`);
    console.log(`   Organization: ${andy.organizationId}\n`);
    
    const contacts = [];
    
    for (let i = 0; i < 30; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      const phone = `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
      const company = companies[Math.floor(Math.random() * companies.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const state = states[Math.floor(Math.random() * states.length)];
      const contactType = contactTypes[Math.floor(Math.random() * contactTypes.length)];
      
      const tags = [];
      if (Math.random() > 0.5) tags.push('hot-lead');
      if (Math.random() > 0.7) tags.push('enterprise');
      if (Math.random() > 0.6) tags.push('follow-up');
      if (Math.random() > 0.8) tags.push('priority');
      
      const contact = {
        id: uuidv4(),
        userId: andy.id,
        organizationId: andy.organizationId,
        firstName,
        lastName,
        email,
        phone,
        company,
        position,
        source,
        state,
        contactType,
        tags,
        notes: `${contactType.charAt(0).toUpperCase() + contactType.slice(1)} from ${source}. Interested in our services.`,
        customFields: {},
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        updatedAt: new Date()
      };
      
      // Half of the leads should be unassigned for round-robin testing
      if (contactType === 'lead' && Math.random() > 0.5) {
        contact.assignedTo = null;
        contact.assignedAt = null;
      } else {
        contact.assignedTo = andy.id;
        contact.assignedAt = new Date();
      }
      
      contacts.push(contact);
    }
    
    // Bulk create contacts
    await Contact.bulkCreate(contacts);
    
    // Count stats
    const totalContacts = contacts.length;
    const leads = contacts.filter(c => c.contactType === 'lead').length;
    const unassigned = contacts.filter(c => !c.assignedTo).length;
    
    console.log('📊 Seeding Complete!\n');
    console.log(`   Total Contacts: ${totalContacts}`);
    console.log(`   Leads: ${leads}`);
    console.log(`   Prospects: ${contacts.filter(c => c.contactType === 'prospect').length}`);
    console.log(`   Customers: ${contacts.filter(c => c.contactType === 'customer').length}`);
    console.log(`   Unassigned (for round-robin): ${unassigned}`);
    console.log(`\n✨ Contacts with tags:`);
    console.log(`   Hot Leads: ${contacts.filter(c => c.tags.includes('hot-lead')).length}`);
    console.log(`   Enterprise: ${contacts.filter(c => c.tags.includes('enterprise')).length}`);
    console.log(`   Follow-up: ${contacts.filter(c => c.tags.includes('follow-up')).length}`);
    console.log(`   Priority: ${contacts.filter(c => c.tags.includes('priority')).length}`);
    
    console.log('\n✅ All contacts have been created successfully!');
    console.log('   You can now test the round-robin assignment with the unassigned leads.\n');
    
  } catch (error) {
    console.error('Error seeding contacts:', error);
  } finally {
    await sequelize.close();
  }
}

seedContacts();
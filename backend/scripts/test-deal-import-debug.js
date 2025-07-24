const fs = require('fs');
const path = require('path');
const { parseCSV, autoDetectDealMapping, mapCSVToDeal } = require('../utils/csvParser');

async function testDealImportDebug() {
  try {
    console.log('🔍 Testing Deal Import CSV Parsing\n');

    // Create a sample CSV to test with
    const sampleCSV = `Deal Name,Value,Stage,Contact Email,First Name,Last Name,Company
"Website Redesign",5000,"Proposal","john@example.com","John","Doe","Acme Corp"
"Mobile App Development",15000,"Discovery","jane@example.com","Jane","Smith","Tech Co"
"Consulting Services",8000,"Negotiation","bob@example.com","Bob","Johnson","StartupXYZ"`;

    const buffer = Buffer.from(sampleCSV);
    
    // Parse the CSV
    const records = await parseCSV(buffer);
    console.log('📊 Parsed Records:', records.length);
    console.log('\nFirst record:', JSON.stringify(records[0], null, 2));

    // Test auto-detection
    const headers = Object.keys(records[0]);
    const suggestedMapping = autoDetectDealMapping(headers);
    console.log('\n🎯 Auto-detected mapping:', JSON.stringify(suggestedMapping, null, 2));

    // Test mapping a record
    const dealData = mapCSVToDeal(records[0], suggestedMapping);
    console.log('\n📦 Mapped deal data:', JSON.stringify(dealData, null, 2));

    // Now let's see what happens with the actual import logic
    console.log('\n🔍 Testing contact field extraction:');
    const contactEmail = dealData.contactEmail;
    const contactFirstName = dealData.contactFirstName;
    const contactLastName = dealData.contactLastName;
    const contactName = dealData.contactName;
    
    console.log(`  - contactEmail: ${contactEmail}`);
    console.log(`  - contactFirstName: ${contactFirstName}`);
    console.log(`  - contactLastName: ${contactLastName}`);
    console.log(`  - contactName: ${contactName}`);
    
    const hasContactInfo = contactEmail || contactName || (contactFirstName && contactLastName);
    console.log(`  - Has contact info: ${hasContactInfo}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDealImportDebug();
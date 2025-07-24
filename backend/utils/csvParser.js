const { parse } = require('csv-parse');
const { validateEmail, validatePhone } = require('./validators');

// Parse CSV buffer and return parsed data
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: (value, context) => {
        // Handle empty strings
        if (value === '') return null;
        return value;
      }
    });

    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', function(err) {
      reject(err);
    });

    parser.on('end', function() {
      resolve(records);
    });

    parser.write(buffer);
    parser.end();
  });
};

// Get CSV headers from buffer
const getCSVHeaders = (buffer) => {
  return new Promise((resolve, reject) => {
    const parser = parse({
      to_line: 1,
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    let headers = [];

    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        headers = record;
      }
    });

    parser.on('error', function(err) {
      reject(err);
    });

    parser.on('end', function() {
      resolve(headers);
    });

    parser.write(buffer);
    parser.end();
  });
};

// Validate a single contact record
const validateContactRecord = (record, rowIndex) => {
  const errors = [];
  
  // Check required fields
  if (!record.firstName && !record.first_name && !record['First Name']) {
    errors.push(`Row ${rowIndex}: First name is required`);
  }
  
  if (!record.lastName && !record.last_name && !record['Last Name']) {
    errors.push(`Row ${rowIndex}: Last name is required`);
  }
  
  // Validate email if provided
  const email = record.email || record.Email || record['Email Address'];
  if (email && !validateEmail(email)) {
    errors.push(`Row ${rowIndex}: Invalid email format: ${email}`);
  }
  
  // Validate phone if provided
  const phone = record.phone || record.Phone || record['Phone Number'];
  if (phone && !validatePhone(phone)) {
    errors.push(`Row ${rowIndex}: Invalid phone format: ${phone}`);
  }
  
  return errors;
};

// Map CSV fields to contact model fields
const mapCSVToContact = (record, fieldMapping, customFieldDefs = []) => {
  const contact = {
    customFields: {}
  };
  
  // Apply field mapping
  Object.entries(fieldMapping).forEach(([csvField, contactField]) => {
    const value = record[csvField];
    if (value !== null && value !== undefined && value !== '') {
      // Check if it's a custom field
      const customFieldDef = customFieldDefs.find(cf => cf.name === contactField);
      if (customFieldDef) {
        contact.customFields[contactField] = value;
      } else {
        // Standard field
        contact[contactField] = value;
      }
    }
  });
  
  // Handle tags (comma-separated string to array)
  if (contact.tags && typeof contact.tags === 'string') {
    contact.tags = contact.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  return contact;
};

// Auto-detect field mapping based on common CSV headers
const autoDetectMapping = (headers) => {
  const mapping = {};
  const commonMappings = {
    'first name': 'firstName',
    'firstname': 'firstName',
    'first_name': 'firstName',
    'given name': 'firstName',
    'last name': 'lastName',
    'lastname': 'lastName',
    'last_name': 'lastName',
    'surname': 'lastName',
    'family name': 'lastName',
    'email': 'email',
    'email address': 'email',
    'e-mail': 'email',
    'phone': 'phone',
    'phone number': 'phone',
    'telephone': 'phone',
    'mobile': 'phone',
    'cell': 'phone',
    'company': 'company',
    'organization': 'company',
    'company name': 'company',
    'position': 'position',
    'title': 'position',
    'job title': 'position',
    'role': 'position',
    'notes': 'notes',
    'note': 'notes',
    'comments': 'notes',
    'tags': 'tags',
    'tag': 'tags',
    'labels': 'tags'
  };
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    if (commonMappings[normalizedHeader]) {
      mapping[header] = commonMappings[normalizedHeader];
    }
  });
  
  return mapping;
};

module.exports = {
  parseCSV,
  getCSVHeaders,
  validateContactRecord,
  mapCSVToContact,
  autoDetectMapping
};
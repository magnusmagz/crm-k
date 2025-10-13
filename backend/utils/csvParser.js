const { parse } = require('csv-parse');
const { validateEmail, validatePhone, normalizePhoneNumber } = require('./validators');

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
        // Special handling for phone field - normalize it
        if (contactField === 'phone') {
          const normalized = normalizePhoneNumber(value);
          if (normalized) {
            contact[contactField] = normalized;
          } else {
            // If normalization fails, keep original value
            // Validation will catch it later
            contact[contactField] = value;
          }
        } else {
          contact[contactField] = value;
        }
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

// Auto-detect deal field mapping
const autoDetectDealMapping = (headers) => {
  const mapping = {};
  const dealMappings = {
    'deal name': 'name',
    'dealname': 'name',
    'deal': 'name',
    'opportunity': 'name',
    'name': 'name',
    'title': 'name',
    'value': 'value',
    'amount': 'value',
    'deal value': 'value',
    'deal amount': 'value',
    'revenue': 'value',
    'price': 'value',
    'stage': 'stage',
    'pipeline stage': 'stage',
    'deal stage': 'stage',
    'status': 'status',
    'deal status': 'status',
    'expected close date': 'expectedCloseDate',
    'close date': 'expectedCloseDate',
    'closing date': 'expectedCloseDate',
    'expected close': 'expectedCloseDate',
    'notes': 'notes',
    'description': 'notes',
    'comments': 'notes',
    'details': 'notes',
    'contact': 'contactName',
    'contact name': 'contactName',
    'customer': 'contactName',
    'client': 'contactName',
    'contact email': 'contactEmail',
    'customer email': 'contactEmail',
    'client email': 'contactEmail',
    'email': 'contactEmail',
    'company': 'company',
    'company name': 'company',
    'organization': 'company',
    'first name': 'contactFirstName',
    'firstname': 'contactFirstName',
    'first': 'contactFirstName',
    'contact first name': 'contactFirstName',
    'last name': 'contactLastName',
    'lastname': 'contactLastName',
    'last': 'contactLastName',
    'contact last name': 'contactLastName'
  };
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    if (dealMappings[normalizedHeader]) {
      mapping[header] = dealMappings[normalizedHeader];
    }
  });
  
  return mapping;
};

// Validate a single deal record
const validateDealRecord = (record, rowIndex) => {
  const errors = [];
  
  // Check required fields
  if (!record.name && !record['Deal Name'] && !record.Deal && !record.Name) {
    errors.push(`Row ${rowIndex}: Deal name is required`);
  }
  
  // Validate value if provided
  const value = record.value || record.Value || record.Amount || record['Deal Value'];
  if (value && (isNaN(value) || parseFloat(value) < 0)) {
    errors.push(`Row ${rowIndex}: Invalid value: ${value}. Must be a positive number`);
  }
  
  // Validate status if provided
  const status = record.status || record.Status || record['Deal Status'];
  if (status && !['open', 'won', 'lost'].includes(status.toLowerCase())) {
    errors.push(`Row ${rowIndex}: Invalid status: ${status}. Must be open, won, or lost`);
  }
  
  // Validate expected close date if provided
  const closeDate = record.expectedCloseDate || record['Expected Close Date'] || record['Close Date'];
  if (closeDate && isNaN(Date.parse(closeDate))) {
    errors.push(`Row ${rowIndex}: Invalid date format: ${closeDate}`);
  }
  
  return errors;
};

// Map CSV fields to deal model fields
const mapCSVToDeal = (record, fieldMapping, customFieldDefs = []) => {
  const deal = {
    customFields: {}
  };
  
  // Apply field mapping
  Object.entries(fieldMapping).forEach(([csvField, dealField]) => {
    const value = record[csvField];
    if (value !== null && value !== undefined && value !== '') {
      // Check if it's a custom field
      const customFieldDef = customFieldDefs.find(cf => cf.name === dealField);
      if (customFieldDef) {
        deal.customFields[dealField] = value;
      } else {
        // Standard field
        switch (dealField) {
          case 'value':
            deal[dealField] = parseFloat(value) || 0;
            break;
          case 'expectedCloseDate':
            deal[dealField] = new Date(value).toISOString();
            break;
          case 'status':
            deal[dealField] = value.toLowerCase();
            break;
          case 'contactFirstName':
          case 'contactLastName':
          case 'contactEmail':
          case 'contactName':
          case 'company':
            // These are handled separately for contact association
            deal[dealField] = value;
            break;
          default:
            deal[dealField] = value;
        }
      }
    }
  });
  
  // Set defaults
  if (!deal.status) {
    deal.status = 'open';
  }
  if (!deal.value) {
    deal.value = 0;
  }
  
  return deal;
};

module.exports = {
  parseCSV,
  getCSVHeaders,
  validateContactRecord,
  mapCSVToContact,
  autoDetectMapping,
  autoDetectDealMapping,
  validateDealRecord,
  mapCSVToDeal
};
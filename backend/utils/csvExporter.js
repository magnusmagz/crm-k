const { Parser } = require('json2csv');

/**
 * Generate CSV content from an array of objects
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Array} fields - Optional array of field names to include
 * @returns {String} CSV content
 */
const generateCSV = (data, fields = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  const opts = {};
  if (fields) {
    opts.fields = fields;
  }

  const parser = new Parser(opts);
  return parser.parse(data);
};

/**
 * Generate a skipped records report for contact imports
 * @param {Array} skippedRecords - Array of skipped record objects
 * @returns {String} CSV content
 */
const generateContactSkippedReport = (skippedRecords) => {
  const reportData = skippedRecords.map(record => ({
    'Row Number': record.row,
    'First Name': record.data.firstName || '',
    'Last Name': record.data.lastName || '',
    'Email': record.data.email || '',
    'Company': record.data.company || '',
    'Reason': record.reason || 'Duplicate contact'
  }));

  return generateCSV(reportData);
};

/**
 * Generate a skipped records report for deal imports
 * @param {Array} skippedRecords - Array of skipped record objects
 * @returns {String} CSV content
 */
const generateDealSkippedReport = (skippedRecords) => {
  const reportData = skippedRecords.map(record => ({
    'Row Number': record.row,
    'Deal Name': record.data.name || '',
    'Value': record.data.value || '',
    'Contact Email': record.data.contactEmail || '',
    'Contact Name': record.data.contactName || `${record.data.contactFirstName || ''} ${record.data.contactLastName || ''}`.trim(),
    'Reason': record.reason || 'Duplicate deal'
  }));

  return generateCSV(reportData);
};

module.exports = {
  generateCSV,
  generateContactSkippedReport,
  generateDealSkippedReport
};
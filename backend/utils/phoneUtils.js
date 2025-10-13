/**
 * Phone Number Utilities
 * Handles normalization, validation, and formatting of phone numbers
 * Supports international formats and various common input patterns
 */

/**
 * Normalize a phone number to a consistent format
 * Attempts to convert to E.164 format where possible
 *
 * @param {string} phone - The phone number to normalize
 * @param {string} defaultCountryCode - Default country code (e.g., '+1' for US)
 * @returns {string|null} - Normalized phone number or null if invalid
 */
const normalizePhoneNumber = (phone, defaultCountryCode = '+1') => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (!cleaned) {
    return null;
  }

  // Handle different input formats

  // Already has country code (starts with +)
  if (cleaned.startsWith('+')) {
    // Ensure it has a valid length (8-15 digits after the +)
    if (cleaned.length >= 9 && cleaned.length <= 16) {
      return cleaned;
    }
    return null;
  }

  // Handle US/Canada numbers (10 or 11 digits)
  if (cleaned.length === 10) {
    // 10 digits, assume US/Canada format
    return `${defaultCountryCode}${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // 11 digits starting with 1 (US/Canada with country code)
    return `+${cleaned}`;
  } else if (cleaned.length === 11) {
    // 11 digits not starting with 1, add default country code
    return `${defaultCountryCode}${cleaned}`;
  }

  // Handle 7-digit local numbers (add default country code + default area code)
  if (cleaned.length === 7) {
    // For 7-digit numbers, we can't reliably add area code
    // Return null to force user to provide full number
    return null;
  }

  // International format (more than 11 digits or less than 7)
  if (cleaned.length >= 8 && cleaned.length <= 15) {
    // Add + if missing
    return `+${cleaned}`;
  }

  // Invalid length
  return null;
};

/**
 * Validate a phone number
 * More comprehensive than basic regex validation
 *
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Must have at least 7 digits
  const digits = cleaned.replace(/\+/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return false;
  }

  // If it has a +, it must be at the start
  if (cleaned.includes('+') && !cleaned.startsWith('+')) {
    return false;
  }

  // Can only have one +
  if ((cleaned.match(/\+/g) || []).length > 1) {
    return false;
  }

  return true;
};

/**
 * Format a phone number for display
 * Converts normalized phone numbers to human-readable format
 *
 * @param {string} phone - The phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneForDisplay = (phone) => {
  if (!phone) {
    return '';
  }

  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // US/Canada format (+1XXXXXXXXXX or 1XXXXXXXXXX or XXXXXXXXXX)
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    // +1 (XXX) XXX-XXXX
    const digits = cleaned.substring(2);
    return `+1 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    // 1 (XXX) XXX-XXXX
    const digits = cleaned.substring(1);
    return `+1 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
    // (XXX) XXX-XXXX
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }

  // International format with country code
  if (cleaned.startsWith('+')) {
    // Keep the + and add spaces for readability
    const digits = cleaned.substring(1);
    if (digits.length <= 4) {
      return `+${digits}`;
    } else if (digits.length <= 7) {
      return `+${digits.substring(0, digits.length - 4)} ${digits.substring(digits.length - 4)}`;
    } else if (digits.length <= 10) {
      return `+${digits.substring(0, digits.length - 7)} ${digits.substring(digits.length - 7, digits.length - 4)} ${digits.substring(digits.length - 4)}`;
    } else {
      // For longer international numbers, format as: +CC XXX XXX XXXX
      return `+${digits.substring(0, digits.length - 10)} ${digits.substring(digits.length - 10, digits.length - 7)} ${digits.substring(digits.length - 7, digits.length - 4)} ${digits.substring(digits.length - 4)}`;
    }
  }

  // Default: return cleaned with spaces every 3-4 digits
  if (cleaned.length > 6) {
    return cleaned.match(/.{1,4}/g).join(' ');
  }

  return cleaned;
};

/**
 * Check if two phone numbers are equivalent
 * Compares normalized versions to handle different formatting
 *
 * @param {string} phone1 - First phone number
 * @param {string} phone2 - Second phone number
 * @returns {boolean} - True if phone numbers are equivalent
 */
const arePhoneNumbersEquivalent = (phone1, phone2) => {
  if (!phone1 || !phone2) {
    return false;
  }

  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
};

/**
 * Strip formatting from phone number for database comparison
 * Returns just the digits and + if present
 *
 * @param {string} phone - The phone number
 * @returns {string} - Stripped phone number
 */
const stripPhoneFormatting = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  return phone.replace(/[^\d+]/g, '');
};

/**
 * Detect phone number country code
 *
 * @param {string} phone - The phone number
 * @returns {string|null} - Country code (e.g., '+1', '+44') or null
 */
const detectCountryCode = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  const cleaned = phone.replace(/[^\d+]/g, '');

  if (!cleaned.startsWith('+')) {
    return null;
  }

  // Common country codes
  // +1 (US/Canada) - 1 digit
  // +44 (UK), +33 (France), +49 (Germany) - 2 digits
  // +351 (Portugal), +353 (Ireland) - 3 digits

  // Try 1 digit country code
  if (cleaned.length >= 11) {
    const code = cleaned.substring(0, 2);
    if (['+1'].includes(code)) {
      return code;
    }
  }

  // Try 2 digit country code
  if (cleaned.length >= 12) {
    const code = cleaned.substring(0, 3);
    if (['+44', '+49', '+61', '+91', '+81', '+86', '+52', '+55', '+34', '+39', '+31', '+32', '+33'].includes(code)) {
      return code;
    }
  }

  // Try 3 digit country code
  if (cleaned.length >= 13) {
    const code = cleaned.substring(0, 4);
    if (['+351', '+353', '+358', '+420', '+421'].includes(code)) {
      return code;
    }
  }

  return null;
};

/**
 * Get phone number type/carrier hint from format
 * This is a basic heuristic and not 100% accurate
 *
 * @param {string} phone - The phone number
 * @returns {string} - Phone type hint ('mobile', 'landline', 'voip', 'unknown')
 */
const getPhoneTypeHint = (phone) => {
  // This is a placeholder for future enhancement
  // Could integrate with phone number lookup APIs
  // For now, just return 'unknown'
  return 'unknown';
};

module.exports = {
  normalizePhoneNumber,
  validatePhone,
  formatPhoneForDisplay,
  arePhoneNumbersEquivalent,
  stripPhoneFormatting,
  detectCountryCode,
  getPhoneTypeHint
};

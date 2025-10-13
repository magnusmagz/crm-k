/**
 * Tests for Phone Number Utilities
 */

const {
  normalizePhoneNumber,
  validatePhone,
  formatPhoneForDisplay,
  arePhoneNumbersEquivalent,
  stripPhoneFormatting,
  detectCountryCode
} = require('../utils/phoneUtils');

describe('Phone Number Utilities', () => {
  describe('normalizePhoneNumber', () => {
    test('should normalize US 10-digit number', () => {
      expect(normalizePhoneNumber('5551234567')).toBe('+15551234567');
      expect(normalizePhoneNumber('555-123-4567')).toBe('+15551234567');
      expect(normalizePhoneNumber('(555) 123-4567')).toBe('+15551234567');
      expect(normalizePhoneNumber('555.123.4567')).toBe('+15551234567');
    });

    test('should normalize US 11-digit number with country code', () => {
      expect(normalizePhoneNumber('15551234567')).toBe('+15551234567');
      expect(normalizePhoneNumber('1-555-123-4567')).toBe('+15551234567');
    });

    test('should preserve existing + prefix', () => {
      expect(normalizePhoneNumber('+15551234567')).toBe('+15551234567');
      expect(normalizePhoneNumber('+44 20 7946 0958')).toBe('+442079460958');
    });

    test('should handle international numbers', () => {
      expect(normalizePhoneNumber('+442079460958')).toBe('+442079460958');
      expect(normalizePhoneNumber('442079460958')).toBe('+442079460958');
    });

    test('should return null for invalid inputs', () => {
      expect(normalizePhoneNumber('')).toBeNull();
      expect(normalizePhoneNumber(null)).toBeNull();
      expect(normalizePhoneNumber('123')).toBeNull(); // Too short
      expect(normalizePhoneNumber('12345678901234567')).toBeNull(); // Too long
    });

    test('should handle various formatting characters', () => {
      expect(normalizePhoneNumber('+1 (555) 123-4567')).toBe('+15551234567');
      expect(normalizePhoneNumber('1.555.123.4567')).toBe('+15551234567');
      expect(normalizePhoneNumber('1 555 123 4567')).toBe('+15551234567');
    });
  });

  describe('validatePhone', () => {
    test('should validate correct phone numbers', () => {
      expect(validatePhone('5551234567')).toBe(true);
      expect(validatePhone('555-123-4567')).toBe(true);
      expect(validatePhone('(555) 123-4567')).toBe(true);
      expect(validatePhone('+15551234567')).toBe(true);
      expect(validatePhone('+442079460958')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validatePhone('')).toBe(false);
      expect(validatePhone(null)).toBe(false);
      expect(validatePhone('123')).toBe(false); // Too short
      expect(validatePhone('12345678901234567')).toBe(false); // Too long
      expect(validatePhone('555+1234567')).toBe(false); // + in wrong position
      expect(validatePhone('+1+5551234567')).toBe(false); // Multiple +
    });
  });

  describe('formatPhoneForDisplay', () => {
    test('should format US numbers', () => {
      expect(formatPhoneForDisplay('+15551234567')).toBe('+1 (555) 123-4567');
      expect(formatPhoneForDisplay('15551234567')).toBe('+1 (555) 123-4567');
      expect(formatPhoneForDisplay('5551234567')).toBe('(555) 123-4567');
    });

    test('should format international numbers', () => {
      expect(formatPhoneForDisplay('+442079460958')).toBe('+44 207 946 0958');
    });

    test('should handle empty or null inputs', () => {
      expect(formatPhoneForDisplay('')).toBe('');
      expect(formatPhoneForDisplay(null)).toBe('');
    });
  });

  describe('arePhoneNumbersEquivalent', () => {
    test('should match equivalent phone numbers', () => {
      expect(arePhoneNumbersEquivalent('5551234567', '+15551234567')).toBe(true);
      expect(arePhoneNumbersEquivalent('(555) 123-4567', '555-123-4567')).toBe(true);
      expect(arePhoneNumbersEquivalent('+1-555-123-4567', '15551234567')).toBe(true);
    });

    test('should not match different phone numbers', () => {
      expect(arePhoneNumbersEquivalent('5551234567', '5559876543')).toBe(false);
      expect(arePhoneNumbersEquivalent('+15551234567', '+442079460958')).toBe(false);
    });

    test('should handle empty or null inputs', () => {
      expect(arePhoneNumbersEquivalent('', '5551234567')).toBe(false);
      expect(arePhoneNumbersEquivalent(null, null)).toBe(false);
    });
  });

  describe('stripPhoneFormatting', () => {
    test('should strip all formatting', () => {
      expect(stripPhoneFormatting('(555) 123-4567')).toBe('5551234567');
      expect(stripPhoneFormatting('+1 555-123-4567')).toBe('+15551234567');
      expect(stripPhoneFormatting('555.123.4567')).toBe('5551234567');
    });

    test('should handle empty or null inputs', () => {
      expect(stripPhoneFormatting('')).toBe('');
      expect(stripPhoneFormatting(null)).toBe('');
    });
  });

  describe('detectCountryCode', () => {
    test('should detect US/Canada country code', () => {
      expect(detectCountryCode('+15551234567')).toBe('+1');
    });

    test('should detect UK country code', () => {
      expect(detectCountryCode('+442079460958')).toBe('+44');
    });

    test('should detect 3-digit country codes', () => {
      expect(detectCountryCode('+351912345678')).toBe('+351');
    });

    test('should return null for numbers without country code', () => {
      expect(detectCountryCode('5551234567')).toBeNull();
      expect(detectCountryCode('')).toBeNull();
    });
  });
});

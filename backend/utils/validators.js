const { validatePhone: validatePhoneNumber, normalizePhoneNumber } = require('./phoneUtils');

// Email validation regex
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation - uses enhanced validation from phoneUtils
// Kept as 'validatePhone' for backward compatibility
const validatePhone = (phone) => {
  return validatePhoneNumber(phone);
};

module.exports = {
  validateEmail,
  validatePhone,
  normalizePhoneNumber // Export normalization for use in other modules
};
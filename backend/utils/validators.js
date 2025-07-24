// Email validation regex
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation - allows common phone formats
const validatePhone = (phone) => {
  // Remove all non-numeric characters except + for international
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check if it's a valid phone length (7-15 digits)
  const phoneRegex = /^(\+?\d{7,15})$/;
  return phoneRegex.test(cleaned);
};

module.exports = {
  validateEmail,
  validatePhone
};
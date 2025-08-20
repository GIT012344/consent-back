// Thai ID card validation
function validateThaiID(id) {
  // Check if it's 13 digits
  if (!/^\d{13}$/.test(id)) {
    return false;
  }
  
  // Validate checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id.charAt(i)) * (13 - i);
  }
  
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id.charAt(12));
}

// Passport validation (basic format check)
function validatePassport(passport) {
  // Allow alphanumeric characters, 6-20 characters
  return /^[A-Z0-9]{6,20}$/i.test(passport);
}

// Email validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Thai phone number validation
function validateThaiPhone(phone) {
  // Thai mobile numbers start with 06, 08, or 09 and have 10 digits total
  const phoneRegex = /^(0[689]\d{8})$/;
  return phoneRegex.test(phone);
}

// ID or Passport validation (combined)
function validateIDOrPassport(value) {
  // Try Thai ID first
  if (/^\d{13}$/.test(value)) {
    return validateThaiID(value);
  }
  // Otherwise validate as passport
  return validatePassport(value);
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Format date for display
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Generate reference number
function generateReferenceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `CONS-${year}-${timestamp}`;
}

module.exports = {
  validateThaiID,
  validatePassport,
  validateEmail,
  validateThaiPhone,
  validateIDOrPassport,
  sanitizeInput,
  formatDate,
  generateReferenceNumber
};

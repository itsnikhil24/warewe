const { MAX_EMAIL_LENGTH } = require('../config/constants');

function validateEmailSyntax(email) {
  if (typeof email !== 'string') {
    return { valid: false, reason: 'invalid_type' };
  }

  const value = email.trim();

  if (!value) {
    return { valid: false, reason: 'empty_string' };
  }

  if (value.length > MAX_EMAIL_LENGTH) {
    return { valid: false, reason: 'email_too_long' };
  }

  const atCount = (value.match(/@/g) || []).length;

  if (atCount === 0) {
    return { valid: false, reason: 'missing_at_symbol' };
  }

  if (atCount > 1) {
    return { valid: false, reason: 'multiple_at_symbols' };
  }

  const [localPart, domainPart] = value.split('@');

  if (!localPart || !domainPart) {
    return { valid: false, reason: 'missing_local_or_domain' };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { valid: false, reason: 'invalid_local_part' };
  }

  if (domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.includes('..')) {
    return { valid: false, reason: 'invalid_domain_part' };
  }

  const emailRegex = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

  if (!emailRegex.test(value)) {
    return { valid: false, reason: 'regex_mismatch' };
  }

  return {
    valid: true,
    email: value,
    localPart,
    domain: domainPart.toLowerCase(),
  };
}

module.exports = validateEmailSyntax;
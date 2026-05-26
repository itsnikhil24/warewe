const validateEmailSyntax = require('../validators/emailSyntaxValidator');

describe('emailSyntaxValidator', () => {
  test('accepts a valid email', () => {
    const result = validateEmailSyntax('user@example.com');
    expect(result.valid).toBe(true);
  });

  test('rejects missing @', () => {
    const result = validateEmailSyntax('userexample.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_at_symbol');
  });

  test('rejects multiple @ symbols', () => {
    const result = validateEmailSyntax('user@@example.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('multiple_at_symbols');
  });

  test('rejects double dots in local part', () => {
    const result = validateEmailSyntax('us..er@example.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_local_part');
  });

  test('rejects double dots in domain part', () => {
    const result = validateEmailSyntax('user@exa..mple.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_domain_part');
  });

  test('rejects empty string', () => {
    const result = validateEmailSyntax('');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('empty_string');
  });

  test('rejects null', () => {
    const result = validateEmailSyntax(null);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_type');
  });

  test('rejects undefined', () => {
    const result = validateEmailSyntax(undefined);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_type');
  });

  test('rejects very long email', () => {
    const longEmail = `${'a'.repeat(245)}@example.com`;
    const result = validateEmailSyntax(longEmail);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('email_too_long');
  });
});
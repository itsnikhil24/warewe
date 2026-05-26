const verifyEmail = require('../verifyEmail');

describe('verifyEmail', () => {
  test('returns valid when MX and SMTP say mailbox exists', async () => {
    const resolveMx = jest.fn().mockResolvedValue([
      { priority: 10, exchange: 'mx1.example.com' },
    ]);

    const smtpProbe = jest.fn().mockResolvedValue({
      result: 'valid',
      resultcode: 1,
      subresult: 'mailbox_exists',
    });

    const result = await verifyEmail('user@example.com', { resolveMx, smtpProbe });

    expect(result.result).toBe('valid');
    expect(result.resultcode).toBe(1);
    expect(result.subresult).toBe('mailbox_exists');
    expect(result.domain).toBe('example.com');
    expect(result.mxRecords).toEqual(['mx1.example.com']);
  });

  test('returns invalid for 550 response', async () => {
    const resolveMx = jest.fn().mockResolvedValue([
      { priority: 10, exchange: 'mx1.example.com' },
    ]);

    const smtpProbe = jest.fn().mockResolvedValue({
      result: 'invalid',
      resultcode: 6,
      subresult: 'mailbox_does_not_exist',
      error: '550 5.1.1 user unknown',
    });

    const result = await verifyEmail('user@example.com', { resolveMx, smtpProbe });

    expect(result.result).toBe('invalid');
    expect(result.resultcode).toBe(6);
    expect(result.subresult).toBe('mailbox_does_not_exist');
  });

  test('returns unknown for 450 response', async () => {
    const resolveMx = jest.fn().mockResolvedValue([
      { priority: 10, exchange: 'mx1.example.com' },
    ]);

    const smtpProbe = jest.fn().mockResolvedValue({
      result: 'unknown',
      resultcode: 3,
      subresult: 'greylisted',
      error: '450 4.2.0 Try again later',
    });

    const result = await verifyEmail('user@example.com', { resolveMx, smtpProbe });

    expect(result.result).toBe('unknown');
    expect(result.resultcode).toBe(3);
    expect(result.subresult).toBe('greylisted');
  });

  test('returns unknown for connection timeout', async () => {
    const resolveMx = jest.fn().mockResolvedValue([
      { priority: 10, exchange: 'mx1.example.com' },
    ]);

    const smtpProbe = jest.fn().mockResolvedValue({
      result: 'unknown',
      resultcode: 3,
      subresult: 'connection_timeout',
      error: 'Connection timed out',
    });

    const result = await verifyEmail('user@example.com', { resolveMx, smtpProbe });

    expect(result.result).toBe('unknown');
    expect(result.subresult).toBe('connection_timeout');
  });

  test('returns invalid with typo suggestion', async () => {
    const result = await verifyEmail('user@gmial.com');

    expect(result.result).toBe('invalid');
    expect(result.subresult).toBe('typo_detected');
    expect(result.didyoumean).toBe('user@gmail.com');
  });

  test('returns invalid for empty string', async () => {
    const result = await verifyEmail('');
    expect(result.result).toBe('invalid');
    expect(result.subresult).toBe('empty_string');
  });

  test('returns invalid for null', async () => {
    const result = await verifyEmail(null);
    expect(result.result).toBe('invalid');
    expect(result.subresult).toBe('invalid_type');
  });

  test('returns invalid for undefined', async () => {
    const result = await verifyEmail(undefined);
    expect(result.result).toBe('invalid');
    expect(result.subresult).toBe('invalid_type');
  });

  test('returns invalid for missing @', async () => {
    const result = await verifyEmail('userexample.com');
    expect(result.result).toBe('invalid');
    expect(result.subresult).toBe('missing_at_symbol');
  });

  test('returns invalid for multiple @ symbols', async () => {
    const result = await verifyEmail('user@@example.com');
    expect(result.result).toBe('invalid');
    expect(result.subresult).toBe('multiple_at_symbols');
  });

  test('returns unknown when DNS lookup fails', async () => {
    const resolveMx = jest.fn().mockRejectedValue(new Error('DNS failure'));

    const result = await verifyEmail('user@example.com', { resolveMx });

    expect(result.result).toBe('unknown');
    expect(result.subresult).toBe('dns_error');
  });

  test('returns unknown when no MX records exist', async () => {
    const resolveMx = jest.fn().mockResolvedValue([]);

    const result = await verifyEmail('user@example.com', { resolveMx });

    expect(result.result).toBe('unknown');
    expect(result.subresult).toBe('no_mx_records');
  });

  test('sorts MX records by priority', async () => {
    const resolveMx = jest.fn().mockResolvedValue([
      { priority: 20, exchange: 'mx2.example.com' },
      { priority: 5, exchange: 'mx1.example.com' },
    ]);

    const smtpProbe = jest.fn().mockResolvedValue({
      result: 'valid',
      resultcode: 1,
      subresult: 'mailbox_exists',
    });

    const result = await verifyEmail('user@example.com', { resolveMx, smtpProbe });

    expect(result.mxRecords).toEqual(['mx1.example.com', 'mx2.example.com']);
  });

  test('tries next MX when first one returns unknown', async () => {
    const resolveMx = jest.fn().mockResolvedValue([
      { priority: 10, exchange: 'mx1.example.com' },
      { priority: 20, exchange: 'mx2.example.com' },
    ]);

    const smtpProbe = jest.fn()
      .mockResolvedValueOnce({
        result: 'unknown',
        resultcode: 3,
        subresult: 'connection_error',
        error: 'First MX failed',
      })
      .mockResolvedValueOnce({
        result: 'valid',
        resultcode: 1,
        subresult: 'mailbox_exists',
      });

    const result = await verifyEmail('user@example.com', { resolveMx, smtpProbe });

    expect(result.result).toBe('valid');
    expect(smtpProbe).toHaveBeenCalledTimes(2);
  });
});
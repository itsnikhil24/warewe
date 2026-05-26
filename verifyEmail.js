const validateEmailSyntax = require('./validators/emailSyntaxValidator');
const getDidYouMean = require('./services/typoService');
const resolveMxRecords = require('./services/domainService');
const smtpProbe = require('./services/smtpService');
const buildResponse = require('./helpers/responseBuilder');
const { RESULT_CODES } = require('./config/constants');

async function verifyEmail(email, options = {}) {
  const startedAt = Date.now();

  const syntax = validateEmailSyntax(email);

  if (!syntax.valid) {
    return buildResponse({
      email: typeof email === 'string' ? email.trim() : email,
      result: 'invalid',
      resultcode: RESULT_CODES.INVALID,
      subresult: syntax.reason,
      domain: null,
      mxRecords: [],
      error: 'Invalid email syntax',
      startedAt,
    });
  }

  const normalizedEmail = syntax.email;
  const domain = syntax.domain;

  const didyoumean = getDidYouMean(normalizedEmail);

  if (didyoumean) {
    return buildResponse({
      email: normalizedEmail,
      result: 'invalid',
      resultcode: RESULT_CODES.INVALID,
      subresult: 'typo_detected',
      domain,
      mxRecords: [],
      error: null,
      didyoumean,
      startedAt,
    });
  }

  let mxRecords = [];

  try {
    const resolveMx = options.resolveMx;
    mxRecords = await resolveMxRecords(domain, resolveMx);
  } catch (err) {
    return buildResponse({
      email: normalizedEmail,
      result: 'unknown',
      resultcode: RESULT_CODES.UNKNOWN,
      subresult: 'dns_error',
      domain,
      mxRecords: [],
      error: err.message,
      startedAt,
    });
  }

  if (!mxRecords.length) {
    return buildResponse({
      email: normalizedEmail,
      result: 'unknown',
      resultcode: RESULT_CODES.UNKNOWN,
      subresult: 'no_mx_records',
      domain,
      mxRecords: [],
      error: 'No MX records found',
      startedAt,
    });
  }

  const probe = options.smtpProbe || smtpProbe;
  let lastUnknown = null;

  for (const mx of mxRecords) {
    try {
      const result = await probe(mx, normalizedEmail, options.smtpOptions || {});

      if (result.result === 'valid') {
        return buildResponse({
          email: normalizedEmail,
          result: 'valid',
          resultcode: RESULT_CODES.VALID,
          subresult: result.subresult || 'mailbox_exists',
          domain,
          mxRecords,
          error: null,
          startedAt,
        });
      }

      if (result.result === 'invalid') {
        return buildResponse({
          email: normalizedEmail,
          result: 'invalid',
          resultcode: RESULT_CODES.INVALID,
          subresult: result.subresult || 'mailbox_does_not_exist',
          domain,
          mxRecords,
          error: result.error || null,
          startedAt,
        });
      }

      lastUnknown = result;
    } catch (err) {
      lastUnknown = {
        result: 'unknown',
        resultcode: RESULT_CODES.UNKNOWN,
        subresult: 'connection_error',
        error: err.message,
      };
    }
  }

  return buildResponse({
    email: normalizedEmail,
    result: 'unknown',
    resultcode: RESULT_CODES.UNKNOWN,
    subresult: lastUnknown?.subresult || 'connection_error',
    domain,
    mxRecords,
    error: lastUnknown?.error || 'Verification could not be completed',
    startedAt,
  });
}

module.exports = verifyEmail;
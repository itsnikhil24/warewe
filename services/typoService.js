const validateEmailSyntax = require('../validators/emailSyntaxValidator');
const levenshtein = require('../helpers/levenshtein');
const { COMMON_EMAIL_DOMAINS } = require('../config/constants');

function getDidYouMean(email) {
  const syntax = validateEmailSyntax(email);

  if (!syntax.valid) {
    return null;
  }

  const { localPart, domain } = syntax;

  let bestMatch = null;
  let bestDistance = Infinity;

  for (const commonDomain of COMMON_EMAIL_DOMAINS) {
    if (commonDomain === domain) continue;

    const distance = levenshtein(domain, commonDomain);

    if (distance <= 2 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = commonDomain;
    }
  }

  return bestMatch ? `${localPart}@${bestMatch}` : null;
}

module.exports = getDidYouMean;
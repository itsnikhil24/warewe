module.exports = {
  verifyEmail: require('./verifyEmail'),
  validateEmailSyntax: require('./validators/emailSyntaxValidator'),
  getDidYouMean: require('./services/typoService'),
  levenshtein: require('./helpers/levenshtein'),
};
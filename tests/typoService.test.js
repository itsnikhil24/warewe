 const getDidYouMean = require('../services/typoService');

describe('typoService', () => {
  test('suggests gmail.com for gmial.com', () => {
    expect(getDidYouMean('user@gmial.com')).toBe('user@gmail.com');
  });

  test('suggests yahoo.com for yahooo.com', () => {
    expect(getDidYouMean('user@yahooo.com')).toBe('user@yahoo.com');
  });

  test('suggests hotmail.com for hotmial.com', () => {
    expect(getDidYouMean('user@hotmial.com')).toBe('user@hotmail.com');
  });

  test('suggests outlook.com for outlok.com', () => {
    expect(getDidYouMean('user@outlok.com')).toBe('user@outlook.com');
  });

  test('returns null for correct gmail.com', () => {
    expect(getDidYouMean('user@gmail.com')).toBeNull();
  });

  test('returns null for unrelated domain', () => {
    expect(getDidYouMean('user@companyxyz.com')).toBeNull();
  });
});
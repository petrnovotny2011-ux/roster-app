const { toBool } = require('../../js/helpers.js');

describe('toBool', () => {
  it('should return false for null or undefined', () => {
    expect(toBool(null)).toBe(false);
    expect(toBool(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(toBool('')).toBe(false);
  });

  it('should return true', () => {
    expect(toBool('true')).toBe(true);
    expect(toBool('True')).toBe(true);
    expect(toBool(' TRUE ')).toBe(true);
    expect(toBool('1')).toBe(true);
    expect(toBool('ano')).toBe(true);
    expect(toBool('yes')).toBe(true);
    expect(toBool('y')).toBe(true);
  });
});
const PrivacyPolicy = require('../../src/models/PrivacyPolicy');

describe('PrivacyPolicy audiences', () => {
  test('supports USER and CAREGIVER (nurse uses CAREGIVER)', () => {
    expect(PrivacyPolicy.AUDIENCES).toEqual(['USER', 'CAREGIVER']);
  });
});

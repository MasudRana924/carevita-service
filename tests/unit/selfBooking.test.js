const {
  BOOK_FOR_SELF,
  BOOK_FOR_FAMILY,
  resolveBookFor,
  assertBookingSubject,
  buildSelfPatientSnapshot,
  buildFamilyPatientSnapshot
} = require('../../src/services/selfBooking');

describe('self booking subject', () => {
  test('omitted book_for stays family booking', () => {
    expect(resolveBookFor({})).toBe(BOOK_FOR_FAMILY);
    expect(resolveBookFor({ family_member_id: 'fm-1' })).toBe(BOOK_FOR_FAMILY);
  });

  test('SELF and for_self both select the account holder', () => {
    expect(resolveBookFor({ book_for: 'self' })).toBe(BOOK_FOR_SELF);
    expect(resolveBookFor({ for_self: true })).toBe(BOOK_FOR_SELF);
    expect(resolveBookFor({ for_self: 'true' })).toBe(BOOK_FOR_SELF);
  });

  test('rejects unknown book_for', () => {
    expect(() => resolveBookFor({ book_for: 'FRIEND' })).toThrow('book_for must be SELF or FAMILY');
  });

  test('rejects family_member_id together with SELF', () => {
    expect(() => assertBookingSubject({
      book_for: 'SELF',
      family_member_id: 'fm-1'
    })).toThrow('family_member_id must not be sent when book_for is SELF');
  });
});

describe('self patient snapshot', () => {
  test('uses the account name and optional location', () => {
    const snapshot = buildSelfPatientSnapshot(
      {
        name: '  Rafi ',
        phone: '01700000000',
        profile_photo: 'https://cdn.example/p.jpg',
        date_of_birth: '1995-04-02',
        address: 'House 4, Dhanmondi'
      },
      { district: 'Dhaka', thana: 'Dhanmondi', allergies: ' dust ' }
    );

    expect(snapshot).toMatchObject({
      name: 'Rafi',
      phone: '01700000000',
      relationship: 'Self',
      district: 'Dhaka',
      thana: 'Dhanmondi',
      house: 'House 4, Dhanmondi',
      allergies: 'dust',
      date_of_birth: '1995-04-02'
    });
  });

  test('requires a profile name', () => {
    expect(() => buildSelfPatientSnapshot({ name: '  ' }, {})).toThrow(
      'Add your name on your profile before booking for yourself'
    );
  });
});

describe('family patient snapshot', () => {
  test('copies the family member as they are at booking time', () => {
    const snapshot = buildFamilyPatientSnapshot({
      name: 'Nabila',
      relationship: 'Mother',
      district: 'Dhaka',
      thana: 'Mirpur',
      house: 'Road 2',
      allergies: 'nuts'
    });
    expect(snapshot).toMatchObject({
      name: 'Nabila',
      relationship: 'Mother',
      district: 'Dhaka',
      thana: 'Mirpur',
      house: 'Road 2',
      allergies: 'nuts'
    });
  });
});

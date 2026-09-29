const { stripCaregiverContacts, stripCaregiverSearch } = require('../../src/services/caregiverCache');

describe('caregiver cache shape', () => {
  test('removes contact and credential fields before Redis', () => {
    const card = stripCaregiverContacts({
      id: 'cp-1',
      name: 'Mina',
      district: 'Dhaka',
      email: 'mina@example.com',
      phone: '01700000000',
      emergency_contact: '01800000000',
      address: 'House 1',
      credential_number: 'NMC-9',
      ekyc_reference_id: 'ref-1',
      user_ekyc_reference_id: 'ref-2',
      rating: '4.80'
    });

    expect(card).toEqual({
      id: 'cp-1',
      name: 'Mina',
      district: 'Dhaka',
      rating: '4.80'
    });
  });

  test('strips every search row and keeps the total', () => {
    const cached = stripCaregiverSearch({
      total: 1,
      items: [{ id: 'cp-1', name: 'Mina', phone: '017' }]
    });
    expect(cached.total).toBe(1);
    expect(cached.items[0].phone).toBeUndefined();
    expect(cached.items[0].name).toBe('Mina');
  });
});

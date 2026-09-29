const { presentBooking, POST_ACCEPT_STATUSES } = require('../../src/utils/phiPolicy');

describe('phiPolicy.presentBooking', () => {
  const base = {
    id: 'b1',
    status: 'PROVIDER_ASSIGNED',
    allergies: 'peanuts',
    existing_conditions: 'asthma',
    current_medications: 'inhaler',
    medical_history: 'long history',
    patient_requirements: 'needs wheelchair',
    family_member_house: '12 Road',
    service_type: 'HOME_CARE'
  };

  test('raw patient snapshot is not returned', () => {
    const view = presentBooking({
      ...base,
      patient_snapshot: { medical_history: 'secret', name: 'Rafi' },
      family_member_name: 'Rafi'
    }, { asProvider: false });
    expect(view.patient_snapshot).toBeUndefined();
    expect(view.family_member_name).toBe('Rafi');
    expect(view.medical_history).toBe('long history');
    expect(view.patient).toMatchObject({ source: 'FAMILY', name: 'Rafi' });
  });

  test('owner/admin sees full booking', () => {
    expect(presentBooking(base, { asProvider: false }).medical_history).toBe('long history');
    expect(presentBooking(base, { asProvider: true, isAdmin: true }).medical_history).toBe('long history');
  });

  test('provider before accept has no PHI', () => {
    const view = presentBooking(base, { asProvider: true });
    expect(view.allergies).toBeUndefined();
    expect(view.medical_history).toBeUndefined();
    expect(view.patient_requirements).toBeUndefined();
    expect(view.service_type).toBe('HOME_CARE');
    expect(view.patient.house).toBeNull();
    expect(view.patient.blood_group).toBeNull();
  });

  test('provider after accept sees minimum PHI not full history', () => {
    const accepted = { ...base, status: 'PROVIDER_ACCEPTED' };
    expect(POST_ACCEPT_STATUSES.has('PROVIDER_ACCEPTED')).toBe(true);
    const view = presentBooking(accepted, { asProvider: true });
    expect(view.allergies).toBe('peanuts');
    expect(view.existing_conditions).toBe('asthma');
    expect(view.current_medications).toBe('inhaler');
    expect(view.medical_history).toBeUndefined();
  });
});

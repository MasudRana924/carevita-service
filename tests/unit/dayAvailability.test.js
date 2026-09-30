const { isActiveOnDate, dayOfWeekFor } = require('../../src/models/Availability');

describe('day-wise caregiver availability', () => {
  test('Sunday is 0 and Wednesday 2026-09-30 is 3', () => {
    expect(dayOfWeekFor('2026-09-27')).toBe(0);
    expect(dayOfWeekFor('2026-09-30')).toBe(3);
  });

  test('no saved days means any booking date is allowed', () => {
    expect(isActiveOnDate([], '2026-09-30')).toBe(true);
  });

  test('an active day allows any clock time that weekday', () => {
    const slots = [{
      day_of_week: 3,
      start_time: '09:00:00',
      end_time: '12:00:00',
      is_active: true
    }];
    expect(isActiveOnDate(slots, '2026-09-30')).toBe(true);
  });

  test('a different weekday is not active', () => {
    const slots = [{ day_of_week: 1, is_active: true }];
    expect(isActiveOnDate(slots, '2026-09-30')).toBe(false);
  });

  test('inactive day does not count', () => {
    const slots = [{ day_of_week: 3, is_active: false }];
    expect(isActiveOnDate(slots, '2026-09-30')).toBe(false);
  });
});

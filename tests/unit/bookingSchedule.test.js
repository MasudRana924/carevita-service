const {
  getScheduledStartAt,
  getScheduledEndAt,
  journeyFlags,
  STATUSES
} = require('../../src/services/bookingJourney');

describe('Dhaka booking window', () => {
  test('10:00 Asia/Dhaka is 04:00 UTC', () => {
    const start = getScheduledStartAt({
      booking_date: '2099-01-01',
      start_time: '10:00'
    });
    expect(start).toBe('2099-01-01T04:00:00.000Z');
  });

  test('end is start plus duration hours', () => {
    const end = getScheduledEndAt({
      booking_date: '2099-01-01',
      start_time: '10:00:00',
      duration_hours: 2
    });
    expect(end).toBe('2099-01-01T06:00:00.000Z');
  });

  test('caregiver cannot start before the booked time or after it has ended', () => {
    const future = journeyFlags({
      status: STATUSES.PAYMENT_PAID,
      booking_date: '2099-01-01',
      start_time: '10:00:00',
      duration_hours: 2,
      user_id: 'user-1'
    }, { userId: 'caregiver-user', asProvider: true });

    expect(future.is_start_time_reached).toBe(false);
    expect(future.can_start).toBe(false);
    expect(future.can_complete).toBe(false);
  });

  test('caregiver can start only inside the booked window', () => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60 * 1000);
    const dhaka = new Date(start.getTime() + 6 * 60 * 60 * 1000);
    const booking_date = dhaka.toISOString().slice(0, 10);
    const hours = String(dhaka.getUTCHours()).padStart(2, '0');
    const minutes = String(dhaka.getUTCMinutes()).padStart(2, '0');

    const flags = journeyFlags({
      status: STATUSES.PAYMENT_PAID,
      booking_date,
      start_time: `${hours}:${minutes}:00`,
      duration_hours: 2,
      user_id: 'user-1'
    }, { userId: 'caregiver-user', asProvider: true });

    expect(flags.can_start).toBe(true);
    expect(flags.can_complete).toBe(false);
    expect(flags.can_report_no_start).toBe(false);
  });

  test('end is allowed only after the booked time, and a missed start can be reported', () => {
    const ended = journeyFlags({
      status: STATUSES.SERVICE_IN_PROGRESS,
      booking_date: '2000-01-01',
      start_time: '10:00:00',
      duration_hours: 1,
      user_id: 'user-1'
    }, { userId: 'caregiver-user', asProvider: true });

    expect(ended.is_end_time_reached).toBe(true);
    expect(ended.can_complete).toBe(true);
    expect(ended.can_start).toBe(false);

    const missed = journeyFlags({
      status: STATUSES.PAYMENT_PAID,
      booking_date: '2000-01-01',
      start_time: '10:00:00',
      duration_hours: 1,
      user_id: 'user-1'
    }, { userId: 'caregiver-user', asProvider: true });

    expect(missed.can_start).toBe(false);
    expect(missed.can_report_no_start).toBe(true);
  });

  test('user can accept or decline an active next-caregiver suggestion', () => {
    const flags = journeyFlags({
      status: STATUSES.SEARCHING_PROVIDER,
      suggested_provider_id: 'caregiver-profile-1',
      suggestion_expires_at: '2099-01-01T00:00:00.000Z',
      user_id: 'user-1',
      booking_date: '2099-01-02',
      start_time: '09:00:00',
      duration_hours: 2
    }, { userId: 'user-1', asProvider: false });

    expect(flags.awaiting_next_caregiver).toBe(true);
    expect(flags.can_accept_next_caregiver).toBe(true);
    expect(flags.can_decline_next_caregiver).toBe(true);
  });
});

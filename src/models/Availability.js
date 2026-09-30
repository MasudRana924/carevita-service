const pool = require('../config/database');

const listByProfileId = async (caregiverProfileId) => {
  const result = await pool.query(
    `
    SELECT * FROM caregiver_availability
    WHERE caregiver_profile_id = $1
    ORDER BY day_of_week, start_time
    `,
    [caregiverProfileId]
  );
  return result.rows;
};

const replaceWeeklySlots = async (caregiverProfileId, slots = []) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM caregiver_availability WHERE caregiver_profile_id = $1',
      [caregiverProfileId]
    );

    for (const slot of slots) {
      await client.query(
        `
        INSERT INTO caregiver_availability (
          caregiver_profile_id, day_of_week, start_time, end_time, is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          caregiverProfileId,
          slot.day_of_week,
          slot.start_time || '00:00:00',
          slot.end_time || '23:59:59',
          slot.is_active !== false
        ]
      );
    }

    await client.query('COMMIT');
    return listByProfileId(caregiverProfileId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const dayOfWeekFor = (bookingDate) => {
  const date = bookingDate instanceof Date
    ? bookingDate
    : new Date(`${String(bookingDate).slice(0, 10)}T00:00:00`);
  return date.getDay();
};

/**
 * Day-wise only. Clock times are not part of availability.
 * No rows means the caregiver has not limited their days, so any date is allowed.
 * Rows exist: the booking date's weekday must have is_active true.
 */
const isActiveOnDate = (slots, bookingDate) => {
  if (!slots || !slots.length) return true;
  const dayOfWeek = dayOfWeekFor(bookingDate);
  return slots.some(
    (slot) => slot.is_active !== false && Number(slot.day_of_week) === dayOfWeek
  );
};

const coversSlot = async (caregiverProfileId, bookingDate) => {
  const slots = await listByProfileId(caregiverProfileId);
  return isActiveOnDate(slots, bookingDate);
};

module.exports = {
  listByProfileId,
  replaceWeeklySlots,
  coversSlot,
  isActiveOnDate,
  dayOfWeekFor
};

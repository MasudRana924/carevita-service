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
          slot.start_time,
          slot.end_time,
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

const slotCovers = (slots, bookingDate, startTime, endTime) => {
  const active = (slots || []).filter((slot) => slot.is_active);
  if (!active.length) return true;

  const date = bookingDate instanceof Date
    ? bookingDate
    : new Date(`${String(bookingDate).slice(0, 10)}T00:00:00`);
  const dayOfWeek = date.getDay();
  const start = String(startTime).slice(0, 8);
  const end = String(endTime).slice(0, 8);

  return active.some((slot) => {
    if (Number(slot.day_of_week) !== dayOfWeek) return false;
    const slotStart = String(slot.start_time).slice(0, 8);
    const slotEnd = String(slot.end_time).slice(0, 8);
    return slotStart <= start && slotEnd >= end;
  });
};

const coversSlot = async (caregiverProfileId, bookingDate, startTime, endTime) => {
  const slots = await listByProfileId(caregiverProfileId);
  return slotCovers(slots, bookingDate, startTime, endTime);
};

/**
 * One query for a candidate set. Profiles with no weekly rows stay available,
 * matching coversSlot.
 * @returns {Promise<Set<string>>}
 */
const coveringProfileIds = async (profileIds, bookingDate, startTime, endTime) => {
  const ids = [...new Set((profileIds || []).filter(Boolean))];
  if (!ids.length) return new Set();

  const result = await pool.query(
    `
    SELECT caregiver_profile_id, day_of_week, start_time, end_time, is_active
    FROM caregiver_availability
    WHERE caregiver_profile_id = ANY($1::uuid[])
    `,
    [ids]
  );

  const byId = new Map();
  for (const row of result.rows) {
    if (!byId.has(row.caregiver_profile_id)) byId.set(row.caregiver_profile_id, []);
    byId.get(row.caregiver_profile_id).push(row);
  }

  return new Set(
    ids.filter((id) => slotCovers(byId.get(id) || [], bookingDate, startTime, endTime))
  );
};

module.exports = {
  listByProfileId,
  replaceWeeklySlots,
  coversSlot,
  coveringProfileIds
};

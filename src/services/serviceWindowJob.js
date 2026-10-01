const pool = require('../config/database');
const { notifyUser } = require('./pushNotificationService');
const { purgeStaleChats } = require('./bookingChatService');

const INTERVAL_MS = 60 * 1000;

const WINDOW_END_SQL = `
  (
    (
      b.duration_hours IS NOT NULL
      AND ((b.booking_date + b.start_time) AT TIME ZONE 'Asia/Dhaka')
          + (b.duration_hours::text || ' hours')::interval < NOW()
    )
    OR (
      b.duration_hours IS NULL
      AND b.end_time IS NOT NULL
      AND ((b.booking_date + b.end_time) AT TIME ZONE 'Asia/Dhaka') < NOW()
    )
  )
  AND (
    (
      b.duration_hours IS NOT NULL
      AND ((b.booking_date + b.start_time) AT TIME ZONE 'Asia/Dhaka')
          + (b.duration_hours::text || ' hours')::interval > NOW() - INTERVAL '48 hours'
    )
    OR (
      b.duration_hours IS NULL
      AND b.end_time IS NOT NULL
      AND ((b.booking_date + b.end_time) AT TIME ZONE 'Asia/Dhaka') > NOW() - INTERVAL '48 hours'
    )
  )
`;

const notifyMissedStarts = async () => {
  const { rows } = await pool.query(
    `
    SELECT
      b.id,
      b.booking_number,
      b.user_id,
      cp.user_id AS caregiver_user_id
    FROM bookings b
    JOIN caregiver_profiles cp
      ON cp.id = b.provider_id
     AND b.provider_type = 'CAREGIVER'
    WHERE b.status = 'PAYMENT_PAID'
      AND b.no_start_notified_at IS NULL
      AND b.booking_date IS NOT NULL
      AND b.start_time IS NOT NULL
      AND ${WINDOW_END_SQL}
    LIMIT 25
    `
  );

  let sent = 0;
  for (const row of rows) {
    const claimed = await pool.query(
      `
      UPDATE bookings
      SET no_start_notified_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND status = 'PAYMENT_PAID'
        AND no_start_notified_at IS NULL
      RETURNING id
      `,
      [row.id]
    );
    if (!claimed.rowCount) continue;

    try {
      if (row.caregiver_user_id) {
        await notifyUser({
          userId: row.caregiver_user_id,
          title: 'Service was not started',
          body: `You did not start booking ${row.booking_number}. Tell us why. If this was an emergency, say so — we will inform the user.`,
          type: 'SERVICE_NOT_STARTED',
          bookingId: row.id,
          referenceId: row.id,
          referenceType: 'booking',
          extraData: {
            booking_number: row.booking_number,
            status: 'PAYMENT_PAID',
            action: 'REPORT_NO_START',
            screen: 'no_start_reason'
          }
        });
      }

      await notifyUser({
        userId: row.user_id,
        title: 'Service was not started',
        body: `Your caregiver did not start booking ${row.booking_number}.`,
        type: 'SERVICE_MISSED_START',
        bookingId: row.id,
        referenceId: row.id,
        referenceType: 'booking',
        extraData: {
          booking_number: row.booking_number,
          status: 'PAYMENT_PAID',
          action: 'OPEN_BOOKING',
          screen: 'booking_details'
        }
      });
      sent += 1;
    } catch (err) {
      console.error('Missed-start notify failed:', err.message);
    }
  }
  return sent;
};

const notifyEndDue = async () => {
  const { rows } = await pool.query(
    `
    SELECT
      b.id,
      b.booking_number,
      cp.user_id AS caregiver_user_id
    FROM bookings b
    JOIN caregiver_profiles cp
      ON cp.id = b.provider_id
     AND b.provider_type = 'CAREGIVER'
    WHERE b.status = 'SERVICE_IN_PROGRESS'
      AND b.end_reminder_sent_at IS NULL
      AND b.booking_date IS NOT NULL
      AND b.start_time IS NOT NULL
      AND ${WINDOW_END_SQL}
    LIMIT 25
    `
  );

  let sent = 0;
  for (const row of rows) {
    const claimed = await pool.query(
      `
      UPDATE bookings
      SET end_reminder_sent_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND status = 'SERVICE_IN_PROGRESS'
        AND end_reminder_sent_at IS NULL
      RETURNING id
      `,
      [row.id]
    );
    if (!claimed.rowCount || !row.caregiver_user_id) continue;

    try {
      await notifyUser({
        userId: row.caregiver_user_id,
        title: 'Booking time is over',
        body: `Please end the service for booking ${row.booking_number}.`,
        type: 'SERVICE_END_DUE',
        bookingId: row.id,
        referenceId: row.id,
        referenceType: 'booking',
        extraData: {
          booking_number: row.booking_number,
          status: 'SERVICE_IN_PROGRESS',
          action: 'END_BOOKING',
          screen: 'booking_details'
        }
      });
      sent += 1;
    } catch (err) {
      console.error('End-due notify failed:', err.message);
    }
  }
  return sent;
};

const processServiceWindows = async () => {
  const missed = await notifyMissedStarts();
  const endDue = await notifyEndDue();
  const purgedChats = await purgeStaleChats();
  if (missed > 0) console.log(`Sent ${missed} missed-start notification(s)`);
  if (endDue > 0) console.log(`Sent ${endDue} service-end reminder(s)`);
  if (purgedChats > 0) console.log(`Purged ${purgedChats} ended booking chat(s)`);
  return { missed, endDue, purgedChats };
};

const startServiceWindowJob = () => {
  const run = async () => {
    try {
      await processServiceWindows();
    } catch (err) {
      console.error('Service window job failed:', err.message);
    }
  };

  setTimeout(run, 25 * 1000);
  setInterval(run, INTERVAL_MS);
  console.log('Service window job scheduled (every 1 min, Asia/Dhaka)');
};

module.exports = {
  processServiceWindows,
  startServiceWindowJob
};

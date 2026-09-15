const pool = require('../config/database');
const { notifyUser } = require('./pushNotificationService');

const INTERVAL_MS = 5 * 60 * 1000;

/**
 * Paid bookings whose scheduled start (Asia/Dhaka) is ~1 hour away.
 * Window 50–70 minutes so a 5-minute poll does not miss the mark.
 */
const sendDueStartReminders = async () => {
  const { rows } = await pool.query(
    `
    SELECT
      b.id,
      b.booking_number,
      b.booking_date,
      b.start_time,
      cp.user_id AS caregiver_user_id
    FROM bookings b
    JOIN caregiver_profiles cp
      ON cp.id = b.provider_id
     AND b.provider_type = 'CAREGIVER'
    WHERE b.status = 'PAYMENT_PAID'
      AND b.start_reminder_sent_at IS NULL
      AND b.booking_date IS NOT NULL
      AND b.start_time IS NOT NULL
      AND ((b.booking_date + b.start_time) AT TIME ZONE 'Asia/Dhaka')
          BETWEEN NOW() + INTERVAL '50 minutes'
              AND NOW() + INTERVAL '70 minutes'
    `
  );

  let sent = 0;
  for (const row of rows) {
    const claimed = await pool.query(
      `
      UPDATE bookings
      SET start_reminder_sent_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND start_reminder_sent_at IS NULL
      RETURNING id
      `,
      [row.id]
    );
    if (!claimed.rowCount || !row.caregiver_user_id) continue;

    try {
      await notifyUser({
        userId: row.caregiver_user_id,
        title: 'Service starts in 1 hour',
        body: `Booking ${row.booking_number} starts in 1 hour. Get ready to start the service.`,
        type: 'SERVICE_START_REMINDER',
        bookingId: row.id,
        referenceId: row.id,
        referenceType: 'booking',
        extraData: {
          booking_number: row.booking_number,
          status: 'PAYMENT_PAID',
          action: 'START_BOOKING',
          screen: 'booking_details',
          reminder: '1_HOUR'
        }
      });
      sent += 1;
    } catch (err) {
      console.error('Start reminder notify failed:', err.message);
    }
  }

  if (sent > 0) {
    console.log(`Sent ${sent} caregiver 1-hour start reminder(s)`);
  }
  return sent;
};

const startStartReminderJob = () => {
  const run = async () => {
    try {
      await sendDueStartReminders();
    } catch (err) {
      console.error('Start reminder job failed:', err.message);
    }
  };

  setTimeout(run, 15 * 1000);
  setInterval(run, INTERVAL_MS);
  console.log('Caregiver 1-hour start reminder job scheduled (every 5 min, Asia/Dhaka)');
};

module.exports = {
  sendDueStartReminders,
  startStartReminderJob
};

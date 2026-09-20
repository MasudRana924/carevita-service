const pool = require('../config/database');
const {
  findById,
  addRejection
} = require('../models/Booking');
const { reassignOrSearch } = require('./bookingAssignment');
const { notifyUser } = require('./pushNotificationService');
const { STATUSES } = require('./bookingJourney');

const INTERVAL_MS = 60 * 1000;

const processExpiredOffers = async () => {
  const { rows } = await pool.query(
    `
    SELECT id, provider_id, booking_number, user_id, status
    FROM bookings
    WHERE status = 'PROVIDER_ASSIGNED'
      AND offer_expires_at IS NOT NULL
      AND offer_expires_at < NOW()
    ORDER BY offer_expires_at ASC
    LIMIT 25
    `
  );

  let processed = 0;
  for (const row of rows) {
    const claimed = await pool.query(
      `
      UPDATE bookings
      SET offer_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'PROVIDER_ASSIGNED'
        AND offer_expires_at IS NOT NULL
        AND offer_expires_at < NOW()
      RETURNING id, provider_id
      `,
      [row.id]
    );
    if (!claimed.rowCount) continue;

    const booking = await findById(row.id);
    if (!booking || booking.status !== STATUSES.PROVIDER_ASSIGNED) continue;

    if (booking.provider_id) {
      await addRejection(booking.id, booking.provider_id, 'Offer timed out');
    }

    const result = await reassignOrSearch(
      booking,
      null,
      'Offer timed out — auto-reassigned'
    );

    if (result.next?.user_id) {
      try {
        await notifyUser({
          userId: result.next.user_id,
          title: 'New Booking Request',
          body: `You have a new booking ${booking.booking_number}. Tap to view details.`,
          type: 'BOOKING_CREATED',
          bookingId: booking.id,
          referenceId: booking.id,
          referenceType: 'booking',
          extraData: {
            booking_number: booking.booking_number,
            screen: 'inbox',
            offer_expires_at: result.booking.offer_expires_at || null
          }
        });
      } catch (e) {
        console.error('Timeout offer notify next failed:', e.message);
      }
    }

    try {
      await notifyUser({
        userId: booking.user_id,
        title: result.searching ? 'Looking for another caregiver' : 'Caregiver changed',
        body: result.searching
          ? `No response for ${booking.booking_number}. We are searching for another caregiver.`
          : `Your booking ${booking.booking_number} was offered to another caregiver.`,
        type: result.searching ? 'BOOKING_SEARCHING' : 'BOOKING_REASSIGNED',
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: { screen: 'inbox', searching: String(!!result.searching) }
      });
    } catch (e) {
      console.error('Timeout offer notify user failed:', e.message);
    }

    processed += 1;
  }

  if (processed > 0) {
    console.log(`Processed ${processed} expired booking offer(s)`);
  }
  return processed;
};

const startAcceptOfferTimeoutJob = () => {
  const run = async () => {
    try {
      await processExpiredOffers();
    } catch (err) {
      console.error('Accept-offer timeout job failed:', err.message);
    }
  };

  setTimeout(run, 20 * 1000);
  setInterval(run, INTERVAL_MS);
  console.log('Accept-offer timeout job scheduled (every 1 min)');
};

module.exports = {
  processExpiredOffers,
  startAcceptOfferTimeoutJob
};

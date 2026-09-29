const pool = require('../config/database');
const { handleOfferTimeout, expireUnansweredSuggestions } = require('./bookingService');

const INTERVAL_MS = 60 * 1000;

const processExpiredOffers = async () => {
  const { rows } = await pool.query(
    `
    SELECT id
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
    try {
      const result = await handleOfferTimeout(row.id);
      if (result && !result.skipped) processed += 1;
    } catch (err) {
      console.error('Timeout offer handling failed:', err.message);
    }
  }

  let expiredSuggestions = 0;
  try {
    expiredSuggestions = await expireUnansweredSuggestions();
  } catch (err) {
    console.error('Suggestion expiry handling failed:', err.message);
  }

  if (processed > 0) {
    console.log(`Processed ${processed} expired booking offer(s)`);
  }
  if (expiredSuggestions > 0) {
    console.log(`Cancelled ${expiredSuggestions} booking(s) with an unanswered caregiver suggestion`);
  }
  return processed + expiredSuggestions;
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

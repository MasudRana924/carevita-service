const { queueManager, QUEUE_NAMES } = require('../config/queue');
const { notifyUser } = require('../services/pushNotificationService');
const { logger } = require('../config/logger');

/**
 * Notification Queue Processor
 * Handles push notification sending asynchronously
 */

/**
 * Add notification job to queue
 */
async function addNotificationJob(data) {
  return await queueManager.addJob(
    QUEUE_NAMES.NOTIFICATIONS,
    'send-notification',
    data,
    {
      priority: data.priority || 'normal',
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  );
}

/**
 * Process notification job
 */
async function processNotificationJob(job) {
  const { userId, title, body, type, bookingId, referenceId, referenceType, extraData } = job.data;

  try {
    logger.info('Processing notification job', { jobId: job.id, userId, type });

    const result = await notifyUser({
      userId,
      title,
      body,
      type,
      bookingId,
      referenceId,
      referenceType,
      extraData
    });

    logger.info('Notification sent successfully', { jobId: job.id, userId });
    return result;
  } catch (error) {
    logger.error('Failed to send notification', { jobId: job.id, userId, error: error.message });
    throw error;
  }
}

/**
 * Start notification queue processor
 */
function startNotificationProcessor() {
  queueManager.process(QUEUE_NAMES.NOTIFICATIONS, processNotificationJob, 5);
  logger.info('Notification queue processor started');
}

module.exports = {
  addNotificationJob,
  processNotificationJob,
  startNotificationProcessor
};

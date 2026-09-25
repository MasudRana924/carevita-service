const notificationQueue = require('./notificationQueue');
const emailQueue = require('./emailQueue');
const auditLogQueue = require('./auditLogQueue');

/**
 * Start all queue processors
 */
function startAllProcessors() {
  notificationQueue.startNotificationProcessor();
  emailQueue.startEmailProcessor();
  auditLogQueue.startAuditLogProcessor();
}

/**
 * Stop all queue processors
 */
async function stopAllProcessors() {
  const { queueManager } = require('../config/queue');
  await queueManager.closeAll();
}

module.exports = {
  ...notificationQueue,
  ...emailQueue,
  ...auditLogQueue,
  startAllProcessors,
  stopAllProcessors
};

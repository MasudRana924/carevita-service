const { queueManager, QUEUE_NAMES } = require('../config/queue');
const pool = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Audit Log Queue Processor
 * Handles audit log writing asynchronously
 */

/**
 * Add audit log job to queue
 */
async function addAuditLogJob(data) {
  return await queueManager.addJob(
    QUEUE_NAMES.AUDIT_LOGS,
    'write-audit-log',
    data,
    {
      priority: 'high',
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    }
  );
}

/**
 * Process audit log job
 */
async function processAuditLogJob(job) {
  const { actorId, action, entityType, entityId, meta } = job.data;

  try {
    logger.info('Processing audit log job', { jobId: job.id, action, entityType });

    const query = `
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      actorId,
      action,
      entityType,
      entityId,
      meta ? JSON.stringify(meta) : null
    ];

    const result = await pool.query(query, values);

    logger.info('Audit log written successfully', { jobId: job.id, auditLogId: result.rows[0].id });
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to write audit log', { jobId: job.id, action, error: error.message });
    throw error;
  }
}

/**
 * Start audit log queue processor
 */
function startAuditLogProcessor() {
  queueManager.process(QUEUE_NAMES.AUDIT_LOGS, processAuditLogJob, 10);
  logger.info('Audit log queue processor started');
}

/**
 * Write audit log (async via queue)
 */
async function writeAuditLog(data) {
  return await addAuditLogJob(data);
}

module.exports = {
  addAuditLogJob,
  processAuditLogJob,
  startAuditLogProcessor,
  writeAuditLog
};

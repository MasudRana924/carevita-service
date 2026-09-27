const Queue = require('bull');
const redisClient = require('./redis');

/**
 * Queue Configuration
 * Bull queue for async task processing
 */
class QueueManager {
  constructor() {
    this.queues = {};
  }

  /**
   * Create or get a queue
   */
  getQueue(name, options = {}) {
    if (!this.queues[name]) {
      const defaultOptions = {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB) || 0
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        },
        ...options
      };

      this.queues[name] = new Queue(name, defaultOptions);

      // Event listeners
      this.queues[name].on('completed', (job, result) => {
        console.log(`Job ${job.id} in queue ${name} completed:`, result);
      });

      this.queues[name].on('failed', (job, err) => {
        console.error(`Job ${job.id} in queue ${name} failed:`, err.message);
      });

      this.queues[name].on('stalled', (job) => {
        console.warn(`Job ${job.id} in queue ${name} stalled`);
      });
    }

    return this.queues[name];
  }

  /**
   * Add job to queue
   */
  async addJob(queueName, jobName, data, options = {}) {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, options);
    return job;
  }

  /**
   * Process jobs in queue
   */
  process(queueName, processor, concurrency = 1) {
    const queue = this.getQueue(queueName);
    queue.process(concurrency, processor);
  }

  /**
   * Get queue stats
   */
  async getStats(queueName) {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed
    };
  }

  /**
   * Clean queue
   */
  async clean(queueName, grace = 5000) {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  }

  /**
   * Close all queues
   */
  async closeAll() {
    for (const name in this.queues) {
      await this.queues[name].close();
    }
    this.queues = {};
  }
}

// Export singleton instance
const queueManager = new QueueManager();

// Queue names
const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  EMAILS: 'emails',
  REPORTS: 'reports',
  PAYMENTS: 'payments',
  AUDIT_LOGS: 'audit-logs',
  CACHE_INVALIDATION: 'cache-invalidation'
};

module.exports = {
  queueManager,
  QUEUE_NAMES
};

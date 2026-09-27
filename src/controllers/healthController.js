const pool = require('../config/database');
const redisClient = require('../config/redis');
const { logger } = require('../config/logger');

/**
 * Health Check Controller
 * Provides health status and dependency checks
 */

/**
 * Basic health check
 */
async function basicHealthCheck(req, res) {
  try {
    res.success({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }, 'Service is healthy');
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.serverError('Health check failed');
  }
}

/**
 * Detailed health check with dependency status
 */
async function detailedHealthCheck(req, res) {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {}
  };

  let overallStatus = 'healthy';

  // Check PostgreSQL
  try {
    const pgStart = Date.now();
    await pool.query('SELECT NOW()');
    const pgLatency = Date.now() - pgStart;
    
    checks.dependencies.postgresql = {
      status: 'healthy',
      latency: `${pgLatency}ms`
    };
  } catch (error) {
    overallStatus = 'unhealthy';
    checks.dependencies.postgresql = {
      status: 'unhealthy',
      error: error.message
    };
    logger.error('PostgreSQL health check failed', { error: error.message });
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    await redisClient.getClient().ping();
    const redisLatency = Date.now() - redisStart;
    
    checks.dependencies.redis = {
      status: 'healthy',
      latency: `${redisLatency}ms`
    };
  } catch (error) {
    overallStatus = 'degraded';
    checks.dependencies.redis = {
      status: 'unhealthy',
      error: error.message
    };
    logger.error('Redis health check failed', { error: error.message });
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  checks.system = {
    memory: {
      heap_used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heap_total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    },
    cpu: process.cpuUsage(),
    platform: process.platform,
    node_version: process.version
  };

  checks.status = overallStatus;

  if (overallStatus === 'healthy') {
    return res.success(checks, 'All systems operational');
  } else if (overallStatus === 'degraded') {
    return res.success(checks, 'Service degraded but operational', 200);
  } else {
    return res.error('Service unhealthy', checks, 503, 'SERVICE_UNHEALTHY');
  }
}

/**
 * Readiness check (for Kubernetes)
 */
async function readinessCheck(req, res) {
  const checks = {
    ready: true,
    timestamp: new Date().toISOString()
  };

  // Check if database is ready
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    checks.ready = false;
    checks.database = 'not ready';
    logger.error('Readiness check failed', { error: error.message });
    return res.error('Service not ready', checks, 503, 'SERVICE_NOT_READY');
  }

  // Check if Redis is ready
  try {
    await redisClient.getClient().ping();
  } catch (error) {
    checks.ready = false;
    checks.redis = 'not ready';
    logger.error('Readiness check failed', { error: error.message });
    return res.error('Service not ready', checks, 503, 'SERVICE_NOT_READY');
  }

  return res.success(checks, 'Service is ready');
}

/**
 * Liveness check (for Kubernetes)
 */
async function livenessCheck(req, res) {
  res.success({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, 'Service is alive');
}

module.exports = {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck
};

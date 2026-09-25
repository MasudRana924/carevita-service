const express = require('express');
const router = express.Router();
const {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck
} = require('../controllers/healthController');

/**
 * Health Check Routes
 */

// Basic health check
router.get('/', basicHealthCheck);

// Detailed health check with dependencies
router.get('/detailed', detailedHealthCheck);

// Readiness check (for Kubernetes)
router.get('/ready', readinessCheck);

// Liveness check (for Kubernetes)
router.get('/live', livenessCheck);

module.exports = router;

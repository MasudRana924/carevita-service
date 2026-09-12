require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { initFirebase } = require('./config/firebase');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const responseHandler = require('./middleware/responseHandler');
const routes = require('./routes');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 8000;

initFirebase();

// Security middleware (CSP relaxed so Swagger UI assets load)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS — origin:true reflects the request Origin (works with credentials)
// Note: origin:'*' + credentials:true is invalid and browsers block it
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response handler middleware
app.use(responseHandler);

// Dynamic OpenAPI JSON (correct host/port for Try it out)
app.get('/api-docs.json', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  res.setHeader('Content-Type', 'application/json');
  res.send({
    ...swaggerSpec,
    servers: [
      { url: `${protocol}://${host}/api/v1`, description: 'Current server' }
    ]
  });
});

// Swagger UI — loads spec from /api-docs.json so server URL matches this host
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
  customSiteTitle: 'CareMate API Docs',
  swaggerOptions: {
    url: '/api-docs.json',
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    tryItOutEnabled: true
  }
}));

// Rate limiting
app.use('/api/', apiLimiter);

// API routes
app.use('/api/v1', routes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CareMate API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`CareMate API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
  
  // Test database connection
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;

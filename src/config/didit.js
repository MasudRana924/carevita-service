require('dotenv').config();

const diditConfig = {
  apiKey: process.env.DIDIT_API_KEY,
  apiUrl: process.env.DIDIT_API_URL || 'https://api.didit.me',
  webhookUrl: process.env.DIDIT_WEBHOOK_URL || `${process.env.API_BASE_URL || 'http://localhost:8000'}/api/v1/ekyc/webhook`,
};

module.exports = diditConfig;

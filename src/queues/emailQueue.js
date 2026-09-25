const { queueManager, QUEUE_NAMES } = require('../config/queue');
const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

/**
 * Email Queue Processor
 * Handles email sending asynchronously
 */

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Add email job to queue
 */
async function addEmailJob(data) {
  return await queueManager.addJob(
    QUEUE_NAMES.EMAILS,
    'send-email',
    data,
    {
      priority: data.priority || 'normal',
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  );
}

/**
 * Process email job
 */
async function processEmailJob(job) {
  const { to, subject, html, text, attachments } = job.data;

  try {
    logger.info('Processing email job', { jobId: job.id, to, subject });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
      attachments
    };

    const result = await transporter.sendMail(mailOptions);

    logger.info('Email sent successfully', { jobId: job.id, to, messageId: result.messageId });
    return { messageId: result.messageId };
  } catch (error) {
    logger.error('Failed to send email', { jobId: job.id, to, error: error.message });
    throw error;
  }
}

/**
 * Start email queue processor
 */
function startEmailProcessor() {
  queueManager.process(QUEUE_NAMES.EMAILS, processEmailJob, 3);
  logger.info('Email queue processor started');
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(userEmail, userName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to CareMate!</h2>
      <p>Dear ${userName},</p>
      <p>Thank you for joining CareMate. We're excited to help you find the best caregivers for your family.</p>
      <p>With CareMate, you can:</p>
      <ul>
        <li>Book verified caregivers</li>
        <li>Track services in real-time</li>
        <li>Make secure payments via bKash</li>
        <li>Get 24/7 support</li>
      </ul>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The CareMate Team</p>
    </div>
  `;

  return await addEmailJob({
    to: userEmail,
    subject: 'Welcome to CareMate!',
    html,
    text: `Welcome to CareMate! Dear ${userName}, thank you for joining us.`
  });
}

/**
 * Send booking confirmation email
 */
async function sendBookingConfirmationEmail(userEmail, userName, bookingNumber) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Booking Confirmed</h2>
      <p>Dear ${userName},</p>
      <p>Your booking <strong>${bookingNumber}</strong> has been confirmed successfully.</p>
      <p>You can track your booking status in the app.</p>
      <p>Best regards,<br>The CareMate Team</p>
    </div>
  `;

  return await addEmailJob({
    to: userEmail,
    subject: `Booking Confirmed - ${bookingNumber}`,
    html,
    text: `Your booking ${bookingNumber} has been confirmed.`
  });
}

module.exports = {
  addEmailJob,
  processEmailJob,
  startEmailProcessor,
  sendWelcomeEmail,
  sendBookingConfirmationEmail
};

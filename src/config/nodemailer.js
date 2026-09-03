const nodemailer = require('nodemailer');
require('dotenv').config();

if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
  console.error('ERROR: SMTP_USER and SMTP_PASSWORD must be set in .env file');
  console.error('Please add these credentials to your .env file:');
  console.error('SMTP_USER=your_email@gmail.com');
  console.error('SMTP_PASSWORD=your_app_password');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error.message);
  } else {
    console.log('Email server is ready to send messages');
  }
});

module.exports = transporter;

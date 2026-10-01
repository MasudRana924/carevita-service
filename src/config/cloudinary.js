const cloudinary = require('cloudinary');
require('dotenv').config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const looksUnset = (value) => !value || /^your_/i.test(String(value).trim());
const unsetKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  .filter((key) => looksUnset(process.env[key]));
if (unsetKeys.length) {
  console.error(`Cloudinary is not configured (${unsetKeys.join(', ')} missing or placeholder) — file uploads will fail.`);
}

module.exports = cloudinary;

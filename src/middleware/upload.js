const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: 'caremate',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `${file.fieldname}-${uniqueSuffix}`;
    },
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', { fieldname: file.fieldname, originalname: file.originalname, mimetype: file.mimetype });
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.error('Rejected file type:', file.mimetype);
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF allowed.'), false);
    }
  },
});

/**
 * Run Cloudinary upload only for multipart requests.
 * JSON profile updates (common from React Native) skip multer entirely —
 * avoids Android PUT+FormData hangs that surface as gateway 502s.
 */
upload.optionalSingle = (fieldName) => (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  upload.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    console.error('Upload middleware error:', err.message || err);
    err.statusCode = err.statusCode || 400;
    err.code = err.code || 'VALIDATION_ERROR';
    return next(err);
  });
};

module.exports = upload;

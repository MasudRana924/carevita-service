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

const CHAT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const CHAT_ALLOWED_TYPES = [...CHAT_IMAGE_TYPES, 'application/pdf'];

// PDFs go to Cloudinary as `raw`: image-type PDF delivery is blocked by default on many accounts.
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: async (req, file) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder: 'caremate/chat',
      resource_type: isPdf ? 'raw' : 'image',
      public_id: isPdf ? `chat-${uniqueSuffix}.pdf` : `chat-${uniqueSuffix}`,
    };
  },
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (CHAT_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type. Only JPEG, PNG, WEBP images and PDF are allowed.');
      err.statusCode = 400;
      cb(err, false);
    }
  },
});

upload.chatAttachment = (fieldName = 'file') => (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  chatUpload.single(fieldName)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.message = 'File too large. Maximum size is 10MB.';
    }
    err.statusCode = err.statusCode || 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  });
};

const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const profilePhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: async () => ({
    folder: 'caremate/avatars',
    resource_type: 'image',
    public_id: `avatar-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
    transformation: [{ width: 800, height: 800, crop: 'fill', gravity: 'center' }],
  }),
});

const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (PROFILE_PHOTO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type. Only JPEG, PNG and WEBP images are allowed.');
      err.statusCode = 400;
      cb(err, false);
    }
  },
});

upload.profilePhoto = (fieldName = 'photo') => (req, res, next) => {
  profilePhotoUpload.single(fieldName)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.message = 'File too large. Maximum size is 5MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      err.message = `Upload the image in the "${fieldName}" field`;
    }
    err.statusCode = err.statusCode || 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  });
};

upload.CHAT_IMAGE_TYPES = CHAT_IMAGE_TYPES;

module.exports = upload;

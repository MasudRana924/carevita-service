const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authenticate, medicalRecordController.createMedicalRecord);
router.get('/', authenticate, medicalRecordController.getMedicalRecords);
router.get('/:id', authenticate, medicalRecordController.getMedicalRecord);
router.put('/:id', authenticate, medicalRecordController.updateMedicalRecord);
router.delete('/:id', authenticate, medicalRecordController.deleteMedicalRecord);
router.post('/:id/file', authenticate, upload.single('file'), medicalRecordController.uploadMedicalRecordFile);

module.exports = router;

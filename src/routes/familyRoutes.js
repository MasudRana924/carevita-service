const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authenticate, familyController.createFamilyMember);
router.get('/', authenticate, familyController.getFamilyMembers);
router.get('/:id', authenticate, familyController.getFamilyMember);
router.put('/:id', authenticate, familyController.updateFamilyMember);
router.delete('/:id', authenticate, familyController.deleteFamilyMember);
router.post('/:id/photo', authenticate, upload.single('photo'), familyController.uploadFamilyMemberPhoto);

module.exports = router;

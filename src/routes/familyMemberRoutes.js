const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const familyMemberController = require('../controllers/familyMemberController');
const upload = require('../middleware/upload');

router.post('/', authenticate, upload.single('photo'), familyMemberController.addFamilyMember);
router.get('/', authenticate, familyMemberController.listFamilyMembers);
router.get('/:id', authenticate, familyMemberController.viewFamilyMember);
router.put('/:id', authenticate, upload.single('photo'), familyMemberController.updateFamilyMember);
router.delete('/:id', authenticate, familyMemberController.deleteFamilyMember);

module.exports = router;

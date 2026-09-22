const express = require('express');
const router = express.Router();
const privacyPolicyController = require('../controllers/privacyPolicyController');

router.get('/', privacyPolicyController.listPublic);
router.get('/:audience', privacyPolicyController.getPublicByAudience);

module.exports = router;

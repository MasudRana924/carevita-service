const { findById } = require('../models/User');
const diditService = require('../services/diditService');
const ekycService = require('../services/ekycService');

exports.initiate = async (req, res) => {
  try {
    const user = await findById(req.user.id);
    if (!user) return res.notFound('User not found');

    const redirectUrl = req.body?.redirect_url || req.body?.callback;
    const reverify = req.body?.reverify === true || req.query?.reverify === 'true';

    const result = await ekycService.initiateForCaregiver(user, { redirectUrl, reverify });

    if (result.alreadyVerified) {
      return res.success(result.data, 'eKYC already verified');
    }

    if (result.reused) {
      return res.success(result.data, 'Existing eKYC session resumed');
    }

    return res.created(result.data, 'eKYC verification initiated');
  } catch (error) {
    console.error('eKYC initiate error:', error);
    if (error.statusCode === 409) return res.conflict(error.message);
    if (error.statusCode === 503) {
      return res.error(error.message, [], 503, 'INTERNAL_ERROR');
    }
    if (error.statusCode && error.statusCode < 500) {
      return res.error(error.message, [], error.statusCode);
    }
    return res.serverError('Failed to initiate eKYC');
  }
};

exports.getStatus = async (req, res) => {
  try {
    const user = await findById(req.user.id);
    if (!user) return res.notFound('User not found');

    const data = await ekycService.getStatusForCaregiver(user);
    return res.success(data);
  } catch (error) {
    console.error('eKYC status error:', error);
    return res.serverError('Failed to get eKYC status');
  }
};

exports.webhook = async (req, res) => {
  try {
    const verified = diditService.verifyWebhook({
      body: req.body || {},
      rawBody: req.rawBody,
      signatureV2: req.get('X-Signature-V2'),
      signature: req.get('X-Signature'),
      signatureSimple: req.get('X-Signature-Simple'),
      timestamp: req.get('X-Timestamp')
    });

    if (!verified.ok) {
      const { writeAudit } = require('../utils/audit');
      await writeAudit({
        action: 'DIDIT_WEBHOOK_REJECTED',
        entityType: 'ekyc',
        meta: {
          reason: verified.reason || 'invalid_signature',
          requestId: req.requestId,
          session_id: req.body?.session_id || null
        }
      });
      return res.unauthorized('Invalid Didit webhook signature');
    }

    await ekycService.handleWebhook(req.body || {}, {
      trustedDecision: verified.trustedDecision
    });

    return res.success(null, 'Webhook processed successfully');
  } catch (error) {
    console.error('Didit webhook error:', error);
    return res.serverError('Failed to process webhook');
  }
};

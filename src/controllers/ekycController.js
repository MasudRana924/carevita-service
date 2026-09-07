const DiditService = require('../services/diditService');
const { updateCaregiverProfile, findByUserId } = require('../models/CaregiverProfile');

/**
 * Initiate eKYC verification for caregiver
 */
exports.initiateEKYC = async (req, res) => {
  try {
    const userId = req.user.id;
    const caregiverProfile = await findByUserId(userId);

    if (!caregiverProfile) {
      return res.notFound('Caregiver profile not found');
    }

    if (caregiverProfile.ekyc_status) {
      return res.badRequest('eKYC already verified');
    }

    const diditResponse = await DiditService.initiateEKYC(
      userId,
      caregiverProfile.id,
      req.user
    );

    // Update caregiver profile with reference ID
    await updateCaregiverProfile(caregiverProfile.id, {
      ekyc_reference_id: diditResponse.reference_id,
    });

    res.success({
      verification_url: diditResponse.verification_url,
      reference_id: diditResponse.reference_id,
      session_id: diditResponse.session_id,
    }, 'eKYC verification initiated successfully');
  } catch (error) {
    console.error('Initiate eKYC error:', error);
    res.serverError('Failed to initiate eKYC verification');
  }
};

/**
 * Webhook handler for Didit eKYC verification result
 */
exports.handleEKYCWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    // Verify webhook signature (optional but recommended)
    // const signature = req.headers['x-didit-signature'];
    // if (!DiditService.verifyWebhookSignature(webhookData, signature)) {
    //   return res.status(401).json({ success: false, message: 'Invalid signature' });
    // }

    const verificationResult = DiditService.processVerificationResult(webhookData);

    // Update caregiver profile with verification result
    if (verificationResult.reference_id) {
      await updateCaregiverProfile(verificationResult.reference_id, {
        ekyc_status: verificationResult.status,
        ekyc_verified_at: verificationResult.verified_at,
      });
    }

    res.success({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('eKYC webhook error:', error);
    res.status(500).json({ success: false, message: 'Failed to process webhook' });
  }
};

/**
 * Get eKYC status for current user
 */
exports.getEKYCStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const caregiverProfile = await findByUserId(userId);

    if (!caregiverProfile) {
      return res.notFound('Caregiver profile not found');
    }

    res.success({
      ekyc_status: caregiverProfile.ekyc_status,
      ekyc_verified_at: caregiverProfile.ekyc_verified_at,
      ekyc_reference_id: caregiverProfile.ekyc_reference_id,
    });
  } catch (error) {
    console.error('Get eKYC status error:', error);
    res.serverError('Failed to get eKYC status');
  }
};

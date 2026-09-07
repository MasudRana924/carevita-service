const axios = require('axios');
const diditConfig = require('../config/didit');

class DiditService {
  /**
   * Initiate eKYC verification for a caregiver
   * @param {string} userId - User ID
   * @param {string} caregiverProfileId - Caregiver profile ID
   * @param {object} userData - User data (name, email, phone, etc.)
   * @returns {object} - Didit verification session data
   */
  static async initiateEKYC(userId, caregiverProfileId, userData) {
    try {
      const payload = {
        reference_id: caregiverProfileId,
        user_id: userId,
        user_data: {
          first_name: userData.name?.split(' ')[0] || '',
          last_name: userData.name?.split(' ').slice(1).join(' ') || '',
          email: userData.email || '',
          phone: userData.phone || '',
        },
        webhook_url: diditConfig.webhookUrl,
        redirect_url: process.env.FRONTEND_URL || 'http://localhost:3000',
      };

      const response = await axios.post(
        `${diditConfig.apiUrl}/v1/verification/create`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${diditConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        verification_url: response.data.verification_url,
        reference_id: response.data.reference_id,
        session_id: response.data.session_id,
      };
    } catch (error) {
      console.error('Didit eKYC initiation error:', error.response?.data || error.message);
      throw new Error('Failed to initiate eKYC verification');
    }
  }

  /**
   * Verify webhook signature from Didit
   * @param {object} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean}
   */
  static verifyWebhookSignature(payload, signature) {
    // Implement signature verification if Didit provides webhook signatures
    // For now, return true (you should implement proper signature verification in production)
    return true;
  }

  /**
   * Process eKYC verification result from webhook
   * @param {object} webhookData - Webhook data from Didit
   * @returns {object} - Verification result
   */
  static processVerificationResult(webhookData) {
    const { reference_id, status, verification_data, verified_at } = webhookData;

    return {
      reference_id,
      status: status === 'verified' ? true : false,
      verified_at: verified_at || new Date().toISOString(),
      verification_data: verification_data || {},
    };
  }
}

module.exports = DiditService;

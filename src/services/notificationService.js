const { getFirebaseMessaging } = require('../config/firebase');

/**
 * Send push notification to Firebase
 */
const sendPushNotification = async ({ tokens, title, body, data = {} }) => {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.log('Firebase messaging not initialized, skipping push notification');
      return { success: false, reason: 'firebase_not_initialized' };
    }

    if (!tokens || tokens.length === 0) {
      console.log('No tokens provided, skipping push notification');
      return { success: false, reason: 'no_tokens' };
    }

    const message = {
      notification: {
        title,
        body
      },
      data: data,
      tokens: tokens
    };

    const response = await messaging.sendMulticast(message);

    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
        }
      });

      // Cleanup invalid tokens
      if (failedTokens.length > 0) {
        const { deactivateInvalidTokens } = require('../models/NotificationToken');
        await deactivateInvalidTokens(failedTokens);
      }
    }

    console.log(`Push notification sent: ${response.successCount} success, ${response.failureCount} failures`);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('Send push notification error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification
};

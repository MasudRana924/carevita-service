/**
 * Pricing Service
 * Centralized pricing calculation with platform commission
 */

const PLATFORM_COMMISSION_PERCENTAGE = 10; // 10% platform commission

class PricingService {
  /**
   * Calculate booking price
   * @param {object} params - Pricing parameters
   * @returns {object} - Price breakdown
   */
  static calculateBookingPrice(params) {
    const {
      providerRate,
      durationHours,
      discount = 0,
      customCommissionPercentage = null
    } = params;

    const commissionPercentage = customCommissionPercentage || PLATFORM_COMMISSION_PERCENTAGE;

    // Calculate subtotal
    const subtotal = providerRate * durationHours;

    // Calculate platform fee (commission)
    const platformFee = (subtotal * commissionPercentage) / 100;

    // Calculate total after discount
    const discountAmount = discount || 0;
    const totalAmount = subtotal + platformFee - discountAmount;

    // Calculate provider earning
    const providerEarning = subtotal - platformFee;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      providerEarning: Math.round(providerEarning * 100) / 100,
      commissionPercentage,
      advanceAmount: Math.round((totalAmount * 0.5) * 100) / 100, // 50% advance
      remainingAmount: Math.round((totalAmount * 0.5) * 100) / 100
    };
  }

  /**
   * Calculate refund amount based on cancellation timing
   * @param {object} params - Refund parameters
   * @returns {object} - Refund breakdown
   */
  static calculateRefund(params) {
    const {
      totalAmount,
      advanceAmount,
      bookingDate,
      serviceDate,
      cancellationReason,
      cancelledBy
    } = params;

    const hoursBeforeService = this.getHoursBeforeService(bookingDate, serviceDate);

    let refundPercentage = 0;
    let platformRefundPercentage = 0;

    // Refund policy based on timing
    if (hoursBeforeService >= 48) {
      refundPercentage = 100; // Full refund
      platformRefundPercentage = 100;
    } else if (hoursBeforeService >= 24) {
      refundPercentage = 50; // 50% refund
      platformRefundPercentage = 50;
    } else if (hoursBeforeService >= 12) {
      refundPercentage = 25; // 25% refund
      platformRefundPercentage = 0; // Platform keeps commission
    } else {
      refundPercentage = 0; // No refund
      platformRefundPercentage = 0;
    }

    // Provider cancellation - full refund to customer
    if (cancelledBy === 'PROVIDER') {
      refundPercentage = 100;
      platformRefundPercentage = 100;
    }

    const refundAmount = (totalAmount * refundPercentage) / 100;
    const platformRefundAmount = (advanceAmount * platformRefundPercentage) / 100;

    return {
      refundAmount: Math.round(refundAmount * 100) / 100,
      platformRefundAmount: Math.round(platformRefundAmount * 100) / 100,
      refundPercentage,
      platformRefundPercentage,
      hoursBeforeService
    };
  }

  /**
   * Get hours before service
   * @param {string} bookingDate - Booking date
   * @param {string} serviceDate - Service date
   * @returns {number} - Hours before service
   */
  static getHoursBeforeService(bookingDate, serviceDate) {
    const now = new Date();
    const serviceDateTime = new Date(serviceDate);
    const diffMs = serviceDateTime - now;
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * Get platform commission percentage
   * @returns {number} - Commission percentage
   */
  static getCommissionPercentage() {
    return PLATFORM_COMMISSION_PERCENTAGE;
  }

  /**
   * Set custom commission percentage (for admin)
   * @param {number} percentage - New commission percentage
   */
  static setCommissionPercentage(percentage) {
    // This would typically update a database config table
    // For now, we'll use environment variable or database config
    process.env.PLATFORM_COMMISSION_PERCENTAGE = percentage.toString();
  }
}

module.exports = PricingService;

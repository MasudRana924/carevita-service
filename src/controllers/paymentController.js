const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Wallet = require('../models/Wallet');

exports.createPayment = async (req, res) => {
  try {
    const { booking_id, amount, payment_method, transaction_id, payment_gateway, gateway_response } = req.body;

    if (!booking_id || !amount || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, amount, and payment method are required'
      });
    }

    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const payment = await Payment.create({
      booking_id,
      user_id: req.user.id,
      amount,
      payment_method,
      transaction_id,
      payment_gateway,
      gateway_response
    });

    await Booking.updatePaymentStatus(booking_id, 'paid');

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      payment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment'
    });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { status, payment_method, limit } = req.query;

    const payments = await Payment.findByUserId(req.user.id, {
      status,
      payment_method,
      limit: limit || 20
    });

    res.status(200).json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
};

exports.getPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment'
    });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { refunded_amount, refund_reason } = req.body;

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const refunded = await Payment.refund(id, refunded_amount || payment.amount, refund_reason);

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      payment: refunded
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refund payment'
    });
  }
};

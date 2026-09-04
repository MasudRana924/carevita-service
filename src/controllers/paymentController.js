const { createPayment, findById, findByBookingId, updateStatus, refund, findAll } = require('../models/Payment');
const { findById: findBookingById, updateStatus: updateBookingStatus } = require('../models/Booking');
const { createNotification } = require('../models/Notification');

exports.createBkashPayment = async (req, res) => {
  try {
    const { booking_id, payment_type } = req.body;

    if (!booking_id || !payment_type) {
      return res.error('Booking ID and payment type are required');
    }

    const booking = await findBookingById(booking_id);
    if (!booking) {
      return res.notFound('Booking not found');
    }

    if (booking.user_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    const amount = payment_type === 'ADVANCE' ? booking.advance_amount : booking.remaining_amount;

    const payment = await createPayment({
      booking_id,
      user_id: req.user.id,
      payment_type,
      amount,
      payment_method: 'bkash',
      transaction_id: null,
      payment_gateway: 'bkash',
      gateway_response: null
    });

    const paymentUrl = `https://checkout.bkash.com/v1.2.0-beta/checkout/payment?paymentID=${payment.id}`;

    res.success({
      paymentId: payment.id,
      amount: payment.amount,
      status: payment.status,
      paymentUrl
    }, 'bKash payment created successfully');
  } catch (error) {
    console.error('Create bKash payment error:', error);
    res.serverError('Failed to create bKash payment');
  }
};

exports.bkashCallback = async (req, res) => {
  try {
    const { paymentID, status, transactionId } = req.query;

    const payment = await findById(paymentID);
    if (!payment) {
      return res.notFound('Payment not found');
    }

    if (status === 'success') {
      await updateStatus(payment.id, 'COMPLETED', { transaction_id: transactionId });
      await updateBookingStatus(payment.booking_id, 'PAYMENT_PAID');
      
      await createNotification({
        user_id: payment.user_id,
        title: 'Payment Successful',
        message: `Your payment of ৳${payment.amount} has been received.`,
        type: 'PAYMENT',
        reference_id: payment.id,
        reference_type: 'payment'
      });
    } else {
      await updateStatus(payment.id, 'FAILED');
    }

    res.redirect(`${process.env.FRONTEND_URL}/payment/callback?status=${status}&paymentID=${paymentID}`);
  } catch (error) {
    console.error('bKash callback error:', error);
    res.serverError('Failed to process callback');
  }
};

exports.executePayment = async (req, res) => {
  try {
    const { paymentID } = req.body;

    const payment = await findById(paymentID);
    if (!payment) {
      return res.notFound('Payment not found');
    }

    if (payment.status !== 'PENDING') {
      return res.error('Payment cannot be executed in current status');
    }

    await updateStatus(payment.id, 'PROCESSING');

    res.success(null, 'Payment execution initiated');
  } catch (error) {
    console.error('Execute payment error:', error);
    res.serverError('Failed to execute payment');
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { paymentID } = req.body;

    const payment = await findById(paymentID);
    if (!payment) {
      return res.notFound('Payment not found');
    }

    if (payment.status === 'COMPLETED') {
      await updateBookingStatus(payment.booking_id, 'PAYMENT_PAID');
    }

    res.success({
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount
    }, 'Payment verified');
  } catch (error) {
    console.error('Verify payment error:', error);
    res.serverError('Failed to verify payment');
  }
};

exports.getPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await findById(id);

    if (!payment) {
      return res.notFound('Payment not found');
    }

    if (payment.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.forbidden('Access denied');
    }

    res.success(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.serverError('Failed to get payment');
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.forbidden('Only admins can initiate refunds');
    }

    const payment = await findById(id);
    if (!payment) {
      return res.notFound('Payment not found');
    }

    if (payment.status !== 'COMPLETED') {
      return res.error('Can only refund completed payments');
    }

    const refunded = await refund(id, payment.amount, reason);

    await createNotification({
      user_id: payment.user_id,
      title: 'Refund Initiated',
      message: `Refund of ৳${payment.amount} has been initiated for your payment.`,
      type: 'PAYMENT',
      reference_id: payment.id,
      reference_type: 'payment'
    });

    res.success(refunded, 'Refund initiated successfully');
  } catch (error) {
    console.error('Refund payment error:', error);
    res.serverError('Failed to refund payment');
  }
};

exports.listPayments = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.forbidden('Only admins can list all payments');
    }

    const { status, payment_method, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const payments = await findAll({
      status,
      payment_method,
      date_from,
      date_to,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success(payments, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: payments.length
    });
  } catch (error) {
    console.error('List payments error:', error);
    res.serverError('Failed to list payments');
  }
};

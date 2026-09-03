const Medicine = require('../models/Medicine');
const MedicineOrder = require('../models/MedicineOrder');
const FamilyMember = require('../models/FamilyMember');

exports.searchMedicines = async (req, res) => {
  try {
    const { query, category, limit } = req.query;

    let medicines;
    if (query) {
      medicines = await Medicine.search(query, {
        is_active: true,
        category,
        limit: limit || 20
      });
    } else {
      medicines = await Medicine.findAll({
        is_active: true,
        category,
        limit: limit || 20
      });
    }

    res.status(200).json({
      success: true,
      medicines
    });
  } catch (error) {
    console.error('Search medicines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search medicines'
    });
  }
};

exports.createMedicineOrder = async (req, res) => {
  try {
    const {
      family_member_id, prescription_url, items, delivery_address,
      delivery_lat, delivery_long, scheduled_delivery, payment_method
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    if (family_member_id) {
      const familyMember = await FamilyMember.findByUserIdAndId(req.user.id, family_member_id);
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'Family member not found'
        });
      }
    }

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const delivery_fee = 50;
    const discount = 0;
    const total_amount = subtotal + delivery_fee - discount;

    const order = await MedicineOrder.create({
      user_id: req.user.id,
      family_member_id,
      prescription_url,
      items,
      subtotal,
      delivery_fee,
      discount,
      total_amount,
      delivery_address,
      delivery_lat,
      delivery_long,
      scheduled_delivery,
      payment_method
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

exports.getMedicineOrders = async (req, res) => {
  try {
    const { status, limit } = req.query;

    const orders = await MedicineOrder.findByUserId(req.user.id, {
      status,
      limit: limit || 20
    });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

exports.getMedicineOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await MedicineOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

exports.cancelMedicineOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await MedicineOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this order'
      });
    }

    await MedicineOrder.cancel(id);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
};
